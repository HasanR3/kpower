# Stage all-in-one payload for Inno Setup (UI + bridge + Node runtime).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$staging = Join-Path $root "installer\staging"
$release = Join-Path $root "release"
$nmSrc = Join-Path $root "node_modules"
$cache = Join-Path $root "installer\cache"
$nodeVer = if ($env:KPOWER_NODE_VERSION) { $env:KPOWER_NODE_VERSION } else { "v24.19.0" }
$nodeZipName = "node-$nodeVer-win-x64.zip"
$nodeZip = Join-Path $cache $nodeZipName
$nodeUrl = "https://nodejs.org/dist/$nodeVer/$nodeZipName"

Write-Host "==> Building frontend"
Set-Location $root
npm run build
if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }

if (-not (Test-Path (Join-Path $nmSrc "node-hid"))) {
  throw "node-hid missing - run npm install in kpower-app first"
}

Write-Host "==> Cleaning staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path $release -Force | Out-Null
New-Item -ItemType Directory -Path $cache -Force | Out-Null

Write-Host "==> Copying app files"
Copy-Item (Join-Path $root "dist") (Join-Path $staging "dist") -Recurse

@'
{
  "name": "kpower-runtime",
  "private": true,
  "type": "module",
  "version": "0.1.0"
}
'@ | Set-Content -Path (Join-Path $staging "package.json") -Encoding UTF8

$scriptsDest = Join-Path $staging "scripts"
New-Item -ItemType Directory -Path $scriptsDest | Out-Null
foreach ($f in @(
  "ups-hid-bridge.mjs",
  "telegram-bot.mjs",
  "serve-ui.mjs",
  "Start-KPower.cmd",
  "install-hid-service.ps1",
  "uninstall-hid-service.ps1",
  "run-hid-with-control.mjs",
  "inspect-kpower-db.py",
  "read-kpower-history.mjs"
)) {
  $src = Join-Path $root "scripts\$f"
  if (Test-Path $src) { Copy-Item $src (Join-Path $scriptsDest $f) }
}

$iconsSrc = Join-Path $root "src-tauri\icons"
if (Test-Path $iconsSrc) {
  Copy-Item $iconsSrc (Join-Path $staging "icons") -Recurse
}

Write-Host "==> Copying runtime node_modules (bridge deps + transitive)"
$nmDest = Join-Path $staging "node_modules"
New-Item -ItemType Directory -Path $nmDest | Out-Null

function Copy-NpmPackage([string]$name) {
  $src = Join-Path $nmSrc $name
  if (-not (Test-Path $src)) { throw "Missing package: $name" }
  $dest = Join-Path $nmDest $name
  if (-not (Test-Path $dest)) {
    Write-Host "  + $name"
    Copy-Item $src $dest -Recurse -Force
  }
  $pkgJson = Join-Path $src "package.json"
  if (Test-Path $pkgJson) {
    $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
    if ($pkg.dependencies) {
      foreach ($depName in @($pkg.dependencies.PSObject.Properties.Name)) {
        if ($depName) { Copy-NpmPackage $depName }
      }
    }
  }
}

foreach ($top in @("node-hid", "nodemailer", "net-snmp")) {
  Copy-NpmPackage $top
}

Write-Host "==> Bundling portable Node.js $nodeVer"
if (-not (Test-Path $nodeZip)) {
  Write-Host "  Downloading $nodeUrl"
  Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
}
$nodeExtract = Join-Path $cache "node-$nodeVer-win-x64"
if (Test-Path $nodeExtract) { Remove-Item $nodeExtract -Recurse -Force }
Expand-Archive -Path $nodeZip -DestinationPath $cache -Force
$runtimeDest = Join-Path $staging "runtime"
New-Item -ItemType Directory -Path $runtimeDest | Out-Null
# Keep a slim runtime: node.exe + required dlls/licenses (no npm/npx/corepack clutter needed at runtime)
$keep = @("node.exe", "LICENSE", "README.md")
Get-ChildItem $nodeExtract -File | Where-Object { $keep -contains $_.Name -or $_.Extension -in ".dll", ".pdb" } | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $runtimeDest $_.Name) -Force
}
# node.exe often needs no extra dlls on modern Windows; copy any .dll anyway
if (-not (Test-Path (Join-Path $runtimeDest "node.exe"))) {
  throw "node.exe missing after extract"
}
& (Join-Path $runtimeDest "node.exe") -v

Write-Host "==> Staging ready at $staging"
Set-Location $root
