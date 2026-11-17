# Registers the background tasks that keep the site up (all hidden, started at logon, re-launched every 5 minutes if dead):
#   PriceCompareWeb      - serves this folder on http://localhost:5190
#   PriceCompareWatchdog - requests the site every minute and restarts whatever stopped answering
#   PriceCompareTunnel   - only if it already exists (created by connect-domain): upgraded to the hidden, self-restarting form
# Safe to run again at any time. Use -Remove to uninstall the web + watchdog tasks. ASCII only.
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_common.ps1')
if ($Remove) {
  foreach ($n in 'PriceCompareWatchdog', 'PriceCompareWeb') {
    try { Stop-ScheduledTask -TaskName $n -ErrorAction Stop } catch {}
    Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
  }
  Stop-SiteProcess 'watchdog'; Stop-SiteProcess 'web'
  Write-Host 'Removed tasks PriceCompareWeb + PriceCompareWatchdog'; exit 0
}
# Stop the watchdog first so it does not fight the re-install.
try { Stop-ScheduledTask -TaskName 'PriceCompareWatchdog' -ErrorAction Stop } catch {}
Stop-SiteProcess 'watchdog'

Register-KeepAliveTask 'PriceCompareWeb' (Join-Path $PSScriptRoot 'serve.ps1') '-Port 5190' 'price-compare website on localhost:5190'
Restart-SiteTask 'PriceCompareWeb' 'web'

$tt = Get-ScheduledTask -TaskName 'PriceCompareTunnel' -ErrorAction SilentlyContinue
if ($tt) {
  $old = [string]$tt.Actions[0].Arguments
  $cred = $null
  if ($old -match "--credentials-file '([^']+)'") { $cred = $Matches[1] } elseif ($old -match '-Cred "([^"]+)"') { $cred = $Matches[1] }
  if ($cred) {
    Register-KeepAliveTask 'PriceCompareTunnel' (Join-Path $PSScriptRoot 'tunnel.ps1') "-Cred `"$cred`"" 'price-compare Cloudflare tunnel -> localhost:5190'
    Restart-SiteTask 'PriceCompareTunnel' 'tunnel'
  } else { Write-Host 'PriceCompareTunnel exists but its credentials path was not recognised - left unchanged (run connect-domain.bat).' -ForegroundColor Yellow }
}

Register-KeepAliveTask 'PriceCompareWatchdog' (Join-Path $PSScriptRoot 'watchdog.ps1') '' 'restarts the price-compare web server / tunnel when the site stops answering'
Start-ScheduledTask -TaskName 'PriceCompareWatchdog'
Write-Host 'Installed + started. Open http://localhost:5190  (status: setup\check-web.bat)' -ForegroundColor Green
