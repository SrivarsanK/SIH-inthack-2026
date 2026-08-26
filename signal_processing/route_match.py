from collections import deque
from typing import Dict, List, Tuple
from shapely.geometry import LineString, Point

MAX_AVG_DISTANCE_M = 60.0
MAX_PEAK_DISTANCE_M = 150.0
WINDOW_SIZE = 10

class RoutePlausibilityChecker:
    """Stage 2: Point-to-line route distance check."""
    def __init__(self, route_coords: List[Tuple[float, float]]):
        self.route_line = LineString(route_coords)
        self._history: Dict[str, deque] = {}

    def _latlon_to_meters_approx(self, dist_degrees: float) -> float:
        return dist_degrees * 111_000.0

    def calculate_distance(self, lon: float, lat: float) -> float:
        pt = Point(lon, lat)
        return self._latlon_to_meters_approx(self.route_line.distance(pt))

    def is_plausible(self, device_id: str, lon: float, lat: float) -> bool:
        if device_id not in self._history:
            self._history[device_id] = deque(maxlen=WINDOW_SIZE)

        self._history[device_id].append(self.calculate_distance(lon, lat))
        history = self._history[device_id]

        return (sum(history) / len(history) < MAX_AVG_DISTANCE_M) and (max(history) < MAX_PEAK_DISTANCE_M)