# RT-CFAS Machine Learning Training & Model Pipeline (v2 Roadmap Placeholder)

This directory is designated for the v2 AI/ML model training infrastructure for the **Real-Time Crypto Fraud Attribution System (RT-CFAS)**.

## Intended Directory Structure (v2)

```
/ml
  /datasets      → Labeled historical fraud vs. legitimate transaction graph datasets
  /features      → Offline feature extraction scripts (mirroring services/risk/features.py)
  /training      → Model training pipelines (e.g. XGBoost / GBDT / Graph Neural Network classifiers)
  /models        → Exported model artifacts (ONNX / Pickle format)
```

## v1 Architecture Note
Per **Doc 03 Section 12–15**, v1 uses a deterministic, explainable rule engine hosted in `services/risk`. The FastAPI endpoint (`POST /risk/score`) consumes a standardized `TraceFeatures` schema.

In v2, the `POST /risk/score` endpoint in `services/risk` will load trained model artifacts from `/ml/models/` to run inference on the exact same feature vector — requiring **zero changes** to `apps/api` or `apps/web`.
