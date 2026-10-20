# Ensure HID bridge (:3921) and static UI (:1420) are running.
# Safe to call repeatedly (idempotent). Used by scheduled tasks + manual start.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Get-NodeExe {
  $bundled = Join-Path $root "runtime\node.exe"
  if (Test-Path $bundled) { return $bundled }
  return (Get-Command node -ErrorAction Stop).Source
}

function Test-PortOpen([int]$Port) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $Port)
    $c.Close()
    return $true
  } catch {
    return $false
  }
}

function Start-KPowerProcess([string]$ScriptRel, [string]$Title) {
  $node = Get-NodeExe
  $script = Join-Path $root $ScriptRel
  if (-not (Test-Path $script)) { throw "Missing $script" }
  Start-Process -FilePath $node -ArgumentList "`"$script`"" -WorkingDirectory $root -WindowStyle Hidden
  Write-Host "Started $Title"
}

$dist = Join-Path $root "dist\index.html"
if (-not (Test-Path $dist)) {
  Write-Host "Building UI (dist missing)..."
  Push-Location $root
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
  } finally {
    Pop-Location
  }
}

if (-not (Test-PortOpen 3921)) {
  Start-KPowerProcess "scripts\ups-hid-bridge.mjs" "HID bridge :3921"
} else {
  Write-Host "HID bridge already on :3921"
}

if (-not (Test-PortOpen 1420)) {
  Start-KPowerProcess "scripts\serve-ui.mjs" "Web UI :1420"
} else {
  Write-Host "Web UI already on :1420"
}

Start-Sleep -Seconds 2

$hidOk = $false
$uiOk = $false
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:3921/health" -TimeoutSec 3
  $hidOk = [bool]$h.ok
  Write-Host "HID health ok connected=$($h.connected)"
} catch {
  Write-Host "HID not ready yet (close stock KPower if USB is busy)"
}
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:1420/" -UseBasicParsing -TimeoutSec 3
  $uiOk = $r.StatusCode -eq 200
  Write-Host "UI http://127.0.0.1:1420/ status=$($r.StatusCode)"
} catch {
  Write-Host "UI not ready on http://127.0.0.1:1420/"
}

if ($hidOk -and $uiOk) { exit 0 }
exit 1
