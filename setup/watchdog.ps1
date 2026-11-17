param([int]$Port = 5190, [string]$SiteHost = 'price.example.com', [int]$MetricsPort = 20241)
# Independent health check for the site. Every 30 s it really requests the page (not just "is the port open"),
# and restarts the part that is broken. Started hidden by the task "PriceCompareWatchdog". Log: setup\watchdog.log
#   web    : http://localhost:$Port/ must answer 200         -> 2 misses in a row = restart PriceCompareWeb
#   tunnel : cloudflared must hold >= 1 edge connection       -> 4 misses in a row (internet up) = restart PriceCompareTunnel
#   (while something is failing it re-checks every 15 s)
#   public : https://$SiteHost/ every 5 min, 5xx from the edge -> 3 in a row (15 min) = restart PriceCompareTunnel
# ASCII only.
. (Join-Path $PSScriptRoot '_common.ps1')
$logFile = Join-Path $PSScriptRoot 'watchdog.log'
function Log([string]$m) { Write-LogFile $logFile $m }
Log "watchdog started (pid $PID)"
$webFail = 0; $tunFail = 0; $pubFail = 0; $netDown = $false; $lastPub = [datetime]::MinValue
while ($true) {
  try {
    # --- web server on this PC
    $code = Get-HttpStatus "http://localhost:$Port/" 10000 -NoProxy
    $webOk = ($code -eq 200)
    if ($webOk) { if ($webFail -gt 0) { Log 'web: OK again' }; $webFail = 0 }
    else {
      $webFail++
      Log "web: no 200 from localhost:$Port (got $code), miss $webFail"
      if ($webFail -ge 2) { Log 'web: restarting PriceCompareWeb'; Restart-SiteTask 'PriceCompareWeb' 'web'; $webFail = 0; Start-Sleep 10 }
    }

    # --- tunnel (only when this PC is set up with a domain)
    if (Get-ScheduledTask -TaskName 'PriceCompareTunnel' -ErrorAction SilentlyContinue) {
      $ready = Get-TunnelReady $MetricsPort
      if ($ready -ge 1) {
        if ($tunFail -gt 0) { Log "tunnel: OK again ($ready connections)" }
        if ($netDown) { Log 'internet: back'; $netDown = $false }
        $tunFail = 0
      } elseif (-not (Test-Internet)) {
        # Nothing to restart: cloudflared reconnects by itself when the network returns.
        if (-not $netDown) { Log 'internet: unreachable from this PC (site is offline until it returns)'; $netDown = $true }
        $tunFail = 0
      } else {
        if ($netDown) { Log 'internet: back'; $netDown = $false }
        $tunFail++
        Log "tunnel: not connected (ready=$ready), miss $tunFail"
        if ($tunFail -ge 4) { Log 'tunnel: restarting PriceCompareTunnel'; Restart-SiteTask 'PriceCompareTunnel' 'tunnel'; $tunFail = 0; $pubFail = 0; Start-Sleep 20 }
      }

      # --- the real address, as visitors see it
      if ($webOk -and $ready -ge 1 -and ((Get-Date) - $lastPub).TotalMinutes -ge 5) {
        $lastPub = Get-Date
        $pc = Get-HttpStatus "https://$SiteHost/" 20000
        if ($pc -ge 500) {
          # Only a real answer from Cloudflare counts; 0 = this PC could not look the name up, a restart would not help.
          $pubFail++
          Log "public: https://$SiteHost/ answered $pc while web and tunnel look fine, miss $pubFail"
          if ($pubFail -ge 3) { Log 'public: restarting PriceCompareTunnel'; Restart-SiteTask 'PriceCompareTunnel' 'tunnel'; $pubFail = 0; Start-Sleep 20 }
        } else {
          if ($pubFail -gt 0 -and $pc -eq 200) { Log 'public: OK again' }
          if ($pc -ne 0) { $pubFail = 0 }
        }
      }
    }
  } catch { Log "watchdog error: $($_.Exception.Message)" }
  # Look again sooner while something is failing, so recovery takes well under a minute.
  if ($webFail -gt 0 -or $tunFail -gt 0) { Start-Sleep 15 } else { Start-Sleep 30 }
}
