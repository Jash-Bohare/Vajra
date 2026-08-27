import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from rules import RiskScoreRequest, TraceHopInput, score_risk


def test_dex_routing_rule_triggers_high_risk():
    """Rule 0: Internal transaction to known DEX router should yield High Risk."""
    hops = [
        TraceHopInput(
            hopIndex=1,
            fromAddress="0x111",
            toAddress="0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",  # Uniswap V3 Router 2
            amountEth=0.0,
            tokenSymbol="USDT",
            tokenAmount=5000.0,
            usdValue=5000.0,
            isInternalTx=True,
            txHash="0xabc1",
            txTimestamp="2026-08-25T10:00:00Z",
        )
    ]

    req = RiskScoreRequest(traceHops=hops, terminalType="exchange", destinationWalletPriorTxCount=5)
    res = score_risk(req)

    assert res.risk_level == "high"
    assert res.score == 79.0
    assert "dex_routing" in res.indicators
    assert "known DEX aggregator" in res.reason


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
    assert res.score >= 80.0
    assert "rapid_forwarding" in res.indicators
    assert "rapid movement pattern" in res.reason


def test_peeling_chain_rule_triggers_high_risk():
    """Rule 2: >20% value drop between consecutive hops should trigger Peeling Chain High Risk."""
    hops = [
        TraceHopInput(
            hopIndex=1,
            fromAddress="0x111",
            toAddress="0x222",
            amountEth=10.0,
            usdValue=10000.0,
            txHash="0xabc1",
            txTimestamp="2026-08-25T10:00:00Z",
        ),
        TraceHopInput(
            hopIndex=2,
            fromAddress="0x222",
            toAddress="0x333",
            amountEth=5.0,
            usdValue=5000.0,
            txHash="0xabc2",
            txTimestamp="2026-08-25T15:00:00Z",
        ),
    ]

    req = RiskScoreRequest(traceHops=hops, terminalType="exchange", destinationWalletPriorTxCount=10)
    res = score_risk(req)

    assert res.risk_level == "high"
    assert "peeling_chain" in res.indicators
    assert "peeling chain" in res.reason.lower()


def test_burner_wallet_rule_triggers_high_risk():
    """Rule 3: Zero prior transactions on destination wallet should yield High Risk."""
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
    assert "burner_wallet" in res.indicators
    assert "burner wallet" in res.reason.lower()


def test_unresolved_trail_triggers_medium_risk():
    """Rule 4: Multiple hops ending inconclusive should yield Medium Risk."""
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
    assert "unresolved_trail" in res.indicators
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
    assert res.score == 15.0
    assert "direct_vasp_deposit" in res.indicators
