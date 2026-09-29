import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from llm_narrative.generator import (
    build_prompt,
    generate_template_narrative,
    build_hop_chain_text,
    generate_narrative,
)


def test_build_hop_chain_text():
    hops = [
        {
            "hopIndex": 1,
            "fromAddress": "0x1111111111111111111111111111111111111111",
            "toAddress": "0x2222222222222222222222222222222222222222",
            "amountEth": 1.5,
            "usdValue": 4500.0,
            "tokenSymbol": "ETH",
            "txTimestamp": "2026-08-25T10:00:00Z",
        }
    ]
    text = build_hop_chain_text(hops)
    assert "Hop 1" in text
    assert "0x11111111" in text
    assert "4,500.00" in text


def test_build_prompt():
    prompt = build_prompt(
        wallet_address="0x111",
        hops=[],
        graph_metrics={"node_count": 3, "total_usd_transacted": 9000.0, "is_star_topology": False},
        ml_score=85.0,
        risk_level="HIGH",
        top_indicators=["rapid_forwarding", "peeling_chain"],
        victim_amount_usd=9000.0,
    )
    assert "Suspect Wallet Address: 0x111" in prompt
    assert "Risk Score: 85/100" in prompt
    assert "Paragraph 1" in prompt


def test_generate_template_narrative():
    narrative = generate_template_narrative("sample prompt")
    assert "Paragraph 1" in narrative
    assert "Paragraph 2" in narrative
    assert "Paragraph 3" in narrative


def test_generate_narrative_fallback():
    narrative, provider = generate_narrative("sample prompt")
    assert len(narrative) > 50
    assert provider in ["gemini-2.0-flash", "ollama/llama3.2", "template"]
