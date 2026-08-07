Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Launching TransitSense Local Pipeline..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$rootDir = Get-Location

Write-Host "[0/5] Starting Embedded MQTT Broker (:1883)..." -ForegroundColor Yellow
Start-Process python -ArgumentList "shared/mqtt_broker.py" -WorkingDirectory $rootDir
Start-Sleep -Seconds 2

Write-Host "[1/5] Starting CH-1 Simulator Engine..." -ForegroundColor Yellow
Start-Process python -ArgumentList "simulator/simulator.py" -WorkingDirectory $rootDir

Write-Host "[2/5] Starting CH-1 Control API (:8001)..." -ForegroundColor Yellow
Start-Process python -ArgumentList "simulator/control_api.py" -WorkingDirectory $rootDir

Write-Host "[3/5] Starting CH-2 Kalman Fusion Service..." -ForegroundColor Yellow
Start-Process python -ArgumentList "kalman_service/subscriber.py" -WorkingDirectory $rootDir

Write-Host "[4/5] Starting CH-3 ETA Engine (:8002)..." -ForegroundColor Yellow
Start-Process python -ArgumentList "eta_engine/api.py" -WorkingDirectory $rootDir

Write-Host "[5/5] Starting CH-4 Dashboard UI (:4321)..." -ForegroundColor Green
Write-Host "Access dashboard at http://localhost:4321" -ForegroundColor Cyan

Set-Location "$rootDir\dashboard"
npm run dev
