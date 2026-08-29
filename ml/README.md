# Vajra AI/ML Training & Forensic Intelligence Pipeline (Phase E3)

This directory provides the complete machine learning training infrastructure for the **Real-Time Crypto Fraud Attribution System (Vajra / RT-CFAS)**.

---

## 1. Primary Dataset Strategy: Real-World Blockchain Evidence First

To ensure maximum forensic accuracy and credibility for Law Enforcement Agencies (LEAs) and hackathon judges, our AI/ML model prioritizes **Real-World On-Chain Evidence** as its primary training data:

### Real-World Data Sources

1. **The Elliptic Dataset (MIT / IBM Watson / Elliptic)**:
   - **Content**: 203,769 real on-chain transaction nodes with 234,111 directed graph edges.
   - **Ground-Truth Labels**: `illicit` (scams, ransomware, darknet, phishing) vs. `licit` (exchanges, verified merchants, miners).
   - **Acquisition**: Download free from [Kaggle: Elliptic Data Set](https://www.kaggle.com/datasets/ellipticco/elliptic-data-set).

2. **Etherscan Public Phishing & Malicious Address Registries**:
   - **Content**: Over 10,000 real reported scam and phishing contracts/wallets tagged by cybersecurity firms and victims.
   - **Acquisition**:
     - `https://github.com/MyEtherWallet/ethereum-lists`
     - `https://github.com/forta-network/malicious-smart-contracts`

3. **Live On-Chain Traces**:
   - Real transaction trails queried from Ethereum Mainnet via our existing `EthereumProvider`.

4. **Synthetic Edge-Case Augmentation (Secondary)**:
   - Generated via `services/risk/ml_models/generate_synthetic.py` to balance edge-case class distributions (e.g. rare peeling chain topologies).

---

## 2. Directory Structure & Architecture

```
/ml
  /datasets
    ├── elliptic_txs.csv             ← Real-world transaction node features (from Elliptic)
    ├── elliptic_edges.csv           ← Real-world directed transaction graph edges
    ├── etherscan_phishing.json      ← Known reported scam addresses
    ├── real_fraud_traces.jsonl      ← Feature-extracted real illicit transaction graphs
    └── real_legit_traces.jsonl      ← Feature-extracted real legitimate transaction graphs
  /features
    └── extract_graph_features.py    ← Converts raw transaction subgraphs into 28-D ML feature vectors
  /training
    ├── train_classifier.py          ← XGBoost & Random Forest training pipeline with cross-validation
    └── evaluate_model.py            ← ROC-AUC, Confusion Matrix, and SHAP explainability charts
  /models
    ├── vajra_fraud_classifier_v1.pkl ← Trained production model artifact
    └── feature_names.json           ← Feature names for SHAP alignment
```

---

## 3. The 28-Dimensional Graph Feature Vector

Every transaction trail (real or simulated) is transformed by `services/risk/ml_models/features.py` into a standardized 28-dimensional mathematical feature vector:

| # | Feature Name | Forensic Interpretation |
|---|:---|:---|
| 1 | `hop_count` | Total transaction steps from suspect root to terminal endpoint |
| 2 | `min_time_between_hops_sec` | Fastest forwarding velocity (under 60s indicates automated burner script) |
| 3 | `max_time_between_hops_sec` | Maximum holding duration along the trail |
| 4 | `avg_time_between_hops_sec` | Average holding velocity across all hops |
| 5 | `terminal_is_exchange` | Binary flag (1 if funds reach a cataloged exchange deposit wallet) |
| 6 | `destination_prior_tx_count` | Prior history count of destination wallet (0 = new burner wallet) |
| 7 | `is_peeling_chain` | Binary flag (sequential 80/20 value decay pattern) |
| 8 | `is_dex_routed` | Binary flag (funds routed through Uniswap/1inch routers) |
| 9 | `total_usd_transacted` | Cumulative USD volume moved across all hops |
| 10 | `value_decay_ratio` | Ratio of terminal balance to root initial loss |
| 11 | `node_count` | Total unique addresses in the fund-flow graph |
| 12 | `edge_count` | Total on-chain transfer connections |
| 13 | `max_fan_out_degree` | Maximum outgoing splits from a single intermediary (dispersion) |
| 14 | `max_fan_in_degree` | Maximum incoming consolidation transfers (pooling) |
| 15 | `avg_out_degree` | Average branching factor across graph |
| 16 | `max_degree_centrality` | Importance of key intermediary hub wallets |
| 17 | `avg_betweenness_centrality` | Flow control metric identifying critical money mule routers |
| 18 | `clustering_coefficient` | Local interconnectedness among intermediary wallets |
| 19 | `is_linear_chain` | Binary topological flag (1-to-1 transfer chain) |
| 20 | `is_star_topology` | Binary topological flag (central scammer dispersing to many burners) |
| 21 | `is_hourglass_topology` | Binary topological flag (many victims pooling into one collector) |
| 22 | `max_hop_velocity_sec` | Slowest hop velocity in seconds |
| 23 | `min_hop_velocity_sec` | Fastest hop velocity in seconds |
| 24 | `total_branches` | Total parallel paths explored by tree tracer |
| 25 | `exchange_branches` | Number of branches terminating at verified VASPs |
| 26 | `taint_coverage_percent` | Percentage of victim funds traced to terminal endpoints |
| 27 | `is_fan_out` | Binary flag indicating active fund dispersion |
| 28 | `is_fan_in` | Binary flag indicating active fund aggregation |

---

## 4. Step-by-Step Instructions for AI/ML Teammates

### Step 1: Install Python ML Dependencies
```bash
cd services/risk
.\.venv\Scripts\pip install networkx xgboost scikit-learn shap google-generativeai pandas numpy joblib matplotlib
```

### Step 2: Extract Features from Real & Simulated Datasets
Run the feature extraction pipeline to generate labeled training vectors:
```bash
python ml_models/generate_synthetic.py
```
*(Or load the Elliptic dataset using `ml/features/extract_graph_features.py`)*.

### Step 3: Train the Model
```bash
python ml_models/train.py
```
* Trains an XGBoost Classifier with 5-fold cross validation.
* Evaluates Precision, Recall, F1-Score, and ROC-AUC.
* Exports `vajra_fraud_classifier_v1.pkl` and `feature_names.json` into `services/risk/ml_models/artifacts/`.

### Step 4: Run Real-Time Inference
`services/risk/main.py` automatically loads the exported model on startup and serves live continuous risk scores and SHAP explainability charts to the UI via `POST /risk/score`!

---

## 5. Reference Specification

For full technical specifications, code listings, and formulas, refer to:
**[Specs/10_Phase_E3_Advanced_AI_ML_Engine.md](../Specs/10_Phase_E3_Advanced_AI_ML_Engine.md)**.
