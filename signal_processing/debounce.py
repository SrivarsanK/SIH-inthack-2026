from collections import deque
from typing import Dict

WINDOW_SIZE = 18  # ~90s window (18 readings at 5s intervals)
TARGET_STATE = "IN_VEHICLE"

class ActivityDebouncer:
    """Stage 1: Sustained-Window Debounce requiring unanimous agreement."""
    def __init__(self, window_size: int = WINDOW_SIZE):
        self.window_size = window_size
        self._buffers: Dict[str, deque] = {}

    def update(self, device_id: str, activity_state: str) -> bool:
        if device_id not in self._buffers:
            self._buffers[device_id] = deque(maxlen=self.window_size)

        buffer = self._buffers[device_id]
        buffer.append(activity_state)

        if len(buffer) < self.window_size:
            return False

        return all(state == TARGET_STATE for state in buffer)
    
    from signal_processing.debounce import ActivityDebouncer

def test_debounce_unanimous():
    debouncer = ActivityDebouncer(window_size=3)
    assert debouncer.update("dev1", "IN_VEHICLE") is False
    assert debouncer.update("dev1", "IN_VEHICLE") is False
    assert debouncer.update("dev1", "WALKING") is False

    assert debouncer.update("dev1", "IN_VEHICLE") is False
    assert debouncer.update("dev1", "IN_VEHICLE") is False
    assert debouncer.update("dev1", "IN_VEHICLE") is True