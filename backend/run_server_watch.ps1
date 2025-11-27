$log = Join-Path $PSScriptRoot 'server.log'
$err = Join-Path $PSScriptRoot 'server.err'

# Keep server running and append stdout/stderr to log files
while ($true) {
  "$([datetime]::UtcNow.ToString('u')) - Starting server" | Out-File $log -Append
  # Run node; stdout -> server.log, stderr -> server.err
  node server.js >> $log 2>> $err
  "$([datetime]::UtcNow.ToString('u')) - Server process exited. Restarting in 1s..." | Out-File $log -Append
  Start-Sleep -Seconds 1
}
