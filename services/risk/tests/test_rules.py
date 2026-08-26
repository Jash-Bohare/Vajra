import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from rules import RiskScoreRequest, TraceHopInput, score_risk


def test_rapid_hops_rule_triggers_high_risk():
    """Rule 1: 3+ hops within 1 hour should yield High Risk."""
    hops = [
        TraceHopInput(
            hopIndex=1,
            fromAddress="0x111",
            toAddress="0x222",
            amountEth=1.5,
            txHash="0xabc1",
            txTimestamp="2026-08-25T10:00:00Z",
        ),
        TraceHopInput(
            hopIndex=2,
            fromAddress="0x222",
            toAddress="0x333",
            amountEth=1.4,
            txHash="0xabc2",
            txTimestamp="2026-08-25T10:05:00Z",
        ),
        TraceHopInput(
            hopIndex=3,
            fromAddress="0x333",
            toAddress="0x444",
            amountEth=1.3,
            txHash="0xabc3",
            txTimestamp="2026-08-25T10:10:00Z",
        ),
    ]

    req = RiskScoreRequest(traceHops=hops, terminalType="exchange", destinationWalletPriorTxCount=5)
    res = score_risk(req)

    assert res.risk_level == "high"
    assert "rapid movement pattern" in res.reason


def test_burner_wallet_rule_triggers_high_risk():
    """Rule 2: Zero prior transactions on destination wallet should yield High Risk."""
    hops = [
        TraceHopInput(
            hopIndex=1,
            fromAddress="0x111",
            toAddress="0x222",
            amountEth=0.5,
            txHash="0xabc1",
            txTimestamp="2026-08-25T10:00:00Z",
        )
    ]

    req = RiskScoreRequest(traceHops=hops, terminalType="exchange", destinationWalletPriorTxCount=0)
    res = score_risk(req)

    assert res.risk_level == "high"
    assert "burner wallet" in res.reason.lower()


def test_unresolved_trail_triggers_medium_risk():
    """Rule 3: Multiple hops ending inconclusive should yield Medium Risk."""
    hops = [
        TraceHopInput(
            hopIndex=1,
            fromAddress="0x111",
            toAddress="0x222",
            amountEth=0.5,
            txHash="0xabc1",
            txTimestamp="2026-08-25T10:00:00Z",
        ),
        TraceHopInput(
            hopIndex=2,
            fromAddress="0x222",
            toAddress="0x333",
            amountEth=0.48,
            txHash="0xabc2",
            txTimestamp="2026-08-25T20:00:00Z",
        ),
    ]

    req = RiskScoreRequest(traceHops=hops, terminalType="inconclusive", destinationWalletPriorTxCount=10)
    res = score_risk(req)

    assert res.risk_level == "medium"
    assert "no identified exchange endpoint" in res.reason


def test_normal_transfer_triggers_low_risk():
    """Direct transfer to exchange with prior history should yield Low Risk."""
    hops = [
        TraceHopInput(
            hopIndex=1,
            fromAddress="0x111",
            toAddress="0x222",
            amountEth=0.5,
            txHash="0xabc1",
            txTimestamp="2026-08-25T10:00:00Z",
        )
    ]

    req = RiskScoreRequest(traceHops=hops, terminalType="exchange", destinationWalletPriorTxCount=100)
    res = score_risk(req)

    assert res.risk_level == "low"
