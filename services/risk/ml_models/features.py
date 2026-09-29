"""
features.py — Feature engineering for ML Risk Classifier (28-D feature vector)
Combines hop statistics, NetworkX graph topology metrics, and tree metrics.
"""

from typing import List, Dict, Optional, Any
import numpy as np
from datetime import datetime
from constants import ETH_USD_PRICE, KNOWN_DEX_ROUTERS
from graph_analytics.network_metrics import GraphMetrics

FEATURE_NAMES = [
    # === Hop-level features ===
    "hop_count",                    # Total hops traced
    "min_time_between_hops_sec",    # Min seconds between consecutive hops
    "max_time_between_hops_sec",    # Max seconds between consecutive hops
    "avg_time_between_hops_sec",    # Average seconds between consecutive hops
    "terminal_is_exchange",         # 1 if terminal node is a known VASP, 0 otherwise
    "destination_prior_tx_count",   # Prior tx count at terminal wallet (burner = 0)
    "is_peeling_chain",             # 1 if successive value reduction >20% per hop
    "is_dex_routed",                # 1 if any hop routes through known DEX router
    "total_usd_transacted",         # Total USD value across all hops
    "value_decay_ratio",            # (first_hop_usd - last_hop_usd) / first_hop_usd

    # === Graph topology features (from NetworkX) ===
    "node_count",                   # Total nodes in fund-flow graph
    "edge_count",                   # Total edges (transfers)
    "max_fan_out_degree",           # Maximum outgoing branches from any node
    "max_fan_in_degree",            # Maximum incoming branches to any node
    "avg_out_degree",               # Average outgoing degree across all nodes
    "max_degree_centrality",        # NetworkX max normalized degree centrality
    "avg_betweenness_centrality",   # NetworkX avg betweenness centrality
    "clustering_coefficient",       # NetworkX average clustering coefficient
    "is_linear_chain",              # 1 if linear single-path topology
    "is_star_topology",             # 1 if star-shaped (1 hub → many leaves)
    "is_hourglass_topology",        # 1 if fan-out then fan-in pattern
    "max_hop_velocity_sec",         # Slowest hop time (in seconds)
    "min_hop_velocity_sec",         # Fastest hop time (in seconds)

    # === Tree-level features (Phase E2 — set to 0 if not tree mode) ===
    "total_branches",               # Number of branches in BFS tree
    "exchange_branches",            # Branches terminating at VASP
    "taint_coverage_percent",       # % of victim funds accounted for
    "is_fan_out_detected",          # 1 if any fan-out node in tree
    "is_fan_in_detected",           # 1 if any fan-in node in tree
]

FEATURE_COUNT = len(FEATURE_NAMES)  # 28


def build_feature_vector(
    hops: List[Dict[str, Any]],
    graph_metrics: GraphMetrics,
    terminal_type: str = "inconclusive",
    destination_prior_tx_count: int = 0,
    tree_data: Optional[Dict[str, Any]] = None,
) -> np.ndarray:
    """
    Assembles the 28-dimensional feature vector for XGBoost inference/training.
    All features are numeric floats.
    """
    # Hop velocity calculation
    timestamps = []
    sorted_hops = sorted(hops, key=lambda x: x.get("hopIndex") or x.get("hop_index") or 0)
    for h in sorted_hops:
        try:
            ts_str = h.get("txTimestamp") or h.get("tx_timestamp") or ""
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            timestamps.append(dt.timestamp())
        except Exception:
            timestamps.append(0.0)

    diffs = [abs(timestamps[i] - timestamps[i - 1]) for i in range(1, len(timestamps))]
    min_t = min(diffs) if diffs else 0.0
    max_t = max(diffs) if diffs else 0.0
    avg_t = sum(diffs) / len(diffs) if diffs else 0.0

    # Peeling chain check
    is_peeling = 0
    for i in range(1, len(sorted_hops)):
        prev_h = sorted_hops[i - 1]
        curr_h = sorted_hops[i]
        pv = prev_h.get("usdValue") or prev_h.get("usd_value")
        if pv is None:
            pv = (prev_h.get("amountEth") or prev_h.get("amount_eth") or 0.0) * ETH_USD_PRICE
        else:
            pv = float(pv)

        cv = curr_h.get("usdValue") or curr_h.get("usd_value")
        if cv is None:
            cv = (curr_h.get("amountEth") or curr_h.get("amount_eth") or 0.0) * ETH_USD_PRICE
        else:
            cv = float(cv)

        if pv > 0 and cv < 0.8 * pv:
            is_peeling = 1
            break

    # DEX routing check
    is_dex = 0
    for h in hops:
        is_internal = h.get("isInternalTx") or h.get("is_internal_tx") or False
        to_addr = (h.get("toAddress") or h.get("to_address") or "").lower()
        if is_internal and to_addr in KNOWN_DEX_ROUTERS:
            is_dex = 1
            break

    # Tree features
    tree = tree_data or {}
    total_branches = float(tree.get("totalBranches") or tree.get("total_branches") or 1)
    exchange_branches = float(tree.get("exchangeBranches") or tree.get("exchange_branches") or 0)
    taint_coverage = float(tree.get("taintCoveragePercent") or tree.get("taint_coverage_percent") or 0.0)
    is_fan_out = 1.0 if (tree.get("totalFanOutNodes") or tree.get("total_fan_out_nodes") or 0) > 0 else 0.0
    is_fan_in = 1.0 if (tree.get("totalFanInNodes") or tree.get("total_fan_in_nodes") or 0) > 0 else 0.0

    vector = [
        float(len(hops)),
        float(min_t),
        float(max_t),
        float(avg_t),
        1.0 if str(terminal_type).lower() == "exchange" else 0.0,
        float(destination_prior_tx_count),
        float(is_peeling),
        float(is_dex),
        float(graph_metrics.total_usd_transacted),
        float(graph_metrics.value_decay_ratio),
        float(graph_metrics.node_count),
        float(graph_metrics.edge_count),
        float(graph_metrics.max_fan_out_degree),
        float(graph_metrics.max_fan_in_degree),
        float(graph_metrics.avg_out_degree),
        float(graph_metrics.max_degree_centrality),
        float(graph_metrics.avg_betweenness_centrality),
        float(graph_metrics.clustering_coefficient),
        1.0 if graph_metrics.is_linear_chain else 0.0,
        1.0 if graph_metrics.is_star_topology else 0.0,
        1.0 if graph_metrics.is_hourglass_topology else 0.0,
        float(graph_metrics.max_hop_velocity_sec),
        float(graph_metrics.min_hop_velocity_sec),
        total_branches,
        exchange_branches,
        taint_coverage,
        is_fan_out,
        is_fan_in,
    ]

    return np.array(vector, dtype=np.float32)
