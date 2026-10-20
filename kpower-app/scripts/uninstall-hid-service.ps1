$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  $scriptPath = $MyInvocation.MyCommand.Path
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList $argList
  exit $p.ExitCode
}

foreach ($name in @("KPowerMonitor", "KPowerHidBridge", "KPowerWebUI")) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task '$name' (if it existed)."
}

# Stop listeners if still up
Get-NetTCPConnection -LocalPort 3921,1420 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    try {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped PID $($_.OwningProcess) on port $($_.LocalPort)"
    } catch {}
  }
