import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from graph_analytics.network_metrics import (
    build_digraph_from_hops,
    compute_graph_metrics,
)


def test_linear_chain_graph_metrics():
    hops = [
        {
            "hopIndex": 1,
            "fromAddress": "0xaaa",
            "toAddress": "0xbbb",
            "amountEth": 1.0,
            "usdValue": 3000.0,
            "txTimestamp": "2026-08-25T10:00:00Z",
        },
        {
            "hopIndex": 2,
            "fromAddress": "0xbbb",
            "toAddress": "0xccc",
            "amountEth": 0.98,
            "usdValue": 2940.0,
            "txTimestamp": "2026-08-25T10:05:00Z",
        },
        {
            "hopIndex": 3,
            "fromAddress": "0xccc",
            "toAddress": "0xddd",
            "amountEth": 0.96,
            "usdValue": 2880.0,
            "txTimestamp": "2026-08-25T10:10:00Z",
        },
    ]

    G = build_digraph_from_hops(hops, root_address="0xaaa")
    metrics = compute_graph_metrics(G, hops)

    assert metrics.node_count == 4
    assert metrics.edge_count == 3
    assert metrics.is_linear_chain is True
    assert metrics.is_star_topology is False
    assert metrics.min_hop_velocity_sec == 300.0
    assert metrics.total_usd_transacted == 8820.0
    assert metrics.value_decay_ratio > 0.0


def test_star_topology_metrics():
    hops = [
        {
            "hopIndex": 1,
            "fromAddress": "0xroot",
            "toAddress": "0xleaf1",
            "amountEth": 1.0,
            "usdValue": 3000.0,
            "txTimestamp": "2026-08-25T10:00:00Z",
        },
        {
            "hopIndex": 1,
            "fromAddress": "0xroot",
            "toAddress": "0xleaf2",
            "amountEth": 1.0,
            "usdValue": 3000.0,
            "txTimestamp": "2026-08-25T10:00:10Z",
        },
        {
            "hopIndex": 1,
            "fromAddress": "0xroot",
            "toAddress": "0xleaf3",
            "amountEth": 1.0,
            "usdValue": 3000.0,
            "txTimestamp": "2026-08-25T10:00:20Z",
        },
    ]

    G = build_digraph_from_hops(hops, root_address="0xroot")
    metrics = compute_graph_metrics(G, hops)

    assert metrics.node_count == 4
    assert metrics.max_fan_out_degree == 3
    assert metrics.is_star_topology is True
    assert metrics.is_linear_chain is False


def test_empty_graph_metrics():
    G = build_digraph_from_hops([], root_address="")
    metrics = compute_graph_metrics(G, [])

    assert metrics.node_count == 0
    assert metrics.edge_count == 0
    assert metrics.is_linear_chain is False
