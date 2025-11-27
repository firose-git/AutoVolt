# Grafana Iframe Embedding Configuration Script
# This script helps configure Grafana to allow iframe embedding

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Grafana Iframe Embedding Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to find Grafana configuration file
function Find-GrafanaConfig {
    $possiblePaths = @(
        "C:\Program Files\GrafanaLabs\grafana\conf\custom.ini",
        "C:\Program Files\GrafanaLabs\grafana\conf\defaults.ini",
        "C:\grafana\conf\custom.ini",
        "C:\grafana\conf\grafana.ini"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    return $null
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Warning: This script should be run as Administrator to modify Grafana configuration." -ForegroundColor Yellow
    Write-Host ""
}

# Find Grafana configuration
$configPath = Find-GrafanaConfig

if ($null -eq $configPath) {
    Write-Host "❌ Could not find Grafana configuration file." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual Configuration Steps:" -ForegroundColor Yellow
    Write-Host "1. Locate your Grafana installation directory" -ForegroundColor White
    Write-Host "2. Find the configuration file (custom.ini or grafana.ini)" -ForegroundColor White
    Write-Host "3. Add the following under [security] section:" -ForegroundColor White
    Write-Host ""
    Write-Host "[security]" -ForegroundColor Green
    Write-Host "allow_embedding = true" -ForegroundColor Green
    Write-Host "cookie_samesite = none" -ForegroundColor Green
    Write-Host ""
    Write-Host "4. Restart Grafana service" -ForegroundColor White
    Write-Host ""
    
    # Check if Grafana is running via Docker
    Write-Host "Checking for Docker-based Grafana..." -ForegroundColor Yellow
    $dockerContainers = docker ps --format "{{.Names}}" 2>$null | Select-String -Pattern "grafana"
    
    if ($dockerContainers) {
        Write-Host "✅ Found Grafana running in Docker: $dockerContainers" -ForegroundColor Green
        Write-Host ""
        Write-Host "Docker Configuration Options:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Option 1: Environment Variables" -ForegroundColor Cyan
        Write-Host "Add to your docker-compose.yml:" -ForegroundColor White
        Write-Host ""
        Write-Host "  environment:" -ForegroundColor Green
        Write-Host "    - GF_SECURITY_ALLOW_EMBEDDING=true" -ForegroundColor Green
        Write-Host "    - GF_SECURITY_COOKIE_SAMESITE=none" -ForegroundColor Green
        Write-Host ""
        Write-Host "Option 2: Direct Docker Command" -ForegroundColor Cyan
        Write-Host "docker exec $dockerContainers grafana-cli config set security.allow_embedding true" -ForegroundColor Green
        Write-Host ""
        Write-Host "Then restart:" -ForegroundColor White
        Write-Host "docker restart $dockerContainers" -ForegroundColor Green
    }
    
    exit 1
}

Write-Host "✅ Found Grafana configuration: $configPath" -ForegroundColor Green
Write-Host ""

# Create backup
$backupPath = "$configPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $configPath -Destination $backupPath -Force
Write-Host "✅ Created backup: $backupPath" -ForegroundColor Green
Write-Host ""

# Read configuration
$content = Get-Content -Path $configPath -Raw

# Check if [security] section exists
if ($content -match '\[security\]') {
    Write-Host "📝 [security] section found" -ForegroundColor Cyan
    
    # Check if allow_embedding already exists
    if ($content -match 'allow_embedding\s*=') {
        Write-Host "⚠️  allow_embedding setting already exists" -ForegroundColor Yellow
        Write-Host "   Updating value to true..." -ForegroundColor White
        $content = $content -replace '(allow_embedding\s*=\s*)\w+', '${1}true'
    } else {
        Write-Host "➕ Adding allow_embedding setting" -ForegroundColor Cyan
        $content = $content -replace '(\[security\])', "`$1`r`nallow_embedding = true"
    }
    
    # Check if cookie_samesite exists
    if ($content -match 'cookie_samesite\s*=') {
        Write-Host "⚠️  cookie_samesite setting already exists" -ForegroundColor Yellow
        Write-Host "   Updating value to none..." -ForegroundColor White
        $content = $content -replace '(cookie_samesite\s*=\s*)\w+', '${1}none'
    } else {
        Write-Host "➕ Adding cookie_samesite setting" -ForegroundColor Cyan
        $content = $content -replace '(\[security\])', "`$1`r`ncookie_samesite = none"
    }
} else {
    Write-Host "📝 [security] section not found, creating it..." -ForegroundColor Cyan
    $securitySection = @"

[security]
# Allow Grafana to be embedded in iframes
allow_embedding = true
cookie_samesite = none
"@
    $content += $securitySection
}

# Save the modified configuration
try {
    Set-Content -Path $configPath -Value $content -Force
    Write-Host "✅ Configuration updated successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error updating configuration: $_" -ForegroundColor Red
    Write-Host "   Try running this script as Administrator" -ForegroundColor Yellow
    exit 1
}

# Restart Grafana service
Write-Host "🔄 Attempting to restart Grafana service..." -ForegroundColor Cyan
Write-Host ""

$service = Get-Service -Name "Grafana" -ErrorAction SilentlyContinue

if ($null -ne $service) {
    try {
        Restart-Service -Name "Grafana" -Force
        Write-Host "✅ Grafana service restarted successfully!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not restart Grafana service automatically" -ForegroundColor Yellow
        Write-Host "   Please restart manually:" -ForegroundColor White
        Write-Host "   Restart-Service Grafana" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Grafana service not found" -ForegroundColor Yellow
    Write-Host "   Please restart Grafana manually" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If Grafana didn't restart automatically, restart it manually" -ForegroundColor White
Write-Host "2. Clear your browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "3. Navigate to: http://localhost:5173/dashboard/grafana-public" -ForegroundColor White
Write-Host "4. The Grafana dashboard should now load in the iframe" -ForegroundColor White
Write-Host ""
Write-Host "Backup saved at:" -ForegroundColor Cyan
Write-Host "$backupPath" -ForegroundColor White
Write-Host ""
