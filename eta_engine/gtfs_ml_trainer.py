"""
eta_engine/gtfs_ml_trainer.py
==============================
Offline training script — run ONCE before starting the API.

Builds a GradientBoostingRegressor from real Chennai MTC GTFS stop_times:
  - Extracts (progress, hour_sin, hour_cos, direction_id) → remaining_sec
    for every stop in every trip (1.37M rows → sampled to 300K for speed)
  - Trains, evaluates (MAE + R²), saves model to eta_engine/model/

Usage:
    python eta_engine/gtfs_ml_trainer.py

Output:
    eta_engine/model/eta_model.pkl      — sklearn GBR model
    eta_engine/model/model_meta.json    — training metrics
"""
import csv
import json
import math
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
try:
    import joblib
    import numpy as np
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.metrics import mean_absolute_error, r2_score
    from sklearn.model_selection import train_test_split
except ImportError as exc:
    print(f"ERROR: Missing ML dependency: {exc}")
    print("Install with:  pip install scikit-learn joblib numpy")
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ---------------------------------------------------------------------------
# Paths and config
# ---------------------------------------------------------------------------
_DATA_DIR   = Path(__file__).resolve().parent / "Data_train_test" / "data"
_MODEL_DIR  = Path(__file__).resolve().parent / "model"
_MODEL_PATH = _MODEL_DIR / "eta_model.pkl"
_META_PATH  = _MODEL_DIR / "model_meta.json"

MAX_TRAINING_ROWS = 300_000   # representative subset for speed (~30-60s train)
RANDOM_SEED       = 42


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_time_to_sec(t: str) -> int:
    """Convert HH:MM:SS (may exceed 24h) to total seconds. Returns -1 on error."""
    parts = t.strip().split(":")
    if len(parts) != 3:
        return -1
    try:
        h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
        return h * 3600 + m * 60 + s
    except ValueError:
        return -1


def load_trip_meta(data_dir: Path) -> Dict[str, int]:
    """Parse trips.txt → {trip_id: direction_id (0 or 1)}."""
    result: Dict[str, int] = {}
    filepath = data_dir / "trips.txt"
    if not filepath.exists():
        print(f"[trainer] WARNING: trips.txt not found at {filepath}")
        return result
    with open(filepath, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            tid = row.get("trip_id", "").strip()
            if tid:
                result[tid] = int(row.get("direction_id", 0))
    print(f"[trainer] Loaded direction_id for {len(result):,} trips.")
    return result


def build_training_rows(
    data_dir: Path,
    trip_meta: Dict[str, int],
    max_rows: int = MAX_TRAINING_ROWS,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Stream stop_times.txt and construct feature/target matrix.

    Feature vector per stop:
        [progress, sin(2π h/24), cos(2π h/24), direction_id]

    Target:
        remaining_sec = last_dep_of_trip - dep_at_this_stop

    Returns (X, y) as numpy arrays.
    """
    filepath = data_dir / "stop_times.txt"
    print(f"[trainer] Streaming {filepath.name} ({filepath.stat().st_size // 1_000_000} MB)...")

    # Collect {trip_id: [(stop_sequence, dep_sec), ...]}
    trip_stops: Dict[str, List[Tuple[int, int]]] = {}
    t0 = time.time()
    with open(filepath, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            tid = row.get("trip_id", "").strip()
            if tid not in trip_meta:
                continue
            try:
                seq = int(row.get("stop_sequence", 0))
            except ValueError:
                continue
            dep_sec = _parse_time_to_sec(row.get("departure_time", ""))
            if dep_sec < 0:
                continue
            if tid not in trip_stops:
                trip_stops[tid] = []
            trip_stops[tid].append((seq, dep_sec))

    print(f"[trainer] Parsed stop data for {len(trip_stops):,} trips in {time.time()-t0:.1f}s")

    # Build feature and target lists
    X_raw: List[List[float]] = []
    y_raw: List[float] = []

    for tid, stops in trip_stops.items():
        direction = trip_meta.get(tid, 0)
        stops_sorted = sorted(stops, key=lambda s: s[0])
        if len(stops_sorted) < 2:
            continue

        min_seq  = stops_sorted[0][0]
        max_seq  = stops_sorted[-1][0]
        seq_span = max_seq - min_seq
        if seq_span == 0:
            continue

        first_dep = stops_sorted[0][1]
        last_dep  = stops_sorted[-1][1]
        if last_dep <= first_dep:
            continue  # skip invalid schedules

        # Cyclic hour encoding from trip start (mod 24 to handle overnight runs)
        hour     = (first_dep // 3600) % 24
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)

        for seq, dep_sec in stops_sorted:
            progress      = (seq - min_seq) / seq_span
            remaining_sec = last_dep - dep_sec
            if remaining_sec < 0:
                continue
            X_raw.append([progress, hour_sin, hour_cos, float(direction)])
            y_raw.append(float(remaining_sec))

    total_rows = len(X_raw)
    print(f"[trainer] Extracted {total_rows:,} (progress, remaining_sec) training rows.")

    # Random subsample if over limit
    if total_rows > max_rows:
        rng = random.Random(RANDOM_SEED)
        indices = rng.sample(range(total_rows), max_rows)
        X_raw = [X_raw[i] for i in indices]
        y_raw = [y_raw[i] for i in indices]
        print(f"[trainer] Subsampled to {len(X_raw):,} rows (representative subset).")

    return np.array(X_raw, dtype=np.float32), np.array(y_raw, dtype=np.float32)


# ---------------------------------------------------------------------------
# Main training pipeline
# ---------------------------------------------------------------------------

def train_and_save(data_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Full train → evaluate → save pipeline. Returns metadata dict."""
    target = data_dir or _DATA_DIR
    _MODEL_DIR.mkdir(parents=True, exist_ok=True)

    trip_meta = load_trip_meta(target)
    if not trip_meta:
        print("ERROR: trips.txt is empty or missing.")
        sys.exit(1)

    X, y = build_training_rows(target, trip_meta)
    if len(X) == 0:
        print("ERROR: No training rows could be built — check GTFS data path.")
        sys.exit(1)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED
    )

    print(
        f"[trainer] Training GradientBoostingRegressor — "
        f"{len(X_train):,} train / {len(X_test):,} test rows..."
    )
    t0 = time.time()
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.5,           # stochastic — faster + regularized
        min_samples_leaf=20,     # prevent overfitting
        random_state=RANDOM_SEED,
        verbose=1,
    )
    model.fit(X_train, y_train)
    train_sec = time.time() - t0
    print(f"[trainer] Training complete in {train_sec:.1f}s")

    y_pred = model.predict(X_test)
    mae    = float(mean_absolute_error(y_test, y_pred))
    r2     = float(r2_score(y_test, y_pred))
    print(f"\n{'-'*45}")
    print(f"  MAE  = {mae:.1f}s  ({mae/60:.1f} min average error)")
    print(f"  R2   = {r2:.4f}  ({r2*100:.1f}% variance explained)")
    print(f"{'-'*45}\n")

    joblib.dump(model, _MODEL_PATH)
    print(f"[trainer] [OK] Model saved -> {_MODEL_PATH}")

    meta: Dict[str, Any] = {
        "mae_sec":          round(mae, 2),
        "r2":               round(r2, 4),
        "training_rows":    int(len(X_train)),
        "test_rows":        int(len(X_test)),
        "total_trips":      int(len(trip_meta)),
        "training_time_sec": round(train_sec, 1),
        "features":         ["progress", "hour_sin", "hour_cos", "direction_id"],
        "model_class":      "GradientBoostingRegressor",
        "n_estimators":     100,
        "max_depth":        4,
        "subsample":        0.5,
        "data_source":      str(target),
        "model_path":       str(_MODEL_PATH),
    }
    _META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"[trainer] [OK] Metadata saved -> {_META_PATH}")
    return meta


if __name__ == "__main__":
    train_and_save()
