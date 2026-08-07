import math
import random
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from kalman import KalmanTracker


def run_unit_test() -> bool:
    print("=" * 60)
    print("CH-2 Kalman Fusion Service — Dropout Noise Immunity Test")
    print("=" * 60)

    tracker = KalmanTracker()
    base_lat = 12.9716
    base_lon = 77.5946
    speed_deg_per_sec = 0.00005  # steady linear movement

    print("\n[Phase 1] Simulating 10 ticks of normal GNSS movement...")
    for i in range(10):
        lat = base_lat + i * speed_deg_per_sec
        lon = base_lon + i * speed_deg_per_sec
        f_lat, f_lon = tracker.update(lat, lon, gnss_valid=True, ts=float(i))
        print(f"Tick {i:02d}: Raw=({lat:.6f}, {lon:.6f}) -> Fused=({f_lat:.6f}, {f_lon:.6f})")

    print("\n[Phase 2] Simulating 10 ticks of GNSS DROPOUT (noisy cellular fallback)...")
    dropout_deltas = []
    prev_fused_lat = tracker.x[0][0]

    for i in range(10, 20):
        # Raw GNSS jumps randomly by ~0.0005 degrees during dropout
        noisy_lat = base_lat + i * speed_deg_per_sec + random.gauss(0, 0.0005)
        noisy_lon = base_lon + i * speed_deg_per_sec + random.gauss(0, 0.0005)

        f_lat, f_lon = tracker.update(noisy_lat, noisy_lon, gnss_valid=False, ts=float(i))
        delta_fused = abs(f_lat - prev_fused_lat)
        dropout_deltas.append(delta_fused)
        prev_fused_lat = f_lat

        print(f"Tick {i:02d} [DROPOUT]: Noisy=({noisy_lat:.6f}, {noisy_lon:.6f}) -> Fused=({f_lat:.6f}, {f_lon:.6f}), dlat={delta_fused:.6f}")

    max_delta = max(dropout_deltas)
    avg_delta = sum(dropout_deltas) / len(dropout_deltas)

    print("\n" + "-" * 60)
    print(f"Max Fused dlat during dropout: {max_delta:.6f} degrees")
    print(f"Avg Fused dlat during dropout: {avg_delta:.6f} degrees")
    print("-" * 60)

    target_delta = 0.0001
    if max_delta < target_delta:
        print(f"\n[PASS] Kalman filter successfully suppressed dropout noise (Max dlat {max_delta:.6f} < {target_delta})")
        return True
    else:
        print(f"\n[FAIL] Fused position delta ({max_delta:.6f}) exceeded target ({target_delta})")
        return False


if __name__ == "__main__":
    success = run_unit_test()
    sys.exit(0 if success else 1)
