# Prepare staging + compile Inno Setup → release\KPower-Setup-0.1.0.exe
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

& (Join-Path $PSScriptRoot "prepare-installer.ps1")

$isccCandidates = @(
  "$env:LocalAppData\Programs\Inno Setup 6\ISCC.exe",
  "$env:LocalAppData\Programs\Inno Setup 7\ISCC.exe",
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
  "${env:ProgramFiles(x86)}\Inno Setup 7\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 7\ISCC.exe"
)
$iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  Write-Host "==> Installing Inno Setup via winget"
  winget install --id JRSoftware.InnoSetup -e --accept-package-agreements --accept-source-agreements
  $iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $iscc) { throw "ISCC.exe not found after Inno Setup install" }

Write-Host "==> Compiling installer with $iscc"
& $iscc (Join-Path $root "installer\kpower.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compile failed" }

Get-ChildItem (Join-Path $root "release") -Filter "KPower-Setup-*.exe" |
  ForEach-Object { Write-Host "OK $($_.FullName) ($([math]::Round($_.Length/1MB,1)) MB)" }
