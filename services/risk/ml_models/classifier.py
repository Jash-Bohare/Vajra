"""
classifier.py — XGBoost Fraud Classifier loader and inference engine with SHAP explainability.
"""

from pathlib import Path
from typing import List, Dict, Tuple, Any, Optional
import json
import joblib
import numpy as np
import shap

MODEL_PATH = Path(__file__).parent / "artifacts" / "vajra_fraud_classifier_v1.pkl"
FEATURE_NAMES_PATH = Path(__file__).parent / "artifacts" / "feature_names.json"


class FraudClassifier:
    """
    Lazy-loading calibrated XGBoost fraud probability regressor/classifier with SHAP explainability.
    Model and explainer are loaded on first call and cached in memory.
    """
    _model: Optional[Any] = None
    _explainer: Optional[shap.TreeExplainer] = None
    _feature_names: Optional[List[str]] = None

    @classmethod
    def is_loaded(cls) -> bool:
        return cls._model is not None and cls._explainer is not None

    @classmethod
    def reload(cls):
        cls._model = None
        cls._explainer = None
        cls._feature_names = None
        cls.load()

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
            if FEATURE_NAMES_PATH.exists():
                cls._feature_names = json.loads(FEATURE_NAMES_PATH.read_text())
            else:
                from .features import FEATURE_NAMES
                cls._feature_names = FEATURE_NAMES

    @classmethod
    def predict(cls, feature_vector: np.ndarray) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Returns:
            fraud_probability: float (0.0 – 1.0)
            feature_importance: List[{feature, shap_value, direction, raw_value}]
        """
        cls.load()
        X = feature_vector.reshape(1, -1)

        # Handle both Classifier (predict_proba) and Regressor (predict)
        if hasattr(cls._model, "predict_proba"):
            raw_pred = float(cls._model.predict_proba(X)[0][1])
        else:
            raw_pred = float(cls._model.predict(X)[0])

        prob = float(np.clip(raw_pred, 0.01, 0.99))

        # Compute SHAP explanation
        shap_vals = cls._explainer.shap_values(X)
        if isinstance(shap_vals, list):
            shap_array = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
        elif len(shap_vals.shape) == 2:
            shap_array = shap_vals[0]
        else:
            shap_array = shap_vals

        importance = []
        feature_names = cls._feature_names or [f"feature_{i}" for i in range(len(feature_vector))]
        for i, (name, val) in enumerate(zip(feature_names, shap_array)):
            shap_val = float(val)
            importance.append({
                "feature": name,
                "shap_value": round(shap_val, 4),
                "direction": "increases_risk" if shap_val > 0 else "reduces_risk",
                "raw_value": round(float(feature_vector[i]), 4),
            })

        # Sort by absolute SHAP value (most impactful first)
        importance.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return prob, importance[:10]


def probability_to_risk_level(prob: float) -> str:
    """Maps continuous probability to categorical risk level."""
    if prob < 0.25:
        return "low"
    if prob < 0.55:
        return "medium"
    if prob < 0.80:
        return "high"
    return "critical"


def probability_to_confidence(prob: float) -> str:
    """Calculates confidence of model decision based on distance from 0.5 boundary."""
    if prob < 0.20 or prob > 0.80:
        return "high"
    if (0.20 <= prob <= 0.40) or (0.60 <= prob <= 0.80):
        return "medium"
    return "low"
