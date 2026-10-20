$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  $scriptPath = $MyInvocation.MyCommand.Path
  $args = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList $args
  exit $p.ExitCode
}

$taskName = "KPowerHidBridge"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed scheduled task '$taskName' (if it existed)."
