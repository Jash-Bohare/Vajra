"""
generator.py — LLM Case Narrative Generator for LEA investigations.
Automates generation of a 3-paragraph executive summary for FIR/court annexures.
Provider fallback: Google Gemini Flash → Ollama (local Llama 3) → Deterministic Template.
"""

import os
import requests
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class NarrativeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    wallet_address: str = Field(..., alias="walletAddress")
    trace_hops: List[Dict[str, Any]] = Field(default=[], alias="traceHops")
    graph_metrics: Dict[str, Any] = Field(default={}, alias="graphMetrics")
    ml_score: float = Field(0.0, alias="mlScore")
    risk_level: str = Field("low", alias="riskLevel")
    top_indicators: List[str] = Field(default=[], alias="topIndicators")
    victim_tx_hash: Optional[str] = Field(None, alias="victimTxHash")
    victim_amount_usd: Optional[float] = Field(0.0, alias="victimAmountUsd")
    target_asset: Optional[str] = Field("ETH", alias="targetAsset")


class NarrativeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    narrative: str
    generated_by: str = Field(..., alias="generatedBy")
    generated_at: str = Field(..., alias="generatedAt")
    word_count: int = Field(..., alias="wordCount")


NARRATIVE_PROMPT_TEMPLATE = """You are an expert blockchain forensics analyst preparing an investigative case summary for submission to a law enforcement agency (LEA) in India. Write a professional, factual, 3-paragraph executive summary based on the following on-chain trace findings.

DO NOT invent any information not present in the data below. Use formal investigative language. Do not use casual language.

=== INVESTIGATION DATA ===
Suspect Wallet Address: {wallet_address}
Investigation Date: {investigation_date}
Targeted Asset: {target_asset}
Victim Reported Loss: {victim_amount_usd} USD
Victim Transaction Reference: {victim_tx_hash}

Chain of Custody (Fund Flow):
{hop_chain_text}

Fund Flow Graph Metrics:
- Total Nodes in Flow Network: {node_count}
- Total Value Transacted: ${total_usd:,.2f} USD
- Fastest Hop Transfer: {min_velocity} seconds
- Maximum Fan-Out (Splitting): {max_fan_out} branches
- Graph Topology: {topology_type}
- Taint Coverage: {taint_coverage}% of reported victim funds traced

AI Risk Assessment:
- Risk Score: {ml_score}/100
- Risk Level: {risk_level}
- Top Risk Indicators: {top_indicators}

=== FORMAT INSTRUCTIONS ===
Write exactly 3 paragraphs:
Paragraph 1 (Factual Summary): State the wallet address, the date of the incident, the reported stolen amount, and a factual summary of how funds moved through the chain of custody — hop by hop.
Paragraph 2 (Pattern Analysis): Describe the money laundering technique observed (e.g., layering through multiple wallets, fund splitting/fan-out, rapid forwarding to an exchange). Explain what each risk indicator means in plain language.
Paragraph 3 (Investigative Recommendation): State which exchange(s) or final wallet(s) the funds reached, the taint coverage percentage, and recommend that LEA pursue formal legal channels to obtain transaction records from the identified exchange(s). Do NOT cite any specific section number of any law — investigators must verify applicable current legislation with their legal team before filing.
"""


def build_hop_chain_text(hops: List[Dict[str, Any]]) -> str:
    """Formats hop array into readable chain-of-custody text."""
    if not hops:
        return "No intermediary hops recorded."
    lines = []
    for hop in hops:
        asset = hop.get("tokenSymbol") or hop.get("token_symbol") or "ETH"
        amount = hop.get("tokenAmount") or hop.get("token_amount") or hop.get("amountEth") or hop.get("amount_eth") or 0.0
        usd = hop.get("usdValue") or hop.get("usd_value") or 0.0
        ts = str(hop.get("txTimestamp") or hop.get("tx_timestamp") or "unknown")[:19]
        from_a = hop.get("fromAddress") or hop.get("from_address") or "unknown"
        to_a = hop.get("toAddress") or hop.get("to_address") or "unknown"
        index = hop.get("hopIndex") or hop.get("hop_index") or 1
        lines.append(
            f"Hop {index}: {from_a[:10]}... → {to_a[:10]}... | "
            f"{float(amount):.4f} {asset} (~${float(usd):,.2f} USD) | {ts}"
        )
    return "\n".join(lines)


def build_prompt(
    wallet_address: str,
    hops: List[Dict[str, Any]],
    graph_metrics: Dict[str, Any],
    ml_score: float,
    risk_level: str,
    top_indicators: List[str],
    victim_tx_hash: Optional[str] = None,
    victim_amount_usd: Optional[float] = 0.0,
    target_asset: Optional[str] = "ETH",
) -> str:
    topology = "Linear Chain"
    if graph_metrics.get("is_star_topology") or graph_metrics.get("isStarTopology"):
        topology = "Star (Hub-and-Spoke)"
    elif graph_metrics.get("is_hourglass_topology") or graph_metrics.get("isHourglassTopology"):
        topology = "Hourglass (Fan-Out then Fan-In)"
    elif graph_metrics.get("is_cluster_topology") or graph_metrics.get("isClusterTopology"):
        topology = "Cluster Interconnected Mesh"

    node_count = graph_metrics.get("node_count") or graph_metrics.get("nodeCount") or len(hops) + 1
    total_usd = float(graph_metrics.get("total_usd_transacted") or graph_metrics.get("totalUsdTransacted") or 0.0)
    min_vel = int(graph_metrics.get("min_hop_velocity_sec") or graph_metrics.get("minHopVelocitySec") or 0)
    max_fan = int(graph_metrics.get("max_fan_out_degree") or graph_metrics.get("maxFanOutDegree") or 1)
    taint_cov = float(graph_metrics.get("taint_coverage_percent") or graph_metrics.get("taintCoveragePercent") or 100.0)

    indicators_str = ", ".join(top_indicators[:5]) if top_indicators else "Standard transfer activity"

    return NARRATIVE_PROMPT_TEMPLATE.format(
        wallet_address=wallet_address,
        investigation_date=datetime.now(timezone.utc).strftime("%B %d, %Y"),
        target_asset=target_asset or "ETH",
        victim_amount_usd=f"{float(victim_amount_usd or 0.0):,.2f}",
        victim_tx_hash=victim_tx_hash or "N/A",
        hop_chain_text=build_hop_chain_text(hops),
        node_count=node_count,
        total_usd=total_usd,
        min_velocity=min_vel,
        max_fan_out=max_fan,
        topology_type=topology,
        taint_coverage=taint_cov,
        ml_score=int(ml_score),
        risk_level=str(risk_level).upper(),
        top_indicators=indicators_str,
    )


def generate_template_narrative(prompt: str) -> str:
    """Returns a deterministic, court-ready 3-paragraph investigative summary when no LLM is configured."""
    return (
        "Paragraph 1 — Fund Flow Summary: An automated on-chain blockchain forensic trace was initiated on the subject wallet. "
        "The digital asset transaction history was examined across consecutive intermediary addresses in the chain of custody. "
        "The fund movement and associated transaction timestamps have been cataloged in the investigative trace log.\n\n"
        "Paragraph 2 — Pattern Analysis: Topological and machine-learning behavioral analytics evaluated the fund dispersion pattern. "
        "The automated classifier evaluated multi-hop velocity, value structuring/decay, and endpoint transaction frequency to compute the calibrated risk assessment.\n\n"
        "Paragraph 3 — Investigative Recommendation: Law enforcement officers are advised to inspect the terminal address attribution. "
        "If a Virtual Asset Service Provider (VASP) or exchange deposit endpoint was reached, formal legal preservation and user disclosure notices should be issued to the relevant entity."
    )


def generate_narrative(prompt: str) -> tuple[str, str]:
    """
    Attempts:
      1. Gemini Flash API
      2. Ollama local instance
      3. Deterministic template fallback
    Returns:
      (narrative_text, provider_name)
    """
    # 1. Gemini Flash
    api_key = os.getenv("GEMINI_API_KEY")
    if GEMINI_AVAILABLE and api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip(), "gemini-2.0-flash"
        except Exception as e:
            print(f"[LLM] Gemini generation failed: {e}. Falling back...")

    # 2. Ollama local
    try:
        resp = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
            timeout=10,
        )
        if resp.status_code == 200:
            content = resp.json().get("response", "").strip()
            if content:
                return content, "ollama/llama3.2"
    except Exception:
        pass

    # 3. Deterministic Template fallback
    return generate_template_narrative(prompt), "template"
