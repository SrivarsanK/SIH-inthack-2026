import math
import random
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from kalman import KalmanTracker


def test_edge_cases() -> bool:
    print("=" * 70)
    print("CH-2 Kalman Fusion Service — Exhaustive Edge Case Verification")
    print("=" * 70)

    passed_tests = 0
    total_tests = 6

    # -------------------------------------------------------------------------
    # TEST 1: Normal Steady Trajectory
    # -------------------------------------------------------------------------
    print("\n[Test 1/6] Steady Trajectory Accuracy...")
    tracker = KalmanTracker()
    base_lat, base_lon = 12.9716, 77.5946
    speed = 0.00005

    for i in range(10):
        lat, lon = base_lat + i * speed, base_lon + i * speed
        f_lat, f_lon = tracker.update(lat, lon, gnss_valid=True, ts=float(i))

    final_diff = math.hypot(f_lat - (base_lat + 9 * speed), f_lon - (base_lon + 9 * speed))
    if final_diff < 0.0001:
        print(f"  --> PASS: Fused position closely tracks steady movement (diff={final_diff:.6f})")
        passed_tests += 1
    else:
        print(f"  --> FAIL: Steady tracking error too high ({final_diff:.6f})")

    # -------------------------------------------------------------------------
    # TEST 2: GNSS Dropout Noise Suppression (R_cell = 1000x R_gnss)
    # -------------------------------------------------------------------------
    print("\n[Test 2/6] GNSS Dropout Noise Suppression...")
    dropout_deltas = []
    prev_fused = tracker.x[0][0]

    for i in range(10, 20):
        noisy_lat = base_lat + i * speed + random.gauss(0, 0.0005)
        noisy_lon = base_lon + i * speed + random.gauss(0, 0.0005)
        f_lat, f_lon = tracker.update(noisy_lat, noisy_lon, gnss_valid=False, ts=float(i))
        delta = abs(f_lat - prev_fused)
        dropout_deltas.append(delta)
        prev_fused = f_lat

    max_delta = max(dropout_deltas)
    if max_delta < 0.0001:
        print(f"  --> PASS: Max step delta during dropout is smooth (max_delta={max_delta:.6f} < 0.0001)")
        passed_tests += 1
    else:
        print(f"  --> FAIL: Step delta during dropout too large ({max_delta:.6f})")

    # -------------------------------------------------------------------------
    # TEST 3: Out-of-Order Timestamps & Large Clock Drift Gaps
    # -------------------------------------------------------------------------
    print("\n[Test 3/6] Out-of-Order Timestamps & Time Gaps...")
    try:
        # Negative dt (out of order packet)
        f1_lat, f1_lon = tracker.update(12.9730, 77.5960, gnss_valid=True, ts=15.0)
        # Large dt gap (100 seconds)
        f2_lat, f2_lon = tracker.update(12.9735, 77.5965, gnss_valid=True, ts=115.0)
        print(f"  --> PASS: Handled out-of-order ts and 100s time gap without crash or math overflow")
        passed_tests += 1
    except Exception as e:
        print(f"  --> FAIL: Exception raised during timestamp anomaly: {e}")

    # -------------------------------------------------------------------------
    # TEST 4: Zero / Out-of-Bounds Coordinate Fallback
    # -------------------------------------------------------------------------
    print("\n[Test 4/6] Zero & Out-of-Bounds Coordinate Input...")
    try:
        f_lat_before = tracker.x[0][0]
        # Zero coordinate input
        f_lat_zero, f_lon_zero = tracker.update(0.0, 0.0, gnss_valid=False, ts=116.0)
        # Verify position did not teleport to 0,0
        dist_from_origin = math.hypot(f_lat_zero, f_lon_zero)
        if dist_from_origin > 10.0:
            print(f"  --> PASS: Ignored 0,0 coordinate jump, maintained lat={f_lat_zero:.4f}")
            passed_tests += 1
        else:
            print(f"  --> FAIL: Teleported to zero coordinates ({f_lat_zero}, {f_lon_zero})")
    except Exception as e:
        print(f"  --> FAIL: Exception on zero coordinates: {e}")

    # -------------------------------------------------------------------------
    # TEST 5: Route Loop Reset / Sudden Teleport Velocity Clamping
    # -------------------------------------------------------------------------
    print("\n[Test 5/6] Route Loop Jump & Velocity Clamping...")
    t5 = KalmanTracker()
    # Bus at end of route
    t5.update(12.9800, 77.6000, gnss_valid=True, ts=1.0)
    t5.update(12.9810, 77.6010, gnss_valid=True, ts=2.0)
    # Sudden jump back to start of route (route reset)
    f_jump_lat, f_jump_lon = t5.update(12.9710, 77.5910, gnss_valid=True, ts=3.0)

    # Next tick during dropout
    f_next_lat, f_next_lon = t5.update(12.9710, 77.5910, gnss_valid=False, ts=4.0)
    jump_delta = math.hypot(f_next_lat - f_jump_lat, f_next_lon - f_jump_lon)
    if jump_delta < 0.005:
        print(f"  --> PASS: Velocity clamped after route reset (next tick delta={jump_delta:.6f})")
        passed_tests += 1
    else:
        print(f"  --> FAIL: Velocity exploded after route reset (delta={jump_delta:.6f})")

    # -------------------------------------------------------------------------
    # TEST 6: Prolonged 60-Second Dropout Stability
    # -------------------------------------------------------------------------
    print("\n[Test 6/6] Prolonged 60-Second Dropout Stability...")
    t6 = KalmanTracker()
    t6.update(12.9716, 77.5946, gnss_valid=True, ts=1.0)
    t6.update(12.9717, 77.5947, gnss_valid=True, ts=2.0)

    step_deltas = []
    prev_l = t6.x[0][0]
    for tick in range(3, 63):
        # 60 seconds of noisy cellular fallback measurements (GNSS_NOISE_STD = 0.0005)
        n_lat = 12.9717 + random.gauss(0, 0.0005)
        n_lon = 77.5947 + random.gauss(0, 0.0005)
        fl, _ = t6.update(n_lat, n_lon, gnss_valid=False, ts=float(tick))
        step_d = abs(fl - prev_l)
        step_deltas.append(step_d)
        prev_l = fl

    avg_step_d = sum(step_deltas) / len(step_deltas)
    if avg_step_d < 0.0002:
        print(f"  --> PASS: Maintained trajectory stability across 60s continuous dropout (avg step delta={avg_step_d:.6f} < 0.0002)")
        passed_tests += 1
    else:
        print(f"  --> FAIL: Filter instability during prolonged dropout (avg step delta={avg_step_d:.6f})")

    print("\n" + "=" * 70)
    print(f"EDGE CASE VERIFICATION SUMMARY: {passed_tests}/{total_tests} PASSED")
    print("=" * 70)

    return passed_tests == total_tests


if __name__ == "__main__":
    success = test_edge_cases()
    sys.exit(0 if success else 1)
