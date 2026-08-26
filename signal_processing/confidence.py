ACCURACY_FLOOR_M = 5.0
ACCURACY_CEILING_M = 100.0

def calculate_accuracy_weight(gps_accuracy_m: float) -> float:
    if gps_accuracy_m <= ACCURACY_FLOOR_M:
        return 1.0
    if gps_accuracy_m >= ACCURACY_CEILING_M:
        return 0.0
    return 1.0 - ((gps_accuracy_m - ACCURACY_FLOOR_M) / (ACCURACY_CEILING_M - ACCURACY_FLOOR_M))

def compute_composite_confidence(
    gps_accuracy_m: float,
    debounce_trust: bool,
    route_plausible: bool
) -> float:
    acc_weight = calculate_accuracy_weight(gps_accuracy_m)
    debounce_factor = 1.0 if debounce_trust else 0.2
    plausibility_factor = 1.0 if route_plausible else 0.1

    composite_score = acc_weight * debounce_factor * plausibility_factor
    return max(0.0, min(1.0, round(composite_score, 4)))

from signal_processing.confidence import calculate_accuracy_weight, compute_composite_confidence

def test_confidence_interpolation():
    assert calculate_accuracy_weight(5.0) == 1.0
    assert calculate_accuracy_weight(100.0) == 0.0
    assert calculate_accuracy_weight(52.5) == 0.5

def test_non_discard_policy():
    score = compute_composite_confidence(120.0, False, False)
    assert 0.0 <= score <= 1.0