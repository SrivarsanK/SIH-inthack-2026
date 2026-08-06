"""
eta_engine/eta_predictor.py
============================
Runtime ML predictor — loaded once at API startup.

Loads the GradientBoostingRegressor trained by gtfs_ml_trainer.py
and exposes predict_remaining_sec() for use in eta.py.

Falls back gracefully to the calculative formula if:
  - Model file missing (trainer not run yet)
  - scikit-learn / joblib not installed
  - Any prediction error at runtime
"""
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from shared.constants import INBOUND_TOTAL_SEC, OUTBOUND_TOTAL_SEC

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_MODEL_PATH = Path(__file__).resolve().parent / "model" / "eta_model.pkl"
_META_PATH  = _MODEL_PATH.parent / "model_meta.json"

# Module-level singletons
_model       = None
_model_ready: bool = False


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load() -> bool:
    """
    Load the trained model from disk. Called once at API startup.
    Returns True if model is ready, False if fallback will be used.
    """
    global _model, _model_ready
    if _model_ready:
        return _model is not None

    if not _MODEL_PATH.exists():
        print(
            f"[eta_predictor] Model not found at {_MODEL_PATH}.\n"
            "  Run:  python eta_engine/gtfs_ml_trainer.py  to train first.\n"
            "  Falling back to calculative formula."
        )
        _model_ready = True
        return False

    try:
        import joblib
        _model = joblib.load(_MODEL_PATH)
        _model_ready = True
        meta = get_model_info()
        print(
            f"[eta_predictor] ML model loaded — "
            f"MAE={meta.get('mae_sec', '?')}s, "
            f"R²={meta.get('r2', '?')}, "
            f"trained on {meta.get('training_rows', '?'):,} rows"
            if isinstance(meta.get("training_rows"), int)
            else f"[eta_predictor] ML model loaded from {_MODEL_PATH}"
        )
        return True
    except Exception as exc:
        print(f"[eta_predictor] Could not load model: {exc}. Using calculative fallback.")
        _model_ready = True
        return False


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def predict_remaining_sec(
    progress: float,
    hour_of_day: int,
    direction_id: int,
    fallback_total_sec: Optional[int] = None,
) -> int:
    """
    Predict remaining trip time in seconds using the ML model.

    Args:
        progress:          0.0 → 1.0, fraction through current leg
        hour_of_day:       0–23 current wall-clock hour (captures rush-hour patterns)
        direction_id:      0 = outbound, 1 = inbound
        fallback_total_sec: used if model unavailable

    Returns:
        Predicted remaining seconds (ML) or calculated fallback.
    """
    load()  # idempotent

    if _model is not None:
        try:
            hour_sin = math.sin(2 * math.pi * hour_of_day / 24)
            hour_cos = math.cos(2 * math.pi * hour_of_day / 24)
            features = [[float(progress), hour_sin, hour_cos, float(direction_id)]]
            predicted = float(_model.predict(features)[0])
            return max(0, round(predicted))
        except Exception as exc:
            print(f"[eta_predictor] Prediction error: {exc}. Using fallback.")

    # Calculative fallback
    total = fallback_total_sec or (
        OUTBOUND_TOTAL_SEC if direction_id == 0 else INBOUND_TOTAL_SEC
    )
    return max(0, round((1.0 - progress) * total))


def is_available() -> bool:
    """Return True if the trained ML model is loaded and ready."""
    load()
    return _model is not None


def get_model_info() -> Dict[str, Any]:
    """Return training metadata dict for the /model/info endpoint."""
    if _META_PATH.exists():
        try:
            return json.loads(_META_PATH.read_text())
        except Exception:
            pass
    return {
        "status": "model_meta.json not found — run gtfs_ml_trainer.py",
        "model_available": is_available(),
    }
