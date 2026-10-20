# SAC-safe all-in-one install: copies the staged app (with bundled Node) to Program Files.
# Use this when Smart App Control blocks KPower-Setup-*.exe.
# Run: powershell -ExecutionPolicy Bypass -File scripts\Install-KPower.ps1
$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$root = Split-Path -Parent $PSScriptRoot
$staging = Join-Path $root "installer\staging"
$dest = Join-Path $env:ProgramFiles "KPower"

if (-not (Test-Path (Join-Path $staging "runtime\node.exe"))) {
  Write-Host "Staging incomplete - building payload first..."
  & (Join-Path $PSScriptRoot "prepare-installer.ps1")
}

if (-not (Test-IsAdmin)) {
  Write-Host "Elevation required - approve UAC..."
  $p = Start-Process -FilePath "powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`""
  )
  exit $p.ExitCode
}

Write-Host "==> Installing to $dest"
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path $dest | Out-Null
Copy-Item "$staging\*" $dest -Recurse -Force

$start = Join-Path $dest "scripts\Start-KPower.cmd"
$wsh = New-Object -ComObject WScript.Shell
$programs = [Environment]::GetFolderPath("Programs")
$lnkPath = Join-Path $programs "KPower Monitor.lnk"
$lnk = $wsh.CreateShortcut($lnkPath)
$lnk.TargetPath = $start
$lnk.WorkingDirectory = $dest
$lnk.IconLocation = (Join-Path $dest "icons\icon.ico")
$lnk.Save()

Write-Host "Installed. Launching..."
Start-Process -FilePath $start -WorkingDirectory $dest
Write-Host "OK - Start Menu: KPower Monitor"
Write-Host "Optional background HID: powershell -ExecutionPolicy Bypass -File `"$dest\scripts\install-hid-service.ps1`""
