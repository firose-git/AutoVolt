# Project Cleanup Script
# This script removes unnecessary documentation, test files, and debug scripts

Write-Host "Starting project cleanup..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\IOT\Downloads\aims_smart_class\new-autovolt"
$filesRemoved = 0
$foldersRemoved = 0

# Function to safely remove files
function Remove-SafelyFile {
    param($path)
    if (Test-Path $path) {
        Remove-Item $path -Force
        $script:filesRemoved++
        Write-Host "✓ Removed: $($path.Replace($projectRoot, ''))" -ForegroundColor Green
    }
}

# Function to safely remove folders
function Remove-SafelyFolder {
    param($path)
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
        $script:foldersRemoved++
        Write-Host "✓ Removed folder: $($path.Replace($projectRoot, ''))" -ForegroundColor Green
    }
}

Write-Host "1. Removing documentation files..." -ForegroundColor Yellow
# Remove duplicate/outdated documentation
$docsToRemove = @(
    "ALL_USER_REQUESTS_STATUS.md",
    "BUG_FIXES_AND_NEW_FEATURES.md",
    "COMPLETE_REFACTOR_SUMMARY.md",
    "CONSOLE_ERRORS_ACTION_PLAN.md",
    "CONSOLE_ERRORS_FIX.md",
    "CONSOLE_ERRORS_FIXED.md",
    "CONSOLE_ERRORS_QUICK_REF.md",
    "DEVICE_CARDS_COMPLETE.md",
    "DEVICE_CARDS_ENHANCEMENT.md",
    "ERROR_LOG_SOLUTION.md",
    "ESP32_MANUAL_SWITCH_FIX.md",
    "ESP32_RESTART_BEHAVIOR.md",
    "ESP32_TROUBLESHOOTING.md",
    "FIXES_APPLIED_NOTICE_BOARD.md",
    "FIX_SUMMARY.cjs",
    "FORM_COMPONENTS_COMPLETE.md",
    "FORM_COMPONENTS_ENHANCEMENT.md",
    "FORM_IMPLEMENTATION_SUMMARY.md",
    "FORM_MISSION_COMPLETE.md",
    "FORM_QUICK_REFERENCE.md",
    "IMPLEMENTATION_COMPLETE.md",
    "IMPLEMENTATION_SUMMARY.md",
    "INACTIVE_CONTENT_IMPROVEMENTS.md",
    "INACTIVE_CONTENT_VISUAL_GUIDE.md",
    "KIOSK_WORKFLOW_IMPROVEMENTS.md",
    "LANDING_PAGE_DOCUMENTATION.md",
    "LANDING_PAGE_QUICK_START.md",
    "LANDING_PAGE_SUMMARY.md",
    "LIGHT_THEME_IMPROVEMENTS.md",
    "LIMITED_CONTROL_GUIDE.md",
    "LOGGING_FIXES_SUMMARY.md",
    "MANUAL_SWITCHES_UI_UPDATE.md",
    "NETWORK_INPUT_COMPONENTS.md",
    "NOTICE_APPROVAL_CONFIG.md",
    "NOTICE_APPROVAL_FIXES.md",
    "NOTICE_BOARD_COMPLETE_PACKAGE.md",
    "NOTICE_BOARD_ENHANCEMENT_PLAN.md",
    "NOTICE_BOARD_FEATURES.txt",
    "NOTICE_BOARD_FIX_SUMMARY.md",
    "NOTICE_BOARD_IMPLEMENTATION_SUMMARY.md",
    "NOTICE_BOARD_QUICK_GUIDE.md",
    "NOTICE_WORKFLOW_COMPLETE.md",
    "NOTICE_WORKFLOW_TESTING.md",
    "PROFESSIONAL_BLACK_THEME_UPDATE.md",
    "PROGRESS.md",
    "PROJECT_HEALTH_ANALYSIS.md",
    "PROJECT_STATUS_REPORT.md",
    "RASPBERRY_PI_FIX.md",
    "RASPBERRY_PI_SUCCESS_REPORT.md",
    "REACT_ERROR_FIX.md",
    "README_UI_DOCS.md",
    "ROUTING_FIX.md",
    "SCHEDULE_FIX_SUMMARY.md",
    "SCHEDULE_ISSUE_RESOLVED.md",
    "SOCKET_INTEGRATION_GUIDE_DEPRECATED.md",
    "TAILWIND_SETUP.md",
    "TYPESCRIPT_ERROR_FIX.md",
    "UI_CHECKLIST.md",
    "UI_FEATURES_FINAL_STATUS.md",
    "UI_IMPROVEMENTS_PHASE_1.md",
    "UI_UX_COMPLETE_SUMMARY.md",
    "UI_UX_IMPROVEMENTS_TODO.md",
    "VERIFICATION_CHECKLIST.md",
    "WORKFLOW_GUIDE.md",
    "DOCS_STRUCTURE.md"
)

foreach ($doc in $docsToRemove) {
    Remove-SafelyFile "$projectRoot\$doc"
}

Write-Host ""
Write-Host "2. Removing test files from root..." -ForegroundColor Yellow
$testFiles = @(
    "test_server.cjs",
    "test_schedule.cjs",
    "test_registration_final.js",
    "test_registration.js",
    "test_raspberry_pi_board_local.js",
    "test_raspberry_pi_board.js",
    "test_native_query.cjs",
    "test_mongoose_query.cjs",
    "test_login.js",
    "test_device_separation.js",
    "test_board_creation.js",
    "test_board_api.cjs",
    "test-websocket.js",
    "test-toggle-performance.js",
    "test-student-registration.cjs",
    "test-socket-connection.js",
    "test-registration.cjs",
    "test-permissions.js",
    "test-object-rendering.js",
    "test-model.js",
    "test-initialize.js",
    "test-gpio-api.js",
    "simple_test.js"
)

foreach ($test in $testFiles) {
    Remove-SafelyFile "$projectRoot\$test"
}

Write-Host ""
Write-Host "3. Removing check/debug scripts from root..." -ForegroundColor Yellow
$checkFiles = @(
    "check_secrets.cjs",
    "check_scheduled_content.cjs",
    "check_raspberry_pi_content.cjs",
    "check_password.js",
    "check_notices_db.cjs",
    "check_macs.mjs",
    "check_macs.js",
    "check_devices_db.cjs",
    "check_devices.cjs",
    "check_content_status.cjs",
    "check_content_schedule.cjs",
    "check_boards.cjs",
    "debug_schedule.cjs",
    "debug_notice.js",
    "debug_board_content.cjs",
    "diagnose_raspberry_pi.cjs",
    "analyze_system.cjs"
)

foreach ($check in $checkFiles) {
    Remove-SafelyFile "$projectRoot\$check"
}

Write-Host ""
Write-Host "4. Removing diagnostic scripts..." -ForegroundColor Yellow
$diagnosticFiles = @(
    "esp32_diagnostic_tool.js",
    "esp32_diagnostic.ps1",
    "esp32_network_diagnostic.ps1",
    "esp32_restart_simulation.js",
    "simple_esp32_diagnostic.ps1",
    "simple_schedule_check.cjs",
    "find_board.js",
    "network-accessibility-test.js",
    "network-test.js"
)

foreach ($diag in $diagnosticFiles) {
    Remove-SafelyFile "$projectRoot\$diag"
}

Write-Host ""
Write-Host "5. Removing utility scripts..." -ForegroundColor Yellow
$utilFiles = @(
    "create_default_content.js",
    "fix-dialogs.cjs",
    "fix-dialogs.ps1",
    "fix_schedule_switches.cjs",
    "monitor.js",
    "mqtt-broker.js",
    "mqtt-client.js",
    "mqtt-test.js",
    "update_mac.cjs",
    "update_manual_mode.cjs",
    "verify_raspberry_pi_working.cjs"
)

foreach ($util in $utilFiles) {
    Remove-SafelyFile "$projectRoot\$util"
}

Write-Host ""
Write-Host "6. Removing backend test files..." -ForegroundColor Yellow
$backendTests = @(
    "backend\test_socket_connection.js",
    "backend\test_schedule_trigger.js",
    "backend\test_role_update.js",
    "backend\test_realtime_updates.js",
    "backend\test_realtime_role_updates.js",
    "backend\test_offline_operations.js",
    "backend\test_offline.js",
    "backend\test_notice_submit.js",
    "backend\test_manual_switch.js",
    "backend\test_maintenance.js",
    "backend\test_connectivity.js",
    "backend\test_ticket.js",
    "backend\test_connection.js",
    "backend\test_comprehensive_role_updates.js",
    "backend\test_bulk_toggle.js",
    "backend\test_board_status.js",
    "backend\test_board_content.js",
    "backend\test_auth.js",
    "backend\test-runner.js",
    "backend\test-mqtt.js",
    "backend\test-faculty-registration.js",
    "backend\test-boards.cjs",
    "backend\test-api.js",
    "backend\test-analytics.js",
    "backend\test-all-roles.js"
)

foreach ($test in $backendTests) {
    Remove-SafelyFile "$projectRoot\$test"
}

Write-Host ""
Write-Host "7. Removing backend check/debug scripts..." -ForegroundColor Yellow
$backendChecks = @(
    "backend\check_board_status.js",
    "backend\check_boards.js",
    "backend\check_users.js",
    "backend\check_status.js",
    "backend\check_notices.js",
    "backend\check_manual_switches.js",
    "backend\check_gpios.js",
    "backend\check_devices.js"
)

foreach ($check in $backendChecks) {
    Remove-SafelyFile "$projectRoot\$check"
}

Write-Host ""
Write-Host "8. Removing backend test scripts folder..." -ForegroundColor Yellow
$backendScripts = @(
    "backend\scripts\testUserApproval.js",
    "backend\scripts\testRolePermissions.js",
    "backend\scripts\testLogin.js",
    "backend\scripts\testFullUserWorkflow.js",
    "backend\scripts\testEnhancedLogging.js",
    "backend\scripts\testDeviceConnection.js",
    "backend\scripts\testDeanToggle.js",
    "backend\scripts\testApiLogin.js",
    "backend\scripts\debugMac.js",
    "backend\scripts\debugDeanAccess.js"
)

foreach ($script in $backendScripts) {
    Remove-SafelyFile "$projectRoot\$script"
}

Write-Host ""
Write-Host "9. Removing test service..." -ForegroundColor Yellow
Remove-SafelyFile "$projectRoot\backend\services\testSocketService.js"

Write-Host ""
Write-Host "10. Removing unnecessary config/temp files..." -ForegroundColor Yellow
$tempFiles = @(
    "query",
    "server_error.txt",
    "server_output.txt",
    "sample_content.csv",
    "configure-ip.bat",
    "configure-ip.sh",
    "setup-windows.bat"
)

foreach ($temp in $tempFiles) {
    Remove-SafelyFile "$projectRoot\$temp"
}

Write-Host ""
Write-Host "11. Removing unused folders..." -ForegroundColor Yellow
# Remove piSignage folder (unused digital signage software)
Remove-SafelyFolder "$projectRoot\piSignage"

# Remove raspberry_pi_display folder (if not using)
Remove-SafelyFolder "$projectRoot\raspberry_pi_display"

# Remove monitoring folder (if using external monitoring)
# Remove-SafelyFolder "$projectRoot\monitoring"

# Remove mosquitto folder (if using external MQTT broker)
# Remove-SafelyFolder "$projectRoot\mosquitto"

Write-Host ""
Write-Host "12. Removing .pio folder (PlatformIO build artifacts)..." -ForegroundColor Yellow
Remove-SafelyFolder "$projectRoot\.pio"

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "Files removed: $filesRemoved" -ForegroundColor Yellow
Write-Host "Folders removed: $foldersRemoved" -ForegroundColor Yellow
Write-Host ""
Write-Host "Kept essential files:" -ForegroundColor Cyan
Write-Host "  - README.md (main documentation)" -ForegroundColor White
Write-Host "  - QUICK_START.md (setup guide)" -ForegroundColor White
Write-Host "  - QUICK_INTEGRATION_GUIDE.md (integration guide)" -ForegroundColor White
Write-Host "  - LICENSE (license file)" -ForegroundColor White
Write-Host "  - LOGIN_CREDENTIALS.md (credentials)" -ForegroundColor White
Write-Host "  - LOCAL_MONGODB_SETUP.md (database setup)" -ForegroundColor White
Write-Host "  - MQTT_README.md (MQTT setup)" -ForegroundColor White
Write-Host "  - PERMISSION_SYSTEM_README.md (permissions guide)" -ForegroundColor White
Write-Host "  - SECURE_CONFIG_README.md (security guide)" -ForegroundColor White
Write-Host "  - SYSTEM_ARCHITECTURE.md (architecture docs)" -ForegroundColor White
Write-Host "  - TESTING_FRAMEWORK_README.md (testing guide)" -ForegroundColor White
Write-Host "  - TESTING_INSTRUCTIONS.md (test instructions)" -ForegroundColor White
Write-Host "  - All source code files (src/, backend/, esp32/)" -ForegroundColor White
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
