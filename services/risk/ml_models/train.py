"""
train.py — Calibrated Continuous ML Risk Engine Trainer for Vajra LEA Edition
Trains an XGBoost regression model on multi-tier continuous risk profiles
to predict continuous threat probabilities [0.0 to 1.0] and dynamic scores [0 to 100].
"""

import sys
from pathlib import Path

RISK_ROOT = Path(__file__).parent.parent
if str(RISK_ROOT) not in sys.path:
    sys.path.insert(0, str(RISK_ROOT))

import json
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from ml_models.features import FEATURE_NAMES

DATA_DIR = RISK_ROOT / "data"
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)


def load_dataset():
    """Loads continuous synthetic + labeled real datasets."""
    continuous_file = DATA_DIR / "synthetic_continuous.jsonl"
    if not continuous_file.exists():
        raise FileNotFoundError(
            f"Dataset not found at {continuous_file}. "
            "Run `python ml_models/generate_synthetic.py` first."
        )

    X_rows, y_rows = [], []
    with open(continuous_file, "r") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line.strip())
            X_rows.append(row["features"])
            y_rows.append(float(row.get("target_risk", row.get("label", 0.5))))

    return pd.DataFrame(X_rows, columns=FEATURE_NAMES), pd.Series(y_rows)


def train():
    print("Loading continuous risk dataset...")
    X, y = load_dataset()
    print(f"Loaded {len(X)} samples with target risk values in range [{y.min():.3f}, {y.max():.3f}]")
    print(f"Mean Target Risk: {y.mean():.3f} | Std: {y.std():.3f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )

    model = XGBRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:logistic",
        eval_metric="rmse",
        random_state=42,
    )

    print("\nTraining Calibrated XGBoost Continuous Risk Regressor...")
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=50)

    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("\n=== Model Evaluation ===")
    print(f"Test RMSE: {rmse:.4f}")
    print(f"Test MAE:  {mae:.4f} (Average prediction deviation: ~{mae*100:.1f}%)")
    print(f"Test R^2:  {r2:.4f}")

    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="neg_mean_squared_error")
    cv_rmse = np.sqrt(-cv_scores)
    print(f"5-Fold CV RMSE: {cv_rmse.mean():.4f} ± {cv_rmse.std():.4f}")

    model_file = ARTIFACTS_DIR / "vajra_fraud_classifier_v1.pkl"
    feature_names_file = ARTIFACTS_DIR / "feature_names.json"

    joblib.dump(model, model_file)
    with open(feature_names_file, "w") as f:
        json.dump(FEATURE_NAMES, f, indent=2)

    print(f"\nModel artifact serialized to: {model_file}")
    print(f"Feature names serialized to: {feature_names_file}")


if __name__ == "__main__":
    train()
