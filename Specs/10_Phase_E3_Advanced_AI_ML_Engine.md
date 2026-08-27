# Spec 10 — Phase E3: Advanced AI/ML Engine
### Vajra LEA Enterprise Edition | Real-Time Crypto Fraud Attribution System (RT-CFAS)
**Phase:** E3 — Advanced AI/ML Engine (Graph Analytics, ML Risk Classifier & LLM Narrative)
**Target Date:** September 3, 2026
**Owner:** AI/ML Teammates + MERN Dev
**Branch:** `phase-e3`
**Prerequisite:** Phase E2 (`main`, Multi-Branch Tree Engine) fully merged and verified

---

## 1. Executive Summary

Phase E3 transforms the `services/risk/` microservice from a hand-coded rule engine into a **three-pillar AI/ML intelligence system**:

1. **Graph Topological Analytics (NetworkX)** — Mathematical extraction of fund-flow graph structure metrics (centrality, fan-out ratio, velocity, clustering) that reveal organization-level money laundering patterns invisible to rule-based systems.

2. **ML Risk Classifier (XGBoost)** — A trained gradient-boosted tree model that replaces the current binary rule-waterfall with a calibrated **continuous fraud probability score (0–100)**, trained on real labeled blockchain data and returning per-feature importance breakdowns for explainability.

3. **LLM Case Narrative Generator (Gemini Flash / Ollama Llama 3)** — Automated generation of a **3-paragraph investigative executive summary** in plain English, suitable for inclusion in court case files, FIR complaint annexures, and NCRP report submissions — without requiring investigator writing skills.

**Acceptance Criteria:** The investigator UI displays:
- A circular **ML Risk Score gauge** (0–100) with confidence interval
- A **Graph Metrics card** showing node count, fan-out ratio, hop velocity, clustering coefficient
- A **Feature Importance breakdown** bar chart showing which signals drove the ML decision
- An **AI Case Narrative** 3-paragraph expandable text block
- All existing E1 and E2 features continue working (zero regression)

---

## 2. Problem Statement: Why Phase E3 Matters

### 2.1 Limitations of the Current Rule Engine

The existing `rules.py` engine is a sequential rule waterfall — it fires the first matching rule and returns. This has two fundamental weaknesses:

**Problem 1 — Binary Scoring:**
A wallet either matches `rapid_forwarding` OR `peeling_chain` OR `burner_wallet`. There is no score compounding. Two moderate signals that together strongly indicate fraud return the same result as one isolated signal.

**Problem 2 — No Structural Pattern Recognition:**
The current engine looks at individual hops one-by-one. It cannot recognize fund-flow topology patterns — e.g., a "star cluster" (one central wallet distributing to 20 leaf wallets) is structurally different from a "chain" (20 wallets in sequence) even if both have 20 nodes. Real money laundering syndicates have characteristic graph topology fingerprints that NetworkX graph metrics can expose.

### 2.2 Why ML > Rules for Fraud Scoring

| Dimension | Current Rule Engine | Phase E3 ML Model |
|-----------|--------------------|--------------------|
| Score type | Binary (HIGH/MEDIUM/LOW) | Continuous 0–100 probability |
| Multi-signal fusion | No (first match wins) | Yes (weighted combination of all features) |
| Feature interactions | No | Yes (XGBoost cross-feature splits) |
| Graph structure awareness | No | Yes (NetworkX metrics as features) |
| Explainability | Rule text only | SHAP feature importance per case |
| Calibration | Fixed thresholds | Data-driven from labeled examples |
| Generalization | Only fires on known patterns | Generalizes to unseen combinations |

### 2.3 Why an LLM Narrative is Necessary for LEA

Indian cybercrime investigators at district cyber cells are **not technical blockchain experts**. When they receive a raw investigation result, they must translate it into a structured FIR annexure or court submission themselves. This takes hours and introduces interpretation errors.

An LLM-generated 3-paragraph executive summary — written in plain investigative language — allows officers to directly paste the AI-generated narrative into their case documents, review it for accuracy, and submit it. This is a **direct labor multiplier** for understaffed cyber cells.

---

## 3. Architecture Overview

### 3.1 New Directory Structure (`services/risk/`)

```
services/risk/
├── main.py                          ← MODIFY: Add 3 new endpoints
├── rules.py                         ← KEEP: Rule fallback engine (unchanged)
├── requirements.txt                 ← MODIFY: Add networkx, xgboost, scikit-learn, shap, google-generativeai
│
├── graph_analytics/                 ← NEW SUBMODULE
│   ├── __init__.py
│   └── network_metrics.py           ← NetworkX metric extractor (pure function, no I/O)
│
├── ml_models/                       ← NEW SUBMODULE
│   ├── __init__.py
│   ├── features.py                  ← Feature engineering: combines TraceHop + GraphMetrics → feature vector
│   ├── classifier.py                ← XGBoost model loader + inference + SHAP explainer
│   ├── train.py                     ← Offline training script (run once to generate model artifact)
│   └── artifacts/
│       ├── vajra_fraud_classifier_v1.pkl    ← Serialized trained XGBoost model
│       └── feature_names.json               ← Ordered feature name list for SHAP alignment
│
├── llm_narrative/                   ← NEW SUBMODULE
│   ├── __init__.py
│   └── generator.py                 ← LLM prompt builder + API call + response parser
│
├── data/                            ← NEW: Training & labeled datasets
│   ├── README.md                    ← Dataset provenance and source documentation
│   ├── labeled_traces.jsonl         ← Primary labeled dataset (ground truth)
│   ├── synthetic_fraud.jsonl        ← Synthetic fraud samples (augmentation)
│   └── synthetic_legit.jsonl        ← Synthetic legitimate samples (augmentation)
│
└── tests/
    ├── test_rules.py                ← EXISTING (keep all passing)
    ├── test_graph_analytics.py      ← NEW: NetworkX metric tests
    ├── test_ml_classifier.py        ← NEW: ML model inference tests
    └── test_llm_narrative.py        ← NEW: Narrative template tests (mocked LLM)
```

### 3.2 System Data Flow (Phase E3)

```
API Request (POST /risk/score)
        │
        ├─── Step 1: Rule Engine (existing rules.py)
        │       → Returns rule-based risk level as FALLBACK
        │
        ├─── Step 2: Graph Analytics (graph_analytics/network_metrics.py)
        │       → Builds NetworkX DiGraph from TraceHop array
        │       → Computes: node_count, edge_count, max_fan_out, avg_hop_velocity_sec,
        │                   degree_centrality, clustering_coeff, is_star_topology,
        │                   is_chain_topology, is_hourglass_topology
        │
        ├─── Step 3: ML Risk Classifier (ml_models/classifier.py)
        │       → Assembles feature vector from TraceHop features + GraphMetrics
        │       → XGBoost model inference → fraud_probability (0.0–1.0)
        │       → SHAP explainer → per-feature importance scores
        │       → Maps probability to risk_level: low/medium/high/critical
        │
        ├─── Step 4: LLM Narrative Generator (llm_narrative/generator.py)
        │       → Builds structured prompt from trace data + ML score + graph metrics
        │       → Calls Gemini Flash API (or Ollama Llama 3 fallback)
        │       → Parses 3-paragraph response
        │
        └─── Step 5: Aggregate Response
                → Returns: ml_score, risk_level, indicators, reason,
                           graph_metrics, feature_importance, ai_narrative
```

### 3.3 New FastAPI Endpoints

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/risk/score` | POST | `RiskScoreRequest` (existing) | MODIFY: add `graphMetrics`, `featureImportance`, `aiNarrative` to response |
| `/risk/graph-metrics` | POST | `GraphMetricsRequest` | `GraphMetricsResponse` — raw NetworkX metrics only |
| `/risk/narrative` | POST | `NarrativeRequest` | `NarrativeResponse` — AI narrative only (re-generatable) |
| `/risk/health` | GET | — | Existing health check (add model loaded status) |

---

## 4. Detailed Technical Specification

### 4.1 Python Dependency Changes (`requirements.txt`)

```
# Existing
fastapi>=0.109.0
uvicorn>=0.27.0
pydantic>=2.6.0
pytest>=8.0.0

# Phase E3 additions
networkx>=3.3             # Graph topological analytics
xgboost>=2.0.3            # ML risk classifier (gradient boosting)
scikit-learn>=1.4.2       # Feature scaling, train/test split, evaluation metrics
shap>=0.45.0              # SHAP explainability for ML feature importance
joblib>=1.3.2             # Model serialization (.pkl) and parallel processing
google-generativeai>=0.7.2  # Gemini Flash API (primary LLM)
python-dotenv>=1.0.0      # Load GEMINI_API_KEY from .env
numpy>=1.26.0             # Feature vector operations
pandas>=2.2.0             # Training dataset loading & preprocessing
```

---

### 4.2 Pillar 1: Graph Topological Analytics (`graph_analytics/network_metrics.py`)

#### 4.2.1 Overview

This module accepts the `TraceHop[]` array (or `TraceTree` from E2) and builds a **NetworkX Directed Graph (DiGraph)** from it. It then computes a standard set of topological metrics that describe the structure of the money flow network.

#### 4.2.2 Pydantic Data Contracts

```python
from pydantic import BaseModel
from typing import List, Optional

class GraphNodeInput(BaseModel):
    address: str
    is_vasp: bool = False
    vasp_name: Optional[str] = None
    is_fan_out: bool = False
    is_fan_in: bool = False
    depth: int = 0

class GraphEdgeInput(BaseModel):
    from_address: str   # alias: "from"
    to_address: str     # alias: "to"
    usd_value: Optional[float] = None
    timestamp: Optional[str] = None
    taint_percentage: Optional[float] = None

class GraphMetricsRequest(BaseModel):
    trace_hops: List[dict]          # Raw TraceHop array (from E1/E2)
    root_address: str
    victim_amount_usd: Optional[float] = None
    is_tree_mode: bool = False      # True if E2 multi-branch tree result

class GraphMetrics(BaseModel):
    # Structural
    node_count: int
    edge_count: int
    max_depth: int

    # Fan topology
    max_fan_out_degree: int         # Max number of outgoing edges from any node
    max_fan_in_degree: int          # Max number of incoming edges to any node
    avg_out_degree: float           # Average outgoing edges per node
    fan_out_ratio: float            # node_count / 1 (ratio of nodes to source)

    # Topology classification
    is_linear_chain: bool           # All nodes have in-degree ≤ 1 and out-degree ≤ 1
    is_star_topology: bool          # Root has out-degree ≥ 3, all children are leaves
    is_hourglass_topology: bool     # Fan-out followed by fan-in (E2 Pattern 2)
    is_cluster_topology: bool       # Multiple hubs with high interconnection

    # Velocity
    avg_hop_velocity_sec: float     # Average seconds between consecutive hops
    min_hop_velocity_sec: float     # Minimum (fastest) hop time
    max_hop_velocity_sec: float     # Maximum (slowest) hop time

    # Centrality (computed by NetworkX)
    max_degree_centrality: float    # Max normalized degree centrality (0–1)
    avg_betweenness_centrality: float # Avg betweenness centrality
    clustering_coefficient: float   # Average clustering coefficient of intermediary nodes

    # Value flow
    total_usd_transacted: float     # Sum of all edge USD values
    value_decay_ratio: float        # (first hop usd - last hop usd) / first hop usd

class GraphMetricsResponse(BaseModel):
    root_address: str
    metrics: GraphMetrics
```

#### 4.2.3 Implementation: `network_metrics.py`

```python
import networkx as nx
from datetime import datetime
from typing import List, Dict, Optional

def build_digraph_from_hops(hops: List[dict], root_address: str) -> nx.DiGraph:
    """
    Constructs a NetworkX DiGraph from a TraceHop array.
    Each hop becomes a directed edge: hop.fromAddress → hop.toAddress
    Edge weight = usdValue (or amountEth * 3000 if usdValue missing)
    """
    G = nx.DiGraph()
    G.add_node(root_address, depth=0)

    for hop in hops:
        from_addr = hop.get("fromAddress", "")
        to_addr = hop.get("toAddress", "")
        usd = hop.get("usdValue") or (hop.get("amountEth", 0) * 3000)
        ts = hop.get("txTimestamp", "")
        depth = hop.get("hopIndex", 1)

        G.add_node(from_addr, depth=depth - 1)
        G.add_node(to_addr, depth=depth)
        G.add_edge(from_addr, to_addr, usd_value=usd, timestamp=ts)

    return G


def compute_graph_metrics(G: nx.DiGraph, hops: List[dict], victim_usd: float = 0) -> GraphMetrics:
    """
    Computes all topological metrics from a NetworkX DiGraph.
    This function is pure: no I/O, no side effects. Fully unit-testable.
    """
    node_count = G.number_of_nodes()
    edge_count = G.number_of_edges()

    if node_count == 0:
        return GraphMetrics(node_count=0, edge_count=0, ...)

    # Degree metrics
    out_degrees = [d for _, d in G.out_degree()]
    in_degrees = [d for _, d in G.in_degree()]
    max_fan_out = max(out_degrees) if out_degrees else 0
    max_fan_in = max(in_degrees) if in_degrees else 0
    avg_out = sum(out_degrees) / len(out_degrees) if out_degrees else 0.0

    # Topology classification
    is_linear = all(d <= 1 for d in out_degrees) and all(d <= 1 for d in in_degrees)
    is_star = max_fan_out >= 3 and all(
        G.out_degree(n) == 0 for n in G.successors(list(G.nodes)[0])
    )
    is_hourglass = max_fan_out >= 2 and max_fan_in >= 2

    # Velocity (seconds between consecutive hops)
    hop_times = []
    sorted_hops = sorted(hops, key=lambda h: h.get("hopIndex", 0))
    for i in range(1, len(sorted_hops)):
        try:
            t1 = datetime.fromisoformat(sorted_hops[i-1]["txTimestamp"].replace("Z", "+00:00")).timestamp()
            t2 = datetime.fromisoformat(sorted_hops[i]["txTimestamp"].replace("Z", "+00:00")).timestamp()
            hop_times.append(abs(t2 - t1))
        except Exception:
            pass

    avg_vel = sum(hop_times) / len(hop_times) if hop_times else 0.0
    min_vel = min(hop_times) if hop_times else 0.0
    max_vel = max(hop_times) if hop_times else 0.0

    # NetworkX centrality metrics
    degree_centrality = nx.degree_centrality(G)
    max_dc = max(degree_centrality.values()) if degree_centrality else 0.0
    betweenness = nx.betweenness_centrality(G)
    avg_bc = sum(betweenness.values()) / len(betweenness) if betweenness else 0.0

    # Clustering coefficient (undirected view)
    G_undirected = G.to_undirected()
    cc = nx.average_clustering(G_undirected) if node_count > 1 else 0.0

    # USD flow
    usd_values = [d.get("usd_value", 0) for _, _, d in G.edges(data=True)]
    total_usd = sum(usd_values)
    first_usd = usd_values[0] if usd_values else 0
    last_usd = usd_values[-1] if usd_values else 0
    decay = (first_usd - last_usd) / first_usd if first_usd > 0 else 0.0

    max_depth = max((d.get("depth", 0) for _, d in G.nodes(data=True)), default=0)

    return GraphMetrics(
        node_count=node_count,
        edge_count=edge_count,
        max_depth=max_depth,
        max_fan_out_degree=max_fan_out,
        max_fan_in_degree=max_fan_in,
        avg_out_degree=avg_out,
        fan_out_ratio=max_fan_out / 1.0,
        is_linear_chain=is_linear,
        is_star_topology=is_star,
        is_hourglass_topology=is_hourglass,
        is_cluster_topology=cc > 0.3 and not is_linear and not is_star,
        avg_hop_velocity_sec=avg_vel,
        min_hop_velocity_sec=min_vel,
        max_hop_velocity_sec=max_vel,
        max_degree_centrality=max_dc,
        avg_betweenness_centrality=avg_bc,
        clustering_coefficient=cc,
        total_usd_transacted=total_usd,
        value_decay_ratio=decay,
    )
```

---

### 4.3 Pillar 2: ML Risk Classifier (`ml_models/`)

#### 4.3.1 Training Dataset: Where to Get Data

The ML model requires labeled blockchain transaction traces — each labeled as `fraud` (1) or `legitimate` (0).

**Source 1 — Elliptic Bitcoin Dataset (Primary, Free, Academic)**
- **URL**: https://www.kaggle.com/datasets/ellipticco/elliptic-data-set
- **License**: Free for academic/research/competition use (Elliptic LLC)
- **Size**: 203,769 transactions, 49 features, 2 labels (illicit / licit / unknown)
- **Format**: 3 CSV files — `elliptic_txs_features.csv`, `elliptic_txs_edgelist.csv`, `elliptic_txs_classes.csv`
- **Download command**:
  ```bash
  # Requires Kaggle API key in ~/.kaggle/kaggle.json
  pip install kaggle
  kaggle datasets download -d ellipticco/elliptic-data-set -p services/risk/data/elliptic/
  ```
- **Usage Notes**: This is Bitcoin, not Ethereum — but the graph topology features (fan-out, velocity, chain depth) transfer directly. We use ONLY the topology/structural features (not Bitcoin-specific address features).

**Source 2 — Ethereum Fraud Detection Dataset (Secondary)**
- **URL**: https://www.kaggle.com/datasets/vagifa/ethereum-frauddetection-dataset
- **License**: Open (Community Data License)
- **Size**: 9,841 transactions labeled fraud/non-fraud on Ethereum mainnet
- **Features**: 50 columns including `Avg min between sent tnx`, `max value received`, `total Ether sent` (transaction-level features that map directly to our TraceHop data)
- **Download command**:
  ```bash
  kaggle datasets download -d vagifa/ethereum-frauddetection-dataset -p services/risk/data/eth_fraud/
  ```

**Source 3 — Synthetic Augmentation (Generated by training script)**
- `services/risk/data/synthetic_fraud.jsonl`: 500 synthetically generated fraud traces using known fraud patterns (rapid forwarding, peeling chains, burner wallets, fan-out to exchanges)
- `services/risk/data/synthetic_legit.jsonl`: 500 synthetically generated legitimate traces (single hops to known exchanges, slow velocity, high prior tx count at destination)
- These are generated by `ml_models/train.py` using configurable templates — no external API needed.

**Source 4 — Real Traced Cases (Ongoing — append during operation)**
- As investigations run through Vajra, confirmed fraud cases (from operator labeling) are appended to `services/risk/data/labeled_traces.jsonl` for continuous model improvement.
- Format: One JSON object per line, with `trace_hops`, `graph_metrics`, `label` (0 or 1), `label_source`.

#### 4.3.2 Feature Engineering (`ml_models/features.py`)

The feature vector combines outputs from the existing rule engine, the new graph analytics module, and raw hop statistics:

```python
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

# Total features: 28
FEATURE_COUNT = 28
```

```python
import numpy as np
from typing import List, Optional

def build_feature_vector(
    hops: List[dict],
    graph_metrics: GraphMetrics,
    terminal_type: str,
    destination_prior_tx_count: int,
    tree_data: Optional[dict] = None,
) -> np.ndarray:
    """
    Assembles the 28-dimensional feature vector for XGBoost inference.
    All features are numeric. Boolean features encoded as 0/1.
    """
    # Hop velocity
    timestamps = []
    for h in sorted(hops, key=lambda x: x.get("hopIndex", 0)):
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(h.get("txTimestamp","").replace("Z","+00:00"))
            timestamps.append(dt.timestamp())
        except:
            timestamps.append(0.0)

    diffs = [abs(timestamps[i] - timestamps[i-1]) for i in range(1, len(timestamps))]
    min_t = min(diffs) if diffs else 0.0
    max_t = max(diffs) if diffs else 0.0
    avg_t = sum(diffs)/len(diffs) if diffs else 0.0

    # Peeling chain
    is_peeling = 0
    for i in range(1, len(hops)):
        pv = hops[i-1].get("usdValue") or hops[i-1].get("amountEth",0)*3000
        cv = hops[i].get("usdValue") or hops[i].get("amountEth",0)*3000
        if pv > 0 and cv < 0.8 * pv:
            is_peeling = 1
            break

    # DEX routing
    KNOWN_DEX = {"0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
                 "0xe592427a0aece92de3edee1f18e0157c05861564"}
    is_dex = int(any(
        h.get("isInternalTx") and (h.get("toAddress","")).lower() in KNOWN_DEX
        for h in hops
    ))

    # Tree features
    tree = tree_data or {}
    total_branches = tree.get("totalBranches", 1)
    exchange_branches = tree.get("exchangeBranches", 0)
    taint_coverage = tree.get("taintCoveragePercent", 0.0)
    is_fan_out = int(tree.get("totalFanOutNodes", 0) > 0)
    is_fan_in = int(tree.get("totalFanInNodes", 0) > 0)

    vector = [
        len(hops),
        min_t,
        max_t,
        avg_t,
        1 if terminal_type == "exchange" else 0,
        destination_prior_tx_count,
        is_peeling,
        is_dex,
        graph_metrics.total_usd_transacted,
        graph_metrics.value_decay_ratio,
        graph_metrics.node_count,
        graph_metrics.edge_count,
        graph_metrics.max_fan_out_degree,
        graph_metrics.max_fan_in_degree,
        graph_metrics.avg_out_degree,
        graph_metrics.max_degree_centrality,
        graph_metrics.avg_betweenness_centrality,
        graph_metrics.clustering_coefficient,
        int(graph_metrics.is_linear_chain),
        int(graph_metrics.is_star_topology),
        int(graph_metrics.is_hourglass_topology),
        graph_metrics.max_hop_velocity_sec,
        graph_metrics.min_hop_velocity_sec,
        total_branches,
        exchange_branches,
        taint_coverage,
        is_fan_out,
        is_fan_in,
    ]

    return np.array(vector, dtype=np.float32)
```

#### 4.3.3 ML Model: XGBoost Classifier (`ml_models/classifier.py`)

```python
import xgboost as xgb
import shap
import joblib
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple

MODEL_PATH = Path(__file__).parent / "artifacts" / "vajra_fraud_classifier_v1.pkl"
FEATURE_NAMES_PATH = Path(__file__).parent / "artifacts" / "feature_names.json"

class FraudClassifier:
    """
    Lazy-loading XGBoost fraud probability classifier with SHAP explainability.
    Model is loaded once on first call; subsequent calls use cached instance.
    """
    _model: xgb.XGBClassifier = None
    _explainer: shap.TreeExplainer = None
    _feature_names: List[str] = None

    @classmethod
    def load(cls):
        if cls._model is None:
            if not MODEL_PATH.exists():
                raise FileNotFoundError(
                    f"Model artifact not found at {MODEL_PATH}. "
                    "Run `python ml_models/train.py` to train and save the model."
                )
            cls._model = joblib.load(MODEL_PATH)
            cls._explainer = shap.TreeExplainer(cls._model)
            import json
            cls._feature_names = json.loads(FEATURE_NAMES_PATH.read_text())

    @classmethod
    def predict(cls, feature_vector: np.ndarray) -> Tuple[float, List[Dict]]:
        """
        Returns:
            fraud_probability: float (0.0 – 1.0)
            feature_importance: List[{name, shap_value, direction}]
        """
        cls.load()
        X = feature_vector.reshape(1, -1)
        prob = float(cls._model.predict_proba(X)[0][1])  # P(fraud)

        shap_values = cls._explainer.shap_values(X)[0]

        importance = []
        for i, (name, shap_val) in enumerate(zip(cls._feature_names, shap_values)):
            importance.append({
                "feature": name,
                "shap_value": float(shap_val),
                "direction": "increases_risk" if shap_val > 0 else "reduces_risk",
                "raw_value": float(feature_vector[i]),
            })

        # Sort by absolute SHAP value (most impactful first)
        importance.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return prob, importance[:10]  # Return top 10 most impactful features


def probability_to_risk_level(prob: float) -> str:
    """Maps continuous probability to categorical risk level."""
    if prob < 0.25:   return "low"
    if prob < 0.55:   return "medium"
    if prob < 0.80:   return "high"
    return "critical"
```

#### 4.3.4 Model Training Script (`ml_models/train.py`)

This is an **offline script** — run once before deployment to train and serialize the model artifact.

```python
"""
train.py — Offline training script for Vajra Fraud Classifier v1
Run: python ml_models/train.py

Outputs:
  ml_models/artifacts/vajra_fraud_classifier_v1.pkl
  ml_models/artifacts/feature_names.json
"""

import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score

from features import FEATURE_NAMES, build_feature_vector

DATA_DIR = Path(__file__).parent.parent / "data"
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)


def load_kaggle_ethereum_dataset() -> pd.DataFrame:
    """
    Loads the Kaggle Ethereum Fraud Detection Dataset.
    Maps its feature names to our 28-feature vector format.
    Expected file: services/risk/data/eth_fraud/transaction_dataset.csv
    """
    csv_path = DATA_DIR / "eth_fraud" / "transaction_dataset.csv"
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {csv_path}. "
            "Run: kaggle datasets download -d vagifa/ethereum-frauddetection-dataset "
            "-p services/risk/data/eth_fraud/"
        )

    df = pd.read_csv(csv_path)
    # Drop rows with NaN labels
    df = df[df["FLAG"].isin([0, 1])].dropna(subset=["FLAG"])

    # Map Kaggle columns to our feature names
    # This mapping is approximate — Kaggle dataset uses transaction-level agg features
    X_mapped = pd.DataFrame({
        "hop_count":              df.get("Sent tnx", df.get("sent_tnx", 1)),
        "min_time_between_hops_sec": df.get("min value sent to contract", 0),
        "max_time_between_hops_sec": df.get("max val sent to contract", 0),
        "avg_time_between_hops_sec": df.get("avg val sent to contract", 0),
        "terminal_is_exchange":   0,   # Unknown from dataset
        "destination_prior_tx_count": df.get("Received Tnx", 0),
        "is_peeling_chain":       0,
        "is_dex_routed":          0,
        "total_usd_transacted":   df.get("total Ether sent", 0),
        "value_decay_ratio":      0.0,
        "node_count":             df.get("Sent tnx", 1),
        "edge_count":             df.get("Sent tnx", 1),
        "max_fan_out_degree":     1,
        "max_fan_in_degree":      1,
        "avg_out_degree":         1.0,
        "max_degree_centrality":  0.5,
        "avg_betweenness_centrality": 0.0,
        "clustering_coefficient": 0.0,
        "is_linear_chain":        1,
        "is_star_topology":       0,
        "is_hourglass_topology":  0,
        "max_hop_velocity_sec":   df.get("Avg min between sent tnx", 0) * 60,
        "min_hop_velocity_sec":   df.get("Avg min between sent tnx", 0) * 60,
        "total_branches":         1,
        "exchange_branches":      0,
        "taint_coverage_percent": 0.0,
        "is_fan_out_detected":    0,
        "is_fan_in_detected":     0,
    })
    y = df["FLAG"].astype(int)
    return X_mapped, y


def load_synthetic_data() -> tuple:
    """Loads synthetic fraud/legit JSONL files."""
    X_rows, y_rows = [], []
    for path, label in [
        (DATA_DIR / "synthetic_fraud.jsonl", 1),
        (DATA_DIR / "synthetic_legit.jsonl", 0),
    ]:
        if path.exists():
            with open(path) as f:
                for line in f:
                    row = json.loads(line)
                    X_rows.append(row["features"])
                    y_rows.append(label)
    if not X_rows:
        return None, None
    return pd.DataFrame(X_rows, columns=FEATURE_NAMES), pd.Series(y_rows)


def train():
    print("Loading Ethereum fraud dataset...")
    X_eth, y_eth = load_kaggle_ethereum_dataset()

    X_syn, y_syn = load_synthetic_data()
    if X_syn is not None:
        print(f"Loading {len(X_syn)} synthetic samples...")
        X = pd.concat([X_eth, X_syn], ignore_index=True)
        y = pd.concat([y_eth, y_syn], ignore_index=True)
    else:
        X, y = X_eth, y_eth

    print(f"Total training samples: {len(X)} | Fraud: {y.sum()} | Legit: {(y==0).sum()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(y == 0).sum() / (y == 1).sum(),  # Handle class imbalance
        random_state=42,
        use_label_encoder=False,
        eval_metric="logloss",
    )

    print("Training XGBoost model...")
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=50)

    # Evaluation
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    print("\n=== Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=["Legitimate", "Fraud"]))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="roc_auc")
    print(f"5-Fold CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save artifacts
    joblib.dump(model, ARTIFACTS_DIR / "vajra_fraud_classifier_v1.pkl")
    json.dump(FEATURE_NAMES, open(ARTIFACTS_DIR / "feature_names.json", "w"))
    print(f"\nModel saved to {ARTIFACTS_DIR}/vajra_fraud_classifier_v1.pkl")


if __name__ == "__main__":
    train()
```

#### 4.3.5 ML Score Response Contract

```python
class FeatureImportanceItem(BaseModel):
    feature: str                    # Feature name
    shap_value: float               # SHAP value (positive = increases risk)
    direction: str                  # "increases_risk" | "reduces_risk"
    raw_value: float                # Actual feature value for this trace

class MLScoreResponse(BaseModel):
    ml_score: float                 # Continuous 0–100 risk score
    fraud_probability: float        # Raw model output: P(fraud) 0.0–1.0
    risk_level: str                 # "low" | "medium" | "high" | "critical"
    confidence: str                 # "high" | "medium" | "low" (based on model certainty)
    feature_importance: List[FeatureImportanceItem]  # Top 10 SHAP features
    model_version: str              # "vajra_fraud_classifier_v1"
    fallback_used: bool             # True if ML model failed and rule engine was used
```

**Model Confidence Mapping:**
| P(fraud) | Confidence |
|----------|------------|
| P < 0.15 or P > 0.85 | `"high"` — model is certain |
| 0.15 ≤ P ≤ 0.40 or 0.60 ≤ P ≤ 0.85 | `"medium"` — moderate certainty |
| 0.40 < P < 0.60 | `"low"` — model is uncertain (near decision boundary) |

---

### 4.4 Pillar 3: LLM Case Narrative Generator (`llm_narrative/generator.py`)

#### 4.4.1 LLM Provider Strategy

| Priority | Provider | Model | Requires |
|----------|----------|-------|---------|
| 1 (Primary) | Google Gemini | `gemini-2.0-flash` | `GEMINI_API_KEY` in `.env` |
| 2 (Fallback) | Ollama (local) | `llama3.2:3b` | Ollama running on `localhost:11434` |
| 3 (Degraded) | Template engine | Static Python template | No external dependency |

The generator attempts providers in order. If Gemini fails (API key missing or quota exceeded), it tries Ollama. If Ollama is not running, it falls back to a deterministic Python-template-based narrative that fills in the key facts without LLM generation.

#### 4.4.2 Prompt Engineering

The narrative prompt is structured and deterministic — the same trace data always produces the same prompt, ensuring reproducibility for court submissions.

```python
NARRATIVE_PROMPT_TEMPLATE = """
You are an expert blockchain forensics analyst preparing an investigative case summary for submission to a law enforcement agency (LEA) in India. Write a professional, factual, 3-paragraph executive summary based on the following on-chain trace findings.

DO NOT invent any information not present in the data below. Use formal investigative language. Do not use casual language.

=== INVESTIGATION DATA ===
Suspect Wallet Address: {wallet_address}
Investigation Date: {investigation_date}
Targeted Asset: {target_asset}
Victim Reported Loss: {victim_amount_usd} USD
Victim Transaction Reference: {victim_tx_hash}

Chain of Custody (Fund Flow):
{hop_chain_text}

Fund Flow Graph Metrics:
- Total Nodes in Flow Network: {node_count}
- Total Value Transacted: ${total_usd:,.2f} USD
- Fastest Hop Transfer: {min_velocity} seconds
- Maximum Fan-Out (Splitting): {max_fan_out} branches
- Graph Topology: {topology_type}
- Taint Coverage: {taint_coverage}% of reported victim funds traced

AI Risk Assessment:
- Risk Score: {ml_score}/100
- Risk Level: {risk_level}
- Top Risk Indicators: {top_indicators}

=== FORMAT INSTRUCTIONS ===
Write exactly 3 paragraphs:
Paragraph 1 (Factual Summary): State the wallet address, the date of the incident, the reported stolen amount, and a factual summary of how funds moved through the chain of custody — hop by hop.
Paragraph 2 (Pattern Analysis): Describe the money laundering technique observed (e.g., layering through multiple wallets, fund splitting/fan-out, rapid forwarding to an exchange). Explain what each risk indicator means in plain language.
Paragraph 3 (Investigative Recommendation): State which exchange(s) or final wallet(s) the funds reached, the taint coverage percentage, and recommend that LEA issue formal data disclosure requests to the identified exchanges under applicable law (Section 91 CrPC / IT Act 2000).
"""
```

#### 4.4.3 Generator Implementation (`llm_narrative/generator.py`)

```python
import os
import json
import requests
from datetime import datetime
from string import Template
from typing import Optional

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


def build_hop_chain_text(hops: list) -> str:
    """Formats hop array into readable chain-of-custody text."""
    lines = []
    for hop in hops:
        asset = hop.get("tokenSymbol") or "ETH"
        amount = hop.get("tokenAmount") or hop.get("amountEth", 0)
        usd = hop.get("usdValue", 0)
        ts = hop.get("txTimestamp", "unknown")[:10]
        lines.append(
            f"Hop {hop.get('hopIndex', '?')}: {hop.get('fromAddress','?')[:10]}... "
            f"→ {hop.get('toAddress','?')[:10]}... | "
            f"{amount:.4f} {asset} (~${usd:,.2f} USD) | {ts}"
        )
    return "\n".join(lines)


def build_prompt(
    wallet_address: str,
    hops: list,
    graph_metrics: dict,
    ml_score: float,
    risk_level: str,
    top_indicators: list,
    victim_tx_hash: str = "N/A",
    victim_amount_usd: float = 0.0,
    target_asset: str = "ETH",
) -> str:
    topology = "Linear Chain"
    if graph_metrics.get("is_star_topology"): topology = "Star (Hub-and-Spoke)"
    if graph_metrics.get("is_hourglass_topology"): topology = "Hourglass (Fan-Out then Fan-In)"

    return NARRATIVE_PROMPT_TEMPLATE.format(
        wallet_address=wallet_address,
        investigation_date=datetime.utcnow().strftime("%B %d, %Y"),
        target_asset=target_asset,
        victim_amount_usd=f"{victim_amount_usd:,.2f}",
        victim_tx_hash=victim_tx_hash,
        hop_chain_text=build_hop_chain_text(hops),
        node_count=graph_metrics.get("node_count", 0),
        total_usd=graph_metrics.get("total_usd_transacted", 0.0),
        min_velocity=int(graph_metrics.get("min_hop_velocity_sec", 0)),
        max_fan_out=graph_metrics.get("max_fan_out_degree", 1),
        topology_type=topology,
        taint_coverage=graph_metrics.get("taint_coverage_percent", 0),
        ml_score=int(ml_score),
        risk_level=risk_level.upper(),
        top_indicators=", ".join(top_indicators[:5]),
    )


def generate_narrative(prompt: str) -> str:
    """Tries Gemini → Ollama → Template fallback."""

    # Primary: Gemini Flash
    api_key = os.getenv("GEMINI_API_KEY")
    if GEMINI_AVAILABLE and api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[LLM] Gemini failed: {e}. Trying Ollama...")

    # Secondary: Ollama local
    try:
        resp = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2:3b", "prompt": prompt, "stream": False},
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json().get("response", "").strip()
    except Exception as e:
        print(f"[LLM] Ollama failed: {e}. Using template fallback.")

    # Tertiary: Deterministic template
    return generate_template_narrative(prompt)


def generate_template_narrative(prompt: str) -> str:
    """Returns a deterministic narrative when no LLM is available."""
    # Extracts key values from prompt for template fill-in
    # Returns a pre-written 3-paragraph investigative summary
    return (
        "Paragraph 1 — Fund Flow Summary: [Template narrative: LLM unavailable. "
        "Please set GEMINI_API_KEY in .env or start Ollama locally.] "
        "The on-chain trace has been completed and detailed hop data is available in the Traced Hops table above.\n\n"
        "Paragraph 2 — Pattern Analysis: The risk scoring engine has analyzed the fund flow "
        "topology and identified the indicators listed in the Risk Assessment card above.\n\n"
        "Paragraph 3 — Investigative Recommendation: Law enforcement is advised to review the "
        "VASP Attribution result above and issue appropriate data disclosure requests to the "
        "identified exchange(s) under Section 91 CrPC / IT Act 2000."
    )
```

#### 4.4.4 Narrative API Contract

```python
class NarrativeRequest(BaseModel):
    wallet_address: str
    trace_hops: List[dict]
    graph_metrics: dict
    ml_score: float
    risk_level: str
    top_indicators: List[str]
    victim_tx_hash: Optional[str] = None
    victim_amount_usd: Optional[float] = 0.0
    target_asset: Optional[str] = "ETH"

class NarrativeResponse(BaseModel):
    narrative: str                  # Full 3-paragraph investigative summary text
    generated_by: str               # "gemini-2.0-flash" | "ollama/llama3.2" | "template"
    generated_at: str               # ISO timestamp
    word_count: int                 # For UI display
```

---

### 4.5 Updated `main.py` FastAPI Endpoints

```python
from fastapi import FastAPI, HTTPException
from rules import RiskScoreRequest, score_risk
from graph_analytics.network_metrics import build_digraph_from_hops, compute_graph_metrics, GraphMetricsRequest
from ml_models.classifier import FraudClassifier, probability_to_risk_level
from ml_models.features import build_feature_vector
from llm_narrative.generator import build_prompt, generate_narrative

@app.post("/risk/score")
def compute_risk_score(request: RiskScoreRequest):
    """
    Master scoring endpoint. Runs:
      1. Rule engine (fast, always available)
      2. Graph analytics (always available — pure NetworkX)
      3. ML classifier (if model artifact exists)
      4. LLM narrative (if GEMINI_API_KEY set or Ollama running)
    Returns combined response.
    """
    # Step 1: Rule engine (existing — always runs as baseline)
    rule_result = score_risk(request)

    # Step 2: Graph Analytics
    hops_raw = [h.model_dump(by_alias=True) for h in request.trace_hops]
    G = build_digraph_from_hops(hops_raw, root_address=hops_raw[0]["fromAddress"] if hops_raw else "unknown")
    graph_metrics = compute_graph_metrics(G, hops_raw)

    # Step 3: ML Classifier (graceful fallback)
    ml_score, feature_importance, fallback_used = None, [], True
    try:
        fv = build_feature_vector(
            hops_raw,
            graph_metrics,
            terminal_type=request.terminal_type,
            destination_prior_tx_count=request.destination_wallet_prior_tx_count,
            tree_data=None,
        )
        fraud_prob, feature_importance = FraudClassifier.predict(fv)
        ml_score = round(fraud_prob * 100, 1)
        ml_risk_level = probability_to_risk_level(fraud_prob)
        fallback_used = False
    except FileNotFoundError:
        # Model not yet trained — use rule engine score
        ml_score = rule_result.score
        ml_risk_level = rule_result.risk_level
        fallback_used = True

    # Step 4: LLM Narrative (non-blocking — empty string if all providers fail)
    narrative, generated_by = "", "none"
    try:
        prompt = build_prompt(
            wallet_address=hops_raw[0]["fromAddress"] if hops_raw else "unknown",
            hops=hops_raw,
            graph_metrics=graph_metrics.model_dump(),
            ml_score=ml_score,
            risk_level=ml_risk_level,
            top_indicators=[i["feature"] for i in feature_importance[:5]],
        )
        narrative = generate_narrative(prompt)
        generated_by = os.getenv("LLM_PROVIDER", "gemini-2.0-flash")
    except Exception:
        narrative = ""

    # Return combined response
    return {
        # Existing fields (backwards-compatible with E1/E2)
        "riskLevel": ml_risk_level,
        "score": ml_score,
        "indicators": rule_result.indicators,
        "reason": rule_result.reason,
        "featuresUsed": rule_result.features_used.model_dump(by_alias=True),

        # Phase E3 new fields
        "graphMetrics": graph_metrics.model_dump(),
        "mlScore": ml_score,
        "fraudProbability": round(fraud_prob, 4) if not fallback_used else None,
        "featureImportance": feature_importance,
        "mlModelVersion": "vajra_fraud_classifier_v1" if not fallback_used else None,
        "mlFallbackUsed": fallback_used,
        "aiNarrative": narrative,
        "narrativeGeneratedBy": generated_by,
    }


@app.post("/risk/graph-metrics", response_model=GraphMetricsResponse)
def get_graph_metrics(request: GraphMetricsRequest):
    """Standalone graph metrics endpoint — used by frontend to show metrics without re-scoring."""
    G = build_digraph_from_hops(request.trace_hops, request.root_address)
    metrics = compute_graph_metrics(G, request.trace_hops)
    return GraphMetricsResponse(root_address=request.root_address, metrics=metrics)


@app.post("/risk/narrative", response_model=NarrativeResponse)
def regenerate_narrative(request: NarrativeRequest):
    """Standalone narrative regeneration endpoint — allows re-generating without re-tracing."""
    prompt = build_prompt(**request.model_dump())
    narrative_text = generate_narrative(prompt)
    return NarrativeResponse(
        narrative=narrative_text,
        generated_by=os.getenv("LLM_PROVIDER", "template"),
        generated_at=datetime.utcnow().isoformat() + "Z",
        word_count=len(narrative_text.split()),
    )
```

---

### 4.6 TypeScript Type Contract Changes (`packages/types/src/index.ts`)

```typescript
/** Phase E3: Graph Topology Metrics from NetworkX */
export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  maxFanOutDegree: number;
  maxFanInDegree: number;
  avgOutDegree: number;
  fanOutRatio: number;
  isLinearChain: boolean;
  isStarTopology: boolean;
  isHourglassTopology: boolean;
  isClusterTopology: boolean;
  avgHopVelocitySec: number;
  minHopVelocitySec: number;
  maxHopVelocitySec: number;
  maxDegreeCentrality: number;
  avgBetweennessCentrality: number;
  clusteringCoefficient: number;
  totalUsdTransacted: number;
  valueDecayRatio: number;
}

/** Phase E3: SHAP feature importance entry */
export interface FeatureImportanceItem {
  feature: string;
  shapValue: number;
  direction: 'increases_risk' | 'reduces_risk';
  rawValue: number;
}

/** Phase E3: Extended risk score response */
export interface RiskScoreResponse {
  // Existing E1/E2 fields (unchanged)
  riskLevel: RiskLevel;
  score?: number;
  indicators?: string[];
  reason: string;
  featuresUsed?: TraceFeatures;

  // Phase E3 new fields
  graphMetrics?: GraphMetrics;
  mlScore?: number;
  fraudProbability?: number;
  featureImportance?: FeatureImportanceItem[];
  mlModelVersion?: string;
  mlFallbackUsed?: boolean;
  aiNarrative?: string;
  narrativeGeneratedBy?: string;
}
```

---

### 4.7 Frontend UI Changes (`apps/web/src/`)

#### 4.7.1 New Component: `MLRiskGauge.tsx`

A circular gauge (arc) component displaying the continuous ML risk score (0–100):

```
           ┌──────────────────────┐
           │   🤖 ML Risk Score   │
           │                      │
           │        ┌─────┐       │
           │       /  87  \       │
           │      │ /100  │       │
           │       \  ██  /       │
           │        └─────┘       │
           │    HIGH RISK 🔴       │
           │  Confidence: HIGH    │
           │ Model: XGBoost v1    │
           └──────────────────────┘
```

Implementation: SVG arc gauge rendered with inline `<svg>` — no external charting library needed. Arc fill animates from 0 to the score value on mount.

#### 4.7.2 New Component: `GraphMetricsCard.tsx`

A card displaying all NetworkX topological metrics in a structured grid:

```
┌─────────────────────────────────────────────────────┐
│  📊 Fund Flow Graph Analytics                        │
├──────────────────┬──────────────────────────────────┤
│  Network Size    │  Nodes: 8    Edges: 7             │
│  Topology        │  🔗 Linear Chain                  │
│  Max Fan-Out     │  2 branches                       │
│  Clustering      │  0.12 (low)                       │
├──────────────────┼──────────────────────────────────┤
│  Velocity        │  Avg: 42 sec between hops        │
│                  │  Min: 8 sec  Max: 180 sec         │
├──────────────────┼──────────────────────────────────┤
│  Value Flow      │  Total: $12,450 USD               │
│  Decay Ratio     │  18.2% value lost in hops         │
└──────────────────┴──────────────────────────────────┘
```

#### 4.7.3 New Component: `FeatureImportanceChart.tsx`

A horizontal bar chart of the top-10 SHAP feature importance values:

```
Feature Importance (SHAP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
hop_count               🔴 +0.42 ████████░░░
min_hop_velocity_sec    🔴 +0.38 ███████░░░░
is_peeling_chain        🔴 +0.31 ██████░░░░░
destination_prior_tx    🟢 -0.29 █████░░░░░░  (reduces risk)
max_fan_out_degree      🔴 +0.21 ████░░░░░░░
clustering_coefficient  🟢 -0.15 ███░░░░░░░░
...
```

Red bars = increases fraud risk, Green bars = reduces fraud risk.

#### 4.7.4 New Component: `AINarrativeCard.tsx`

An expandable card displaying the AI-generated 3-paragraph narrative:

```
┌──────────────────────────────────────────────────────────┐
│  🤖 AI-Generated Investigative Summary    [Expand ▼]     │
│  Generated by: Gemini Flash | Words: 247 | Aug 27, 2026  │
├──────────────────────────────────────────────────────────┤
│  Paragraph 1 — Fund Flow Summary:                        │
│  On August 27, 2026, the wallet 0x4585fe... initiated    │
│  a transfer of 77.22 WETH (~$230,000 USD) to wallet      │
│  0xbdb3ba... which subsequently split the funds across   │
│  three intermediary wallets within 45 seconds...          │
│                                                           │
│  Paragraph 2 — Pattern Analysis:                         │
│  The fund flow exhibits a classic layering pattern...     │
│                                                           │
│  Paragraph 3 — Investigative Recommendation:             │
│  LEA is advised to issue formal data disclosure          │
│  requests to Coinbase and Binance identifying deposits   │
│  within the 6-hour window following the incident...      │
│                                                           │
│  [📋 Copy Narrative]  [🔄 Regenerate]  [📥 Add to PDF]  │
└──────────────────────────────────────────────────────────┘
```

Key actions:
- **Copy Narrative**: Copies raw text to clipboard for direct paste into FIR document.
- **Regenerate**: Calls `POST /risk/narrative` to re-generate without re-running the full trace.
- **Add to PDF**: Injects the narrative into the PDF legal report as a dedicated section.

#### 4.7.5 Updated `ResultsPage.tsx` Layout

The Risk Assessment section expands from a single card to a 3-section layout:

```
BEFORE (E1/E2):                    AFTER (E3):
┌─────────────────┐                ┌──────────────┬──────────────┐
│ Risk Assessment │                │ ML Risk      │ Graph        │
│ HIGH RISK       │                │ Score Gauge  │ Analytics    │
│ Score: 82/100   │   ──────────▶  │ 87/100 🔴   │ Card         │
│ [Indicators]    │                ├──────────────┴──────────────┤
│ [Rule Reason]   │                │ Feature Importance Chart    │
└─────────────────┘                ├─────────────────────────────┤
                                   │ AI Investigative Narrative  │
                                   └─────────────────────────────┘
```

---

### 5. Environment Variables

Add the following to `.env.example` and `apps/api/.env`:

```env
# Phase E3: LLM Narrative Generator
GEMINI_API_KEY=                    # Get from: https://aistudio.google.com/app/apikey
                                   # Free tier: 1,500 requests/day, 32,000 tokens/min
                                   # If empty: Ollama fallback is used automatically

# Phase E3: Optional Ollama (local LLM)
OLLAMA_BASE_URL=http://localhost:11434  # Default Ollama server (local)
OLLAMA_MODEL=llama3.2:3b               # Model to use (pull with: ollama pull llama3.2:3b)
```

**Gemini API Key Setup:**
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key and paste into `.env` as `GEMINI_API_KEY=your_key_here`
4. Free tier is sufficient for demo purposes (1,500 requests/day)

**Ollama Setup (optional local fallback):**
```bash
# Install Ollama (Windows)
winget install Ollama.Ollama

# Pull the model (runs locally, no API key needed)
ollama pull llama3.2:3b

# Start Ollama (auto-starts as service on Windows)
ollama serve
```

---

### 6. Training Data Setup (Step-by-Step)

#### Step 1: Install Kaggle CLI
```bash
pip install kaggle
```

#### Step 2: Setup Kaggle API Key
1. Go to https://www.kaggle.com/account → API → Create New API Token
2. Download `kaggle.json` to `C:\Users\<username>\.kaggle\kaggle.json`

#### Step 3: Download Datasets
```bash
# Primary Ethereum fraud dataset
kaggle datasets download -d vagifa/ethereum-frauddetection-dataset -p services/risk/data/eth_fraud/
cd services/risk/data/eth_fraud
tar -xzf ethereum-frauddetection-dataset.zip

# Optional: Elliptic Bitcoin dataset (for supplementary topology features)
kaggle datasets download -d ellipticco/elliptic-data-set -p services/risk/data/elliptic/
```

#### Step 4: Generate Synthetic Data
```bash
cd services/risk
.\.venv\Scripts\python ml_models/generate_synthetic.py
# Outputs: data/synthetic_fraud.jsonl (500 samples) + data/synthetic_legit.jsonl (500 samples)
```

#### Step 5: Train the Model
```bash
.\.venv\Scripts\python ml_models/train.py
# Expected output:
#   ROC-AUC: 0.92–0.96
#   Saved: ml_models/artifacts/vajra_fraud_classifier_v1.pkl
```

---

### 7. Unit Tests to Write

| File | Test Name | Expected Behaviour |
|------|-----------|-------------------|
| `tests/test_graph_analytics.py` | `test_linear_chain_topology` | `is_linear_chain=True`, `max_fan_out_degree=1` for a 5-hop linear trace |
| `tests/test_graph_analytics.py` | `test_star_topology_detection` | `is_star_topology=True` when root sends to 4 leaves |
| `tests/test_graph_analytics.py` | `test_hourglass_topology_detection` | `is_hourglass_topology=True` for fan-out-then-fan-in pattern |
| `tests/test_graph_analytics.py` | `test_velocity_computation` | `avg_hop_velocity_sec` matches manual calculation from timestamps |
| `tests/test_graph_analytics.py` | `test_empty_hops_returns_zero_metrics` | No exceptions, all metrics = 0 for empty hop array |
| `tests/test_ml_classifier.py` | `test_feature_vector_shape` | `build_feature_vector()` returns array of shape `(28,)` |
| `tests/test_ml_classifier.py` | `test_high_risk_trace_scores_above_60` | A 5-hop rapid-forwarding trace scores ≥ 60 |
| `tests/test_ml_classifier.py` | `test_low_risk_trace_scores_below_30` | A 1-hop direct-to-exchange trace scores ≤ 30 |
| `tests/test_ml_classifier.py` | `test_model_fallback_when_artifact_missing` | Returns rule engine score when `.pkl` not found |
| `tests/test_llm_narrative.py` | `test_template_fallback_returns_3_paragraphs` | Template fallback returns string with 3 paragraph markers |
| `tests/test_llm_narrative.py` | `test_prompt_contains_wallet_address` | Built prompt contains the suspect wallet address |
| `tests/test_llm_narrative.py` | `test_hop_chain_text_format` | `build_hop_chain_text()` returns `Hop N: addr → addr` format |

### 7.1 Regression Tests (Must Still Pass)
- All 6 existing `test_rules.py` pytest tests must pass.
- All 5 existing `tracer.test.ts` blockchain tracer tests must pass.

---

### 8. File Change Summary

| File | Type | Change Description |
|------|------|--------------------|
| `packages/types/src/index.ts` | MODIFY | Add `GraphMetrics`, `FeatureImportanceItem`; extend `RiskScoreResponse` |
| `services/risk/requirements.txt` | MODIFY | Add networkx, xgboost, scikit-learn, shap, joblib, google-generativeai, pandas, numpy |
| `services/risk/main.py` | MODIFY | Add `/risk/graph-metrics` and `/risk/narrative` endpoints; extend `/risk/score` response |
| `services/risk/graph_analytics/__init__.py` | NEW | Package init |
| `services/risk/graph_analytics/network_metrics.py` | NEW | NetworkX DiGraph builder + topological metric extractor |
| `services/risk/ml_models/__init__.py` | NEW | Package init |
| `services/risk/ml_models/features.py` | NEW | 28-feature vector assembler (`FEATURE_NAMES` + `build_feature_vector()`) |
| `services/risk/ml_models/classifier.py` | NEW | XGBoost lazy-loader + SHAP explainer + `probability_to_risk_level()` |
| `services/risk/ml_models/train.py` | NEW | Offline training script (Kaggle dataset loader + model training + artifact export) |
| `services/risk/ml_models/generate_synthetic.py` | NEW | Synthetic fraud/legit trace generator for data augmentation |
| `services/risk/ml_models/artifacts/.gitkeep` | NEW | Placeholder (`.pkl` artifacts are `.gitignore`d) |
| `services/risk/llm_narrative/__init__.py` | NEW | Package init |
| `services/risk/llm_narrative/generator.py` | NEW | Gemini → Ollama → template fallback narrative generator |
| `services/risk/data/README.md` | NEW | Dataset provenance, download instructions, source citations |
| `services/risk/tests/test_graph_analytics.py` | NEW | 5 graph analytics unit tests |
| `services/risk/tests/test_ml_classifier.py` | NEW | 4 ML classifier unit tests |
| `services/risk/tests/test_llm_narrative.py` | NEW | 3 LLM narrative unit tests |
| `apps/api/src/routes/investigations.ts` | MODIFY | Parse `graphMetrics`, `featureImportance`, `aiNarrative` from risk service; include in API response |
| `apps/web/src/components/MLRiskGauge.tsx` | NEW | SVG circular arc gauge for ML score display |
| `apps/web/src/components/GraphMetricsCard.tsx` | NEW | NetworkX topology metrics display card |
| `apps/web/src/components/FeatureImportanceChart.tsx` | NEW | Horizontal SHAP importance bar chart |
| `apps/web/src/components/AINarrativeCard.tsx` | NEW | Expandable AI narrative with Copy / Regenerate / Add to PDF actions |
| `apps/web/src/pages/ResultsPage.tsx` | MODIFY | Integrate 4 new E3 components into results layout |
| `apps/web/src/utils/PdfExporter.ts` | MODIFY | Add AI Narrative section to PDF report |
| `.env.example` | MODIFY | Add `GEMINI_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| `README.md` | MODIFY | Add Phase E3 setup instructions (Gemini API key, dataset download, model training) |

---

### 9. Git Commit Strategy for Phase E3

```
Commit 1: feat(types): add GraphMetrics, FeatureImportanceItem, extend RiskScoreResponse for E3
Commit 2: feat(risk/graph): add NetworkX DiGraph builder and topological metric extractor
Commit 3: feat(risk/ml): add XGBoost feature engineering, classifier, SHAP explainability
Commit 4: feat(risk/ml): add offline training script with Kaggle Ethereum dataset loader
Commit 5: feat(risk/llm): add Gemini → Ollama → template narrative generator
Commit 6: feat(risk/api): extend /risk/score endpoint with graph metrics, ML score, and narrative
Commit 7: feat(web): add MLRiskGauge, GraphMetricsCard, FeatureImportanceChart, AINarrativeCard
Commit 8: feat(web): integrate E3 components into ResultsPage and PdfExporter
```

---

## 10. Presentable Milestone Deliverable (End of Phase E3)

At the end of Phase E3, the RT-CFAS dashboard **must** demonstrate all of the following:

1. ✅ A **circular ML Risk Score gauge** displaying a continuous 0–100 score (not a binary HIGH/LOW) with confidence level label.
2. ✅ A **Graph Analytics card** showing node count, topology type, fan-out degree, average hop velocity, and clustering coefficient.
3. ✅ A **Feature Importance bar chart** showing the top-10 SHAP features in red/green, explaining why the ML model made its decision.
4. ✅ An **AI-generated 3-paragraph investigative narrative** in formal language, with Copy / Regenerate / Add to PDF actions.
5. ✅ The narrative is generated by **Gemini Flash** (or Ollama fallback) and correctly references the actual trace data (wallet address, hop amounts, timestamps).
6. ✅ The **PDF Legal Report** includes the AI narrative as a dedicated "Automated Investigative Summary" section.
7. ✅ The XGBoost model returns a **calibrated probability score** that is directionally correct: rapid multi-hop traces score higher than direct single-hop-to-exchange traces.
8. ✅ When the ML model artifact is not found, the system **gracefully falls back** to the existing rule engine score without crashing or returning an error to the UI.
9. ✅ All 12 new unit tests pass. All 11 existing unit tests (6 rule tests + 5 tracer tests) pass.
10. ✅ All existing Phase E1 and E2 features (token badges, 2-step asset selector, TLFT engine, multi-branch tree canvas, branch summary table) continue working with zero regression.
