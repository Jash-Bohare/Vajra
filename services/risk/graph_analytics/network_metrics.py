"""
network_metrics.py — NetworkX-based Graph Topological Analytics
Extracts fund-flow graph structure metrics (centrality, fan-out, velocity, clustering)
"""

import networkx as nx
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from constants import ETH_USD_PRICE


class GraphMetricsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_hops: List[Dict[str, Any]] = Field(default=[], alias="traceHops")
    root_address: str = Field(..., alias="rootAddress")
    victim_amount_usd: Optional[float] = Field(0.0, alias="victimAmountUsd")
    is_tree_mode: bool = Field(False, alias="isTreeMode")


class GraphMetrics(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # Structural
    node_count: int = Field(..., alias="nodeCount")
    edge_count: int = Field(..., alias="edgeCount")
    max_depth: int = Field(..., alias="maxDepth")

    # Fan topology
    max_fan_out_degree: int = Field(..., alias="maxFanOutDegree")
    max_fan_in_degree: int = Field(..., alias="maxFanInDegree")
    avg_out_degree: float = Field(..., alias="avgOutDegree")
    fan_out_ratio: float = Field(..., alias="fanOutRatio")

    # Topology classification
    is_linear_chain: bool = Field(..., alias="isLinearChain")
    is_star_topology: bool = Field(..., alias="isStarTopology")
    is_hourglass_topology: bool = Field(..., alias="isHourglassTopology")
    is_cluster_topology: bool = Field(..., alias="isClusterTopology")

    # Velocity
    avg_hop_velocity_sec: float = Field(..., alias="avgHopVelocitySec")
    min_hop_velocity_sec: float = Field(..., alias="minHopVelocitySec")
    max_hop_velocity_sec: float = Field(..., alias="maxHopVelocitySec")

    # Centrality (NetworkX)
    max_degree_centrality: float = Field(..., alias="maxDegreeCentrality")
    avg_betweenness_centrality: float = Field(..., alias="avgBetweennessCentrality")
    clustering_coefficient: float = Field(..., alias="clusteringCoefficient")

    # Value flow
    total_usd_transacted: float = Field(..., alias="totalUsdTransacted")
    value_decay_ratio: float = Field(..., alias="valueDecayRatio")


class GraphMetricsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    root_address: str = Field(..., alias="rootAddress")
    metrics: GraphMetrics


def build_digraph_from_hops(hops: List[Dict[str, Any]], root_address: str) -> nx.DiGraph:
    """
    Constructs a NetworkX DiGraph from a TraceHop array.
    Each hop becomes a directed edge: fromAddress → toAddress
    Edge weight = usdValue (or amountEth * ETH_USD_PRICE)
    """
    G = nx.DiGraph()
    if root_address:
        G.add_node(root_address, depth=0)

    for hop in hops:
        from_addr = hop.get("fromAddress") or hop.get("from_address") or ""
        to_addr = hop.get("toAddress") or hop.get("to_address") or ""
        if not from_addr and not to_addr:
            continue

        usd = hop.get("usdValue") or hop.get("usd_value")
        if usd is None:
            eth = hop.get("amountEth") or hop.get("amount_eth") or 0.0
            usd = float(eth) * ETH_USD_PRICE
        else:
            usd = float(usd)

        ts = hop.get("txTimestamp") or hop.get("tx_timestamp") or ""
        depth = hop.get("hopIndex") or hop.get("hop_index") or 1

        if from_addr:
            if from_addr not in G:
                G.add_node(from_addr, depth=max(0, depth - 1))
        if to_addr:
            if to_addr not in G:
                G.add_node(to_addr, depth=depth)

        if from_addr and to_addr:
            G.add_edge(from_addr, to_addr, usd_value=usd, timestamp=ts)

    return G


def compute_graph_metrics(G: nx.DiGraph, hops: List[Dict[str, Any]], victim_usd: float = 0.0) -> GraphMetrics:
    """
    Computes all topological metrics from a NetworkX DiGraph and hop data.
    Pure, deterministic function.
    """
    node_count = G.number_of_nodes()
    edge_count = G.number_of_edges()

    if node_count == 0:
        return GraphMetrics(
            node_count=0,
            edge_count=0,
            max_depth=0,
            max_fan_out_degree=0,
            max_fan_in_degree=0,
            avg_out_degree=0.0,
            fan_out_ratio=0.0,
            is_linear_chain=False,
            is_star_topology=False,
            is_hourglass_topology=False,
            is_cluster_topology=False,
            avg_hop_velocity_sec=0.0,
            min_hop_velocity_sec=0.0,
            max_hop_velocity_sec=0.0,
            max_degree_centrality=0.0,
            avg_betweenness_centrality=0.0,
            clustering_coefficient=0.0,
            total_usd_transacted=0.0,
            value_decay_ratio=0.0,
        )

    # Degree metrics
    out_degrees = [d for _, d in G.out_degree()]
    in_degrees = [d for _, d in G.in_degree()]
    max_fan_out = max(out_degrees) if out_degrees else 0
    max_fan_in = max(in_degrees) if in_degrees else 0
    avg_out = sum(out_degrees) / len(out_degrees) if out_degrees else 0.0

    # Topology classification
    is_linear = (
        node_count >= 2
        and all(d <= 1 for d in out_degrees)
        and all(d <= 1 for d in in_degrees)
    )

    root_candidates = [n for n, d in G.in_degree() if d == 0]
    root_node = root_candidates[0] if root_candidates else (list(G.nodes)[0] if list(G.nodes) else None)
    is_star = False
    if root_node and max_fan_out >= 3:
        successors = list(G.successors(root_node))
        if successors and all(G.out_degree(n) == 0 for n in successors):
            is_star = True

    is_hourglass = max_fan_out >= 2 and max_fan_in >= 2

    # Velocity (seconds between consecutive hops)
    hop_times = []
    sorted_hops = sorted(hops, key=lambda h: h.get("hopIndex") or h.get("hop_index") or 0)
    for i in range(1, len(sorted_hops)):
        try:
            ts1_str = sorted_hops[i - 1].get("txTimestamp") or sorted_hops[i - 1].get("tx_timestamp") or ""
            ts2_str = sorted_hops[i].get("txTimestamp") or sorted_hops[i].get("tx_timestamp") or ""
            t1 = datetime.fromisoformat(ts1_str.replace("Z", "+00:00")).timestamp()
            t2 = datetime.fromisoformat(ts2_str.replace("Z", "+00:00")).timestamp()
            hop_times.append(abs(t2 - t1))
        except Exception:
            pass

    avg_vel = float(sum(hop_times) / len(hop_times)) if hop_times else 0.0
    min_vel = float(min(hop_times)) if hop_times else 0.0
    max_vel = float(max(hop_times)) if hop_times else 0.0

    # NetworkX centrality metrics
    degree_centrality = nx.degree_centrality(G)
    max_dc = float(max(degree_centrality.values())) if degree_centrality else 0.0

    betweenness = nx.betweenness_centrality(G)
    avg_bc = float(sum(betweenness.values()) / len(betweenness)) if betweenness else 0.0

    # Clustering coefficient (undirected view)
    G_undirected = G.to_undirected()
    cc = float(nx.average_clustering(G_undirected)) if node_count > 1 else 0.0

    # USD flow decay (calculated from sorted hops)
    usd_values = []
    for h in sorted_hops:
        v = h.get("usdValue") or h.get("usd_value")
        if v is None:
            eth = h.get("amountEth") or h.get("amount_eth") or 0.0
            v = float(eth) * ETH_USD_PRICE
        else:
            v = float(v)
        usd_values.append(v)

    total_usd = float(sum(usd_values)) if usd_values else float(sum(d.get("usd_value", 0.0) for _, _, d in G.edges(data=True)))
    first_usd = usd_values[0] if usd_values else 0.0
    last_usd = usd_values[-1] if usd_values else 0.0
    raw_decay = float((first_usd - last_usd) / first_usd) if first_usd > 0 else 0.0
    decay = max(-1.0, min(1.0, raw_decay))

    max_depth = max((d.get("depth", 0) for _, d in G.nodes(data=True)), default=0)

    is_cluster = cc > 0.3 and not is_linear and not is_star

    return GraphMetrics(
        node_count=node_count,
        edge_count=edge_count,
        max_depth=max_depth,
        max_fan_out_degree=max_fan_out,
        max_fan_in_degree=max_fan_in,
        avg_out_degree=avg_out,
        fan_out_ratio=float(max_fan_out),
        is_linear_chain=is_linear,
        is_star_topology=is_star,
        is_hourglass_topology=is_hourglass,
        is_cluster_topology=is_cluster,
        avg_hop_velocity_sec=avg_vel,
        min_hop_velocity_sec=min_vel,
        max_hop_velocity_sec=max_vel,
        max_degree_centrality=max_dc,
        avg_betweenness_centrality=avg_bc,
        clustering_coefficient=cc,
        total_usd_transacted=total_usd,
        value_decay_ratio=decay,
    )
