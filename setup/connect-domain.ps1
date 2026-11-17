# One-time: creates Cloudflare tunnel "price-compare", points price.example.com at it, and registers a logon task
# that keeps the tunnel running (serves http://localhost:5190 = this folder only). Run via connect-domain.bat.
param([string]$SiteHost = 'price.example.com', [switch]$Remove)
$ErrorActionPreference = 'Stop'
$cf = Join-Path $env:LOCALAPPDATA 'cloudflared\cloudflared.exe'
$task = 'PriceCompareTunnel'
if ($Remove) { . (Join-Path $PSScriptRoot '_common.ps1'); try { Stop-ScheduledTask -TaskName $task -ErrorAction Stop } catch {}; Stop-SiteProcess 'tunnel'; Unregister-ScheduledTask -TaskName $task -Confirm:$false -ErrorAction SilentlyContinue; Write-Host "Removed task $task (DNS record stays in Cloudflare)"; exit 0 }
if (-not (Test-Path $cf)) { Write-Host "cloudflared.exe missing: $cf" -ForegroundColor Red; exit 1 }
$t = (& $cf tunnel list -o json | ConvertFrom-Json) | Where-Object { $_.name -eq 'price-compare' }
if (-not $t) { & $cf tunnel create price-compare; $t = (& $cf tunnel list -o json | ConvertFrom-Json) | Where-Object { $_.name -eq 'price-compare' } }
$cred = Join-Path $env:USERPROFILE ".cloudflared\$($t.id).json"
if (-not (Test-Path $cred)) { Write-Host "credentials file missing: $cred" -ForegroundColor Red; exit 1 }
& $cf tunnel route dns price-compare $SiteHost
. (Join-Path $PSScriptRoot '_common.ps1')
Register-KeepAliveTask $task (Join-Path $PSScriptRoot 'tunnel.ps1') "-Cred `"$cred`"" 'price-compare Cloudflare tunnel -> localhost:5190'
Restart-SiteTask $task 'tunnel'
# (Re)installs the web server + the watchdog that restarts either part when the site stops answering.
& (Join-Path $PSScriptRoot 'install-web-autostart.ps1')
Write-Host "Done. Open https://$SiteHost (may take a minute)" -ForegroundColor Green
