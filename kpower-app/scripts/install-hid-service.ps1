# Install background KPower: HID bridge + web UI (at logon, auto-restart).
$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  Write-Host "Elevation required - approve the UAC prompt..."
  $scriptPath = $MyInvocation.MyCommand.Path
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList $argList
  exit $p.ExitCode
}

$root = Split-Path -Parent $PSScriptRoot
$starter = Join-Path $root "scripts\start-background.ps1"
if (-not (Test-Path $starter)) { throw "Missing $starter" }

# Ensure dist exists before registering
& $starter

$taskName = "KPowerMonitor"
$ps = (Get-Command powershell.exe).Source
$action = New-ScheduledTaskAction `
  -Execute $ps `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$starter`"" `
  -WorkingDirectory $root

$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
# Also refresh every 5 minutes so a crashed process comes back without waiting for next login
$triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Highest

# Remove legacy single-bridge task + current
foreach ($name in @("KPowerHidBridge", "KPowerWebUI", $taskName)) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
}

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger @($triggerLogon, $triggerRepeat) `
  -Settings $settings `
  -Principal $principal `
  -Description "KPower HID bridge (:3921) + web UI (:1420)" | Out-Null

Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3
& $starter

Write-Host ""
Write-Host "OK - background task '$taskName' installed."
Write-Host "  HID  http://127.0.0.1:3921/health"
Write-Host "  UI   http://127.0.0.1:1420/"
Write-Host "Remove with: npm run service:uninstall"
