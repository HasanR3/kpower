$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  Write-Host "Elevation required - approve the UAC prompt..."
  $scriptPath = $MyInvocation.MyCommand.Path
  $args = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList $args
  exit $p.ExitCode
}

$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $root "scripts\ups-hid-bridge.mjs"
$taskName = "KPowerHidBridge"

if (-not (Test-Path $script)) { throw "Bridge script missing: $script" }

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 2

try {
  $snap = Invoke-RestMethod -Uri "http://127.0.0.1:3921/snapshot" -TimeoutSec 3
  Write-Host "OK - task '$taskName' registered. Device connected=$($snap.connected)"
} catch {
  Write-Host "Task registered. If snapshot fails, close stock KPower then run: npm run hid"
}

Write-Host "Telemetry: http://127.0.0.1:3921/snapshot"
Write-Host "Remove with: npm run service:uninstall"
