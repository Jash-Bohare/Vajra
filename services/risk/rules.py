"""
Risk Scoring Rules Engine for RT-CFAS & Vajra LEA Edition (Doc 03 Section 16 & Spec 08)
Pure, independently testable Python functions.
"""

from typing import Optional, List, Literal, Set
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# Known DEX router contracts (Spec 08 Bug Fix #1)
KNOWN_DEX_ROUTERS: Set[str] = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',  # Uniswap V2 Router
    '0xe592427a0aece92de3edee1f18e0157c05861564',  # Uniswap V3 Router
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',  # Uniswap V3 Router 2
    '0x1111111254fb6c44bac0bed2854e76f90643097d',  # 1inch V4 Router
    '0x1111111254eeb25477b68fb85ed929f73a960582',  # 1inch V5 Router
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',  # SushiSwap Router
    '0x03f7724180aa6b939894b5ca4314783b0b36b329',  # Shibaswap Router
}


class TraceHopInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    hop_index: int = Field(..., alias="hopIndex")
    from_address: str = Field(..., alias="fromAddress")
    to_address: str = Field(..., alias="toAddress")
    amount_eth: float = Field(..., alias="amountEth")
    tx_hash: str = Field(..., alias="txHash")
    tx_timestamp: str = Field(..., alias="txTimestamp")
    token_symbol: Optional[str] = Field(None, alias="tokenSymbol")
    token_amount: Optional[float] = Field(None, alias="tokenAmount")
    usd_value: Optional[float] = Field(None, alias="usdValue")
    is_internal_tx: Optional[bool] = Field(False, alias="isInternalTx")


class TraceFeatures(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    hop_count: int = Field(..., alias="hopCount")
    min_time_between_hops_sec: float = Field(..., alias="minTimeBetweenHopsSec")
    max_time_between_hops_sec: float = Field(..., alias="maxTimeBetweenHopsSec")
    is_peeling_chain: bool = Field(False, alias="isPeelingChain")
    is_dex_routed: bool = Field(False, alias="isDexRouted")
    terminal_type: Literal["exchange", "inconclusive"] = Field(..., alias="terminalType")
    destination_wallet_prior_tx_count: int = Field(0, alias="destinationWalletPriorTxCount")


class RiskScoreRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_hops: List[TraceHopInput] = Field(default=[], alias="traceHops")
    terminal_type: Literal["exchange", "inconclusive"] = Field("inconclusive", alias="terminalType")
    destination_wallet_prior_tx_count: int = Field(0, alias="destinationWalletPriorTxCount")


class RiskScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    risk_level: Literal["low", "medium", "high", "unavailable"] = Field(..., alias="riskLevel")
    score: float = Field(20.0, description="Numeric risk score between 0.0 and 100.0")
    indicators: List[str] = Field(default_factory=list, description="Triggered risk indicators")
    reason: str
    features_used: Optional[TraceFeatures] = Field(None, alias="featuresUsed")


def extract_features(request: RiskScoreRequest) -> TraceFeatures:
    """Computes feature vector from trace hops per Doc 03 Section 13 & Spec 08."""
    hops = request.trace_hops
    hop_count = len(hops)
    is_peeling = False
    is_dex = False

    if hop_count <= 1:
        min_time = 0.0
        max_time = 0.0
    else:
        timestamps = []
        for h in hops:
            try:
                dt = datetime.fromisoformat(h.tx_timestamp.replace("Z", "+00:00"))
                timestamps.append(dt.timestamp())
            except Exception:
                timestamps.append(0.0)

        diffs = [abs(timestamps[i] - timestamps[i - 1]) for i in range(1, len(timestamps))]
        min_time = min(diffs) if diffs else 0.0
        max_time = max(diffs) if diffs else 0.0

        # Check peeling chain pattern (using usdValue or amountEth)
        for i in range(1, len(hops)):
            prev_val = hops[i - 1].usd_value or hops[i - 1].amount_eth or 0.0
            curr_val = hops[i].usd_value or hops[i].amount_eth or 0.0
            if prev_val > 0 and curr_val < 0.8 * prev_val:
                is_peeling = True
                break

    # Check DEX router whitelist (Spec 08 Bug Fix #1)
    for h in hops:
        if h.is_internal_tx and (h.to_address or "").lower() in KNOWN_DEX_ROUTERS:
            is_dex = True
            break

    return TraceFeatures(
        hop_count=hop_count,
        min_time_between_hops_sec=min_time,
        max_time_between_hops_sec=max_time,
        is_peeling_chain=is_peeling,
        is_dex_routed=is_dex,
        terminal_type=request.terminal_type,
        destination_wallet_prior_tx_count=request.destination_wallet_prior_tx_count,
    )


def score_dex_routing_rule(features: TraceFeatures) -> Optional[RiskScoreResponse]:
    """Rule 0: High risk if internal tx routed through known DEX router (Spec 08 Bug Fix #1)."""
    if features.is_dex_routed:
        return RiskScoreResponse(
            risk_level="high",
            score=79.0,
            indicators=["dex_routing", "contract_obfuscation"],
            reason="Fund routed through known DEX aggregator/router contract — deliberate obfuscation pattern.",
            features_used=features,
        )
    return None


def score_rapid_hops_rule(features: TraceFeatures) -> Optional[RiskScoreResponse]:
    """Rule 1: High risk if 3+ hops executed within 1 hour."""
    if features.hop_count >= 3 and features.min_time_between_hops_sec < 3600:
        return RiskScoreResponse(
            risk_level="high",
            score=88.5,
            indicators=["rapid_forwarding", "multi_hop_velocity"],
            reason="3+ hops within 1 hour — rapid movement pattern",
            features_used=features,
        )
    return None


def score_peeling_chain_rule(features: TraceFeatures) -> Optional[RiskScoreResponse]:
    """Rule 2: High risk if peeling chain / value structuring pattern is detected."""
    if features.is_peeling_chain:
        return RiskScoreResponse(
            risk_level="high",
            score=82.0,
            indicators=["peeling_chain", "value_structuring"],
            reason="Peeling chain pattern detected (significant value reduction between hops)",
            features_used=features,
        )
    return None


def score_burner_wallet_rule(features: TraceFeatures) -> Optional[RiskScoreResponse]:
    """Rule 3: High risk if destination wallet has zero prior transactions."""
    if features.destination_wallet_prior_tx_count == 0 and features.hop_count >= 1:
        return RiskScoreResponse(
            risk_level="high",
            score=85.0,
            indicators=["burner_wallet", "zero_prior_history"],
            reason="Destination wallet has no prior transaction history (burner wallet pattern)",
            features_used=features,
        )
    return None


def score_unresolved_trail_rule(features: TraceFeatures) -> Optional[RiskScoreResponse]:
    """Rule 4: Medium risk if multiple hops fail to reach a known exchange."""
    if features.terminal_type == "inconclusive" and features.hop_count >= 2:
        return RiskScoreResponse(
            risk_level="medium",
            score=55.0,
            indicators=["unresolved_trail", "uncataloged_endpoint"],
            reason="Multiple hops with no identified exchange endpoint",
            features_used=features,
        )
    return None


def score_risk(request: RiskScoreRequest) -> RiskScoreResponse:
    """Master rule engine evaluator executing independent rules in priority order."""
    features = extract_features(request)

    # 0. Check DEX Routing Rule (Whitelist only)
    res = score_dex_routing_rule(features)
    if res:
        return res

    # 1. Check Rule 1 (Rapid hops)
    res = score_rapid_hops_rule(features)
    if res:
        return res

    # 2. Check Rule 2 (Peeling chain)
    res = score_peeling_chain_rule(features)
    if res:
        return res

    # 3. Check Rule 3 (Burner wallet)
    res = score_burner_wallet_rule(features)
    if res:
        return res

    # 4. Check Rule 4 (Unresolved trail)
    res = score_unresolved_trail_rule(features)
    if res:
        return res

    # Default: Low Risk
    return RiskScoreResponse(
        risk_level="low",
        score=15.0,
        indicators=["direct_vasp_deposit"],
        reason="Direct or near-direct transfer to known exchange, no unusual timing",
        features_used=features,
    )
