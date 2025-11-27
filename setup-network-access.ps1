# PowerShell Script to Configure Windows Firewall for Network Access
# Run this script as Administrator

Write-Host "Configuring Windows Firewall for AutoVolt Network Access..." -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Grafana Port (3000)
Write-Host "Configuring Grafana (Port 3000)..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "AutoVolt - Grafana Dashboard" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -ErrorAction Stop | Out-Null
    Write-Host "✅ Grafana port 3000 - ALLOWED" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Grafana rule already exists - SKIPPED" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to create Grafana rule: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Prometheus Port (9090)
Write-Host "Configuring Prometheus (Port 9090)..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "AutoVolt - Prometheus Metrics" `
        -Direction Inbound `
        -LocalPort 9090 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -ErrorAction Stop | Out-Null
    Write-Host "✅ Prometheus port 9090 - ALLOWED" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Prometheus rule already exists - SKIPPED" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to create Prometheus rule: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Backend API Port (3001)
Write-Host "Configuring Backend API (Port 3001)..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "AutoVolt - Backend API" `
        -Direction Inbound `
        -LocalPort 3001 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -ErrorAction Stop | Out-Null
    Write-Host "✅ Backend API port 3001 - ALLOWED" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Backend API rule already exists - SKIPPED" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to create Backend API rule: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Frontend Port (5173 - Vite default)
Write-Host "Configuring Frontend (Port 5173)..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "AutoVolt - Frontend Web" `
        -Direction Inbound `
        -LocalPort 5173 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -ErrorAction Stop | Out-Null
    Write-Host "✅ Frontend port 5173 - ALLOWED" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Frontend rule already exists - SKIPPED" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to create Frontend rule: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firewall Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Display current IP addresses
Write-Host "Your Server IP Addresses:" -ForegroundColor Cyan
ipconfig | findstr "IPv4"

Write-Host ""
Write-Host "Access URLs for other users:" -ForegroundColor Cyan
Write-Host "  Grafana:    http://172.16.3.171:3000" -ForegroundColor Yellow
Write-Host "  Prometheus: http://172.16.3.171:9090" -ForegroundColor Yellow
Write-Host "  Backend:    http://172.16.3.171:3001" -ForegroundColor Yellow
Write-Host "  Frontend:   http://172.16.3.171:5173" -ForegroundColor Yellow

Write-Host ""
Write-Host "✅ Users on the same network can now access these services!" -ForegroundColor Green
Write-Host ""
Write-Host "To verify firewall rules, run:" -ForegroundColor Cyan
Write-Host '  Get-NetFirewallRule -DisplayName "AutoVolt*"' -ForegroundColor Gray
Write-Host ""

pause
