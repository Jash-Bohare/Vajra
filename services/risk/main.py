"""
FastAPI Microservice for RT-CFAS & Vajra LEA Edition (services/risk)
Phase E3: Multi-Pillar AI/ML Risk Scoring, Graph Analytics & LLM Case Narrative
"""

import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
import uvicorn
from dotenv import load_dotenv

load_dotenv()

from rules import RiskScoreRequest, RiskScoreResponse as BaseRiskScoreResponse, score_risk, TraceFeatures
from graph_analytics.network_metrics import (
    GraphMetrics,
    GraphMetricsRequest,
    GraphMetricsResponse,
    build_digraph_from_hops,
    compute_graph_metrics,
)
from ml_models.classifier import (
    FraudClassifier,
    probability_to_risk_level,
    probability_to_confidence,
)
from ml_models.features import build_feature_vector
from llm_narrative.generator import (
    NarrativeRequest,
    NarrativeResponse,
    build_prompt,
    generate_narrative,
)

app = FastAPI(
    title="RT-CFAS AI/ML Risk Scoring Microservice",
    description="3-Pillar AI/ML Engine: NetworkX Graph Analytics, XGBoost Fraud Classifier & Gemini Case Narratives",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FeatureImportanceItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    feature: str
    shap_value: float = Field(..., alias="shapValue")
    direction: str
    raw_value: float = Field(..., alias="rawValue")


class FullRiskScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # Base rule engine fields (backwards compatibility)
    risk_level: str = Field(..., alias="riskLevel")
    score: float = Field(..., description="Continuous or rule score (0-100)")
    indicators: List[str] = Field(default_factory=list)
    reason: str
    features_used: Optional[TraceFeatures] = Field(None, alias="featuresUsed")

    # Phase E3: Graph Analytics
    graph_metrics: Optional[GraphMetrics] = Field(None, alias="graphMetrics")

    # Phase E3: ML Classifier
    ml_score: Optional[float] = Field(None, alias="mlScore")
    fraud_probability: Optional[float] = Field(None, alias="fraudProbability")
    confidence: Optional[str] = Field(None, alias="confidence")
    feature_importance: List[FeatureImportanceItem] = Field(default_factory=list, alias="featureImportance")
    ml_model_version: Optional[str] = Field(None, alias="mlModelVersion")
    ml_fallback_used: bool = Field(False, alias="mlFallbackUsed")

    # Phase E3: LLM Case Narrative
    ai_narrative: Optional[str] = Field(None, alias="aiNarrative")
    narrative_generated_by: Optional[str] = Field(None, alias="narrativeGeneratedBy")


@app.get("/health")
def health_check():
    model_loaded = False
    try:
        FraudClassifier.load()
        model_loaded = True
    except Exception:
        model_loaded = False

    return {
        "status": "ok",
        "service": "services/risk",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mlModelLoaded": model_loaded,
        "geminiConfigured": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.post("/risk/score", response_model=FullRiskScoreResponse)
def compute_risk_score(request: RiskScoreRequest):
    """
    Master scoring endpoint executing:
      1. Baseline Rule Engine
      2. NetworkX Graph Topological Analytics
      3. XGBoost Classifier + SHAP explainability
      4. LLM Case Narrative Generator (Gemini/Ollama/Template)
    """
    # 1. Base rule evaluation (always available as safety baseline)
    rule_res = score_risk(request)

    # 2. Graph Analytics
    hops_raw = [h.model_dump(by_alias=True) for h in request.trace_hops]
    root_addr = hops_raw[0]["fromAddress"] if hops_raw and "fromAddress" in hops_raw[0] else "unknown"
    G = build_digraph_from_hops(hops_raw, root_address=root_addr)
    graph_metrics = compute_graph_metrics(G, hops_raw)

    # 3. ML Risk Classifier
    tree_data = {
        "totalBranches": request.total_branches,
        "exchangeBranches": request.exchange_branches,
        "totalFanOutNodes": request.total_fan_out_nodes,
        "totalFanInNodes": request.total_fan_in_nodes,
        "taintCoveragePercent": 100.0,
    }

    ml_score = None
    fraud_prob = None
    confidence = "medium"
    importance_items: List[FeatureImportanceItem] = []
    ml_fallback = True
    ml_model_ver = None
    final_risk_level = rule_res.risk_level

    try:
        fv = build_feature_vector(
            hops_raw,
            graph_metrics,
            terminal_type=request.terminal_type,
            destination_prior_tx_count=request.destination_wallet_prior_tx_count,
            tree_data=tree_data,
        )
        prob, raw_importance = FraudClassifier.predict(fv)
        fraud_prob = round(prob, 4)
        ml_score = round(prob * 100.0, 1)
        final_risk_level = probability_to_risk_level(prob)
        confidence = probability_to_confidence(prob)

        importance_items = [
            FeatureImportanceItem(
                feature=item["feature"],
                shap_value=item["shap_value"],
                direction=item["direction"],
                raw_value=item["raw_value"],
            )
            for item in raw_importance
        ]
        ml_fallback = False
        ml_model_ver = "vajra_fraud_classifier_v1"
    except Exception as e:
        print(f"[ML Classifier Warning] Fallback to rules: {e}")
        ml_score = rule_res.score
        final_risk_level = rule_res.risk_level
        ml_fallback = True



    # 4. LLM Narrative Generation
    top_indicators = [item.feature for item in importance_items if item.direction == "increases_risk"]
    if not top_indicators:
        top_indicators = rule_res.indicators

    narrative_text = ""
    generated_by = "none"
    try:
        prompt = build_prompt(
            wallet_address=root_addr,
            hops=hops_raw,
            graph_metrics=graph_metrics.model_dump(by_alias=True),
            ml_score=ml_score if ml_score is not None else rule_res.score,
            risk_level=final_risk_level,
            top_indicators=top_indicators,
            victim_tx_hash=request.victim_tx_hash,
        )
        narrative_text, generated_by = generate_narrative(prompt)
    except Exception as e:
        print(f"[Narrative Warning] LLM generation failed: {e}")
        narrative_text = ""
        generated_by = "none"

    return FullRiskScoreResponse(
        risk_level=final_risk_level,
        score=ml_score if ml_score is not None else rule_res.score,
        indicators=rule_res.indicators if rule_res.indicators else [item.feature for item in importance_items[:3]],
        reason=rule_res.reason,
        features_used=rule_res.features_used,
        graph_metrics=graph_metrics,
        ml_score=ml_score,
        fraud_probability=fraud_prob,
        confidence=confidence,
        feature_importance=importance_items,
        ml_model_version=ml_model_ver,
        ml_fallback_used=ml_fallback,
        ai_narrative=narrative_text,
        narrative_generated_by=generated_by,
    )


@app.post("/risk/graph-metrics", response_model=GraphMetricsResponse)
def get_graph_metrics(request: GraphMetricsRequest):
    """Computes and returns standalone NetworkX graph topological metrics."""
    G = build_digraph_from_hops(request.trace_hops, request.root_address)
    metrics = compute_graph_metrics(G, request.trace_hops, request.victim_amount_usd or 0.0)
    return GraphMetricsResponse(root_address=request.root_address, metrics=metrics)


@app.post("/risk/narrative", response_model=NarrativeResponse)
def regenerate_narrative(request: NarrativeRequest):
    """Regenerates the investigative case narrative."""
    prompt = build_prompt(
        wallet_address=request.wallet_address,
        hops=request.trace_hops,
        graph_metrics=request.graph_metrics,
        ml_score=request.ml_score,
        risk_level=request.risk_level,
        top_indicators=request.top_indicators,
        victim_tx_hash=request.victim_tx_hash,
        victim_amount_usd=request.victim_amount_usd,
        target_asset=request.target_asset,
    )
    narrative_text, gen_provider = generate_narrative(prompt)
    return NarrativeResponse(
        narrative=narrative_text,
        generated_by=gen_provider,
        generated_at=datetime.now(timezone.utc).isoformat(),
        word_count=len(narrative_text.split()),
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
