# AutoVolt Grafana Setup Script for Windows
# Run this script in PowerShell as Administrator

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  AutoVolt Grafana & Prometheus Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Please run this script as Administrator!" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit
}

# Step 1: Check if Chocolatey is installed
Write-Host "[1/7] Checking for Chocolatey..." -ForegroundColor Green
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
} else {
    Write-Host "✅ Chocolatey already installed" -ForegroundColor Green
}

# Step 2: Install Grafana
Write-Host ""
Write-Host "[2/7] Installing Grafana..." -ForegroundColor Green
if (!(Get-Command grafana-server -ErrorAction SilentlyContinue)) {
    choco install grafana -y
    Write-Host "✅ Grafana installed" -ForegroundColor Green
} else {
    Write-Host "✅ Grafana already installed" -ForegroundColor Green
}

# Step 3: Install Prometheus
Write-Host ""
Write-Host "[3/7] Installing Prometheus..." -ForegroundColor Green
$prometheusPath = "C:\prometheus"
if (!(Test-Path $prometheusPath)) {
    Write-Host "Downloading Prometheus..." -ForegroundColor Yellow
    $prometheusVersion = "2.45.0"
    $prometheusUrl = "https://github.com/prometheus/prometheus/releases/download/v$prometheusVersion/prometheus-$prometheusVersion.windows-amd64.zip"
    $prometheusZip = "$env:TEMP\prometheus.zip"
    
    Invoke-WebRequest -Uri $prometheusUrl -OutFile $prometheusZip
    Expand-Archive -Path $prometheusZip -DestinationPath "C:\" -Force
    Rename-Item -Path "C:\prometheus-$prometheusVersion.windows-amd64" -NewName "prometheus"
    Remove-Item $prometheusZip
    Write-Host "✅ Prometheus installed to C:\prometheus" -ForegroundColor Green
} else {
    Write-Host "✅ Prometheus already installed" -ForegroundColor Green
}

# Step 4: Configure Prometheus
Write-Host ""
Write-Host "[4/7] Configuring Prometheus..." -ForegroundColor Green
$prometheusConfig = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'autovolt'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s
"@

Set-Content -Path "$prometheusPath\prometheus.yml" -Value $prometheusConfig
Write-Host "✅ Prometheus configured for AutoVolt" -ForegroundColor Green

# Step 5: Create Prometheus Service
Write-Host ""
Write-Host "[5/7] Creating Prometheus Windows Service..." -ForegroundColor Green
$serviceName = "Prometheus"
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($null -eq $service) {
    $nssm = "C:\ProgramData\chocolatey\bin\nssm.exe"
    if (!(Test-Path $nssm)) {
        choco install nssm -y
    }
    
    & $nssm install $serviceName "$prometheusPath\prometheus.exe"
    & $nssm set $serviceName AppDirectory $prometheusPath
    & $nssm set $serviceName AppParameters "--config.file=prometheus.yml"
    Write-Host "✅ Prometheus service created" -ForegroundColor Green
} else {
    Write-Host "✅ Prometheus service already exists" -ForegroundColor Green
}

# Step 6: Start Services
Write-Host ""
Write-Host "[6/7] Starting services..." -ForegroundColor Green

# Start Prometheus
Start-Service -Name "Prometheus"
Write-Host "✅ Prometheus started on http://localhost:9090" -ForegroundColor Green

# Start Grafana
$grafanaService = Get-Service -Name "Grafana" -ErrorAction SilentlyContinue
if ($grafanaService) {
    Start-Service -Name "Grafana"
    Write-Host "✅ Grafana started on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Starting Grafana manually (service not found)..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Program Files\GrafanaLabs\grafana\bin\grafana-server.exe" -WindowStyle Hidden
    Write-Host "✅ Grafana started on http://localhost:3000" -ForegroundColor Green
}

# Wait a moment for services to start
Start-Sleep -Seconds 5

# Step 7: Open browsers
Write-Host ""
Write-Host "[7/7] Opening browsers..." -ForegroundColor Green
Start-Process "http://localhost:9090"
Start-Process "http://localhost:3000"
Start-Process "http://localhost:3001/metrics"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ✅ Setup Complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Grafana Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Default Login: admin / admin" -ForegroundColor Yellow
Write-Host ""
Write-Host "📈 Prometheus UI: http://localhost:9090" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔌 AutoVolt Metrics: http://localhost:3001/metrics" -ForegroundColor Cyan
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Login to Grafana (admin/admin)" -ForegroundColor White
Write-Host "2. Go to Configuration → Data Sources" -ForegroundColor White
Write-Host "3. Add Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "4. Import dashboard from:" -ForegroundColor White
Write-Host "   $PSScriptRoot\grafana-autovolt-dashboard.json" -ForegroundColor Yellow
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor White
Write-Host "   $PSScriptRoot\GRAFANA_DASHBOARD_SETUP.md" -ForegroundColor Yellow
Write-Host ""
