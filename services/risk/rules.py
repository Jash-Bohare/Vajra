"""
Risk Scoring Rules Engine for RT-CFAS (Doc 03 Section 16)
Pure, independently testable Python functions.
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class TraceHopInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    hop_index: int = Field(..., alias="hopIndex")
    from_address: str = Field(..., alias="fromAddress")
    to_address: str = Field(..., alias="toAddress")
    amount_eth: float = Field(..., alias="amountEth")
    tx_hash: str = Field(..., alias="txHash")
    tx_timestamp: str = Field(..., alias="txTimestamp")


class TraceFeatures(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    hop_count: int = Field(..., alias="hopCount")
    min_time_between_hops_sec: float = Field(..., alias="minTimeBetweenHopsSec")
    max_time_between_hops_sec: float = Field(..., alias="maxTimeBetweenHopsSec")
    is_peeling_chain: bool = Field(False, alias="isPeelingChain")
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
    """Computes feature vector from trace hops per Doc 03 Section 13."""
    hops = request.trace_hops
    hop_count = len(hops)
    is_peeling = False

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

        # Check peeling chain pattern: significant ETH decrease (> 20%) between consecutive hops
        for i in range(1, len(hops)):
            if hops[i].amount_eth < 0.8 * hops[i - 1].amount_eth:
                is_peeling = True
                break

    return TraceFeatures(
        hop_count=hop_count,
        min_time_between_hops_sec=min_time,
        max_time_between_hops_sec=max_time,
        is_peeling_chain=is_peeling,
        terminal_type=request.terminal_type,
        destination_wallet_prior_tx_count=request.destination_wallet_prior_tx_count,
    )


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
