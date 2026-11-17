param([Parameter(Mandatory = $true)][string]$Cred, [int]$Port = 5190, [string]$Name = 'price-compare', [int]$MetricsPort = 20241)
# Keeps the Cloudflare tunnel alive: runs cloudflared, copies its output to setup\tunnel.log (size-capped),
# and starts it again whenever it exits. Started hidden by the task "PriceCompareTunnel". ASCII only.
. (Join-Path $PSScriptRoot '_common.ps1')
$cf = Join-Path $env:LOCALAPPDATA 'cloudflared\cloudflared.exe'
$logFile = Join-Path $PSScriptRoot 'tunnel.log'
$quick = 0
while ($true) {
  if (-not (Test-Path $cf)) { Write-LogFile $logFile "cloudflared.exe missing: $cf"; Start-Sleep 60; continue }
  if (-not (Test-Path $Cred)) { Write-LogFile $logFile "credentials file missing: $Cred"; Start-Sleep 60; continue }
  Write-LogFile $logFile "starting cloudflared (supervisor pid $PID)"
  $started = Get-Date
  & $cf tunnel --no-autoupdate --metrics "127.0.0.1:$MetricsPort" run --credentials-file $Cred --url "http://localhost:$Port" --http-host-header "localhost:$Port" $Name 2>&1 |
    ForEach-Object { Write-LogFile $logFile ([string]$_) }
  $ran = [int]((Get-Date) - $started).TotalSeconds
  Write-LogFile $logFile "cloudflared exited (code $LASTEXITCODE) after ${ran}s"
  # Back off when it dies straight away (no network yet, port still held...) so the log is not flooded.
  if ($ran -lt 30) { $quick++ } else { $quick = 0 }
  Start-Sleep ([Math]::Min(60, 5 + 10 * $quick))
}
