@echo off
echo ================================================
echo   AutoVolt Grafana Quick Setup
echo ================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

echo [1/5] Stopping any existing containers...
docker-compose -f docker-compose.grafana.yml down 2>nul

echo.
echo [2/5] Starting Grafana and Prometheus...
docker-compose -f docker-compose.grafana.yml up -d

echo.
echo [3/5] Waiting for services to start (15 seconds)...
timeout /t 15 /nobreak >nul

echo.
echo [4/5] Checking service status...
docker ps

echo.
echo [5/5] Opening browsers...
start http://localhost:3000
timeout /t 2 /nobreak >nul
start http://localhost:9090
timeout /t 2 /nobreak >nul
start http://localhost:3001/metrics

echo.
echo ================================================
echo   Setup Complete!
echo ================================================
echo.
echo Grafana Dashboard: http://localhost:3000
echo   Login: admin / admin
echo.
echo Prometheus: http://localhost:9090
echo.
echo AutoVolt Metrics: http://localhost:3001/metrics
echo.
echo ================================================
echo   Next Steps:
echo ================================================
echo.
echo 1. Login to Grafana (admin/admin)
echo 2. Add Data Source (Prometheus: http://prometheus:9090)
echo 3. Import dashboard from: grafana-autovolt-dashboard.json
echo.
echo For detailed guide, see: COMPLETE_GRAFANA_GUIDE.md
echo.
pause
