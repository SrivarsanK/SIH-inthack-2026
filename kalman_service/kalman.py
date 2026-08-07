import math
import time
from typing import Tuple


def mat_mult(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    rows_A, cols_A = len(A), len(A[0])
    rows_B, cols_B = len(B), len(B[0])
    result = [[0.0] * cols_B for _ in range(rows_A)]
    for i in range(rows_A):
        for j in range(cols_B):
            for k in range(cols_A):
                result[i][j] += A[i][k] * B[k][j]
    return result


def mat_add(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    return [[A[i][j] + B[i][j] for j in range(len(A[0]))] for i in range(len(A))]


def mat_sub(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    return [[A[i][j] - B[i][j] for j in range(len(A[0]))] for i in range(len(A))]


def mat_transpose(A: list[list[float]]) -> list[list[float]]:
    return [[A[j][i] for j in range(len(A))] for i in range(len(A[0]))]


def mat_inv_2x2(A: list[list[float]]) -> list[list[float]]:
    a, b = A[0][0], A[0][1]
    c, d = A[1][0], A[1][1]
    det = a * d - b * c
    if abs(det) < 1e-15:
        det = 1e-15
    inv_det = 1.0 / det
    return [
        [d * inv_det, -b * inv_det],
        [-c * inv_det, a * inv_det]
    ]


class KalmanTracker:
    """
    Continuous 2D Kalman Filter for sensor fusion (GNSS + Cellular fallback).
    State vector x = [lat, lon, v_lat, v_lon]
    Pure Python zero-dependency implementation.
    """

    def __init__(self) -> None:
        self.initialized: bool = False
        # State vector 4x1
        self.x: list[list[float]] = [[0.0], [0.0], [0.0], [0.0]]
        # Covariance matrix P (4x4)
        self.P: list[list[float]] = [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ]
        self.last_ts: float | None = None

        # Process noise Q (4x4)
        self.Q: list[list[float]] = [
            [1e-7, 0.0, 0.0, 0.0],
            [0.0, 1e-7, 0.0, 0.0],
            [0.0, 0.0, 1e-6, 0.0],
            [0.0, 0.0, 0.0, 1e-6]
        ]

        # Measurement noise R (2x2)
        # R_cell is 5000x larger than R_gnss to heavily suppress noisy dropout coordinates
        self.R_gnss: list[list[float]] = [
            [0.00001, 0.0],
            [0.0, 0.00001]
        ]
        self.R_cell: list[list[float]] = [
            [0.05, 0.0],
            [0.0, 0.05]
        ]

        # Measurement matrix H (2x4)
        self.H: list[list[float]] = [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0]
        ]

    def update(
        self,
        lat: float,
        lon: float,
        gnss_valid: bool = True,
        ts: float | None = None
    ) -> Tuple[float, float]:
        """
        Executes Kalman prediction and measurement update.
        Returns smoothed (fused_lat, fused_lon).
        """
        current_ts = ts if ts is not None else time.time()

        # Edge Case 4: Zero or out-of-bounds coordinate fallback
        if abs(lat) < 1.0 or abs(lon) < 1.0:
            if self.initialized:
                lat, lon = self.x[0][0], self.x[1][0]
                gnss_valid = False

        if not self.initialized:
            self.x = [[lat], [lon], [0.0], [0.0]]
            self.P = [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0]
            ]
            self.last_ts = current_ts
            self.initialized = True
            return self.x[0][0], self.x[1][0]

        # Edge Case 3: Out-of-order timestamp / time gap clamping
        dt = current_ts - (self.last_ts if self.last_ts is not None else current_ts - 1.0)
        dt = max(0.1, min(dt, 5.0))
        self.last_ts = current_ts

        # State transition matrix F (4x4)
        F = [
            [1.0, 0.0, dt, 0.0],
            [0.0, 1.0, 0.0, dt],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ]

        # 1. Prediction step
        x_pred = mat_mult(F, self.x)
        # If GNSS is invalid (dropout), damp velocity so position stays stationary/smooth if bus halts during outage
        if not gnss_valid:
            x_pred[2][0] *= 0.8
            x_pred[3][0] *= 0.8

        P_pred = mat_add(mat_mult(mat_mult(F, self.P), mat_transpose(F)), self.Q)

        # 2. Measurement update step
        z = [[lat], [lon]]
        R = self.R_gnss if gnss_valid else self.R_cell

        # y = z - H @ x_pred (2x1)
        y = mat_sub(z, mat_mult(self.H, x_pred))

        # S = H @ P_pred @ H.T + R (2x2)
        S = mat_add(mat_mult(mat_mult(self.H, P_pred), mat_transpose(self.H)), R)
        S_inv = mat_inv_2x2(S)

        # K = P_pred @ H.T @ S_inv (4x2)
        K = mat_mult(mat_mult(P_pred, mat_transpose(self.H)), S_inv)

        # x = x_pred + K @ y (4x1)
        self.x = mat_add(x_pred, mat_mult(K, y))

        # Edge Case 5: Clamp velocity v_lat, v_lon to max +/- 0.001 deg/s (~110 km/h) to prevent explosion on jumps
        MAX_VEL = 0.001
        self.x[2][0] = max(-MAX_VEL, min(self.x[2][0], MAX_VEL))
        self.x[3][0] = max(-MAX_VEL, min(self.x[3][0], MAX_VEL))

        # P = (I - K @ H) @ P_pred (4x4)
        I4 = [
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ]
        KH = mat_mult(K, self.H)
        I_minus_KH = mat_sub(I4, KH)
        self.P = mat_mult(I_minus_KH, P_pred)

        return self.x[0][0], self.x[1][0]
