from signal_processing.route_match import RoutePlausibilityChecker

MOCK_ROUTE = [(80.00, 12.00), (80.10, 12.00)]

def test_route_plausibility():
    checker = RoutePlausibilityChecker(route_coords=MOCK_ROUTE)
    for _ in range(5):
        plausible = checker.is_plausible("dev1", lon=80.05, lat=12.00)
    assert plausible is True