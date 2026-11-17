param([int]$Port = 5190, [string]$SiteHost = 'price.example.com', [switch]$Fix)
# Shows whether the site is up (tasks, local server, tunnel, public address) and the latest log lines.
# -Fix restarts the three tasks. Run via check-web.bat. ASCII only.
. (Join-Path $PSScriptRoot '_common.ps1')
if ($Fix) {
  Write-Host 'Restarting web, tunnel and watchdog...'
  Restart-SiteTask 'PriceCompareWeb' 'web'
  if (Get-ScheduledTask -TaskName 'PriceCompareTunnel' -ErrorAction SilentlyContinue) { Restart-SiteTask 'PriceCompareTunnel' 'tunnel' }
  Restart-SiteTask 'PriceCompareWatchdog' 'watchdog'
  Start-Sleep 15
}
function Show([string]$label, [bool]$ok, [string]$detail) {
  Write-Host ("{0,-10}" -f $label) -NoNewline
  if ($ok) { Write-Host 'OK    ' -ForegroundColor Green -NoNewline } else { Write-Host 'FAIL  ' -ForegroundColor Red -NoNewline }
  Write-Host $detail
}
Write-Host "== price-compare site status  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =="
foreach ($n in 'PriceCompareWeb', 'PriceCompareTunnel', 'PriceCompareWatchdog') {
  $t = Get-ScheduledTask -TaskName $n -ErrorAction SilentlyContinue
  if ($t) { Show 'task' ($t.State -eq 'Running') "$n : $($t.State)" } else { Show 'task' $false "$n : not installed" }
}
$c = Get-HttpStatus "http://localhost:$Port/" 10000 -NoProxy
Show 'web' ($c -eq 200) "http://localhost:$Port/ -> $c"
$r = Get-TunnelReady
Show 'tunnel' ($r -ge 1) "connections to Cloudflare: $r"
Show 'internet' (Test-Internet) 'reach 1.1.1.1:443'
$p = Get-HttpStatus "https://$SiteHost/" 20000
Show 'public' ($p -eq 200) "https://$SiteHost/ -> $p"
foreach ($f in 'watchdog.log', 'serve.log', 'tunnel.log') {
  $path = Join-Path $PSScriptRoot $f
  Write-Host "`n-- $f (last 8 lines)" -ForegroundColor Cyan
  if (Test-Path $path) { Get-Content $path -Tail 8 } else { Write-Host '(no log yet)' }
}
