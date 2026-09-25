import sys
import os
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml_models.classifier import (
    FraudClassifier,
    probability_to_risk_level,
    probability_to_confidence,
)
from ml_models.features import build_feature_vector, FEATURE_COUNT
from graph_analytics.network_metrics import build_digraph_from_hops, compute_graph_metrics


def test_feature_vector_dimension():
    hops = [
        {
            "hopIndex": 1,
            "fromAddress": "0x111",
            "toAddress": "0x222",
            "amountEth": 1.0,
            "usdValue": 3000.0,
            "txTimestamp": "2026-08-25T10:00:00Z",
        }
    ]
    G = build_digraph_from_hops(hops, root_address="0x111")
    metrics = compute_graph_metrics(G, hops)
    vec = build_feature_vector(hops, metrics, terminal_type="exchange", destination_prior_tx_count=10)

    assert isinstance(vec, np.ndarray)
    assert len(vec) == FEATURE_COUNT
    assert len(vec) == 28


def test_fraud_classifier_prediction_and_shap():
    # Test with a high-risk multi-hop rapid transfer
    hops = [
        {
            "hopIndex": 1,
            "fromAddress": "0xaaa",
            "toAddress": "0xbbb",
            "amountEth": 5.0,
            "usdValue": 15000.0,
            "txTimestamp": "2026-08-25T10:00:00Z",
        },
        {
            "hopIndex": 2,
            "fromAddress": "0xbbb",
            "toAddress": "0xccc",
            "amountEth": 3.0,
            "usdValue": 9000.0,
            "txTimestamp": "2026-08-25T10:02:00Z",
        },
        {
            "hopIndex": 3,
            "fromAddress": "0xccc",
            "toAddress": "0xddd",
            "amountEth": 1.5,
            "usdValue": 4500.0,
            "txTimestamp": "2026-08-25T10:04:00Z",
        },
    ]
    G = build_digraph_from_hops(hops, root_address="0xaaa")
    metrics = compute_graph_metrics(G, hops)
    vec = build_feature_vector(hops, metrics, terminal_type="exchange", destination_prior_tx_count=0)

    prob, importance = FraudClassifier.predict(vec)

    assert 0.0 <= prob <= 1.0
    assert len(importance) > 0
    assert "feature" in importance[0]
    assert "shap_value" in importance[0]
    assert "direction" in importance[0]
    assert probability_to_risk_level(prob) in ["low", "medium", "high", "critical"]
    assert probability_to_confidence(prob) in ["low", "medium", "high"]
