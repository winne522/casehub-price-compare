# Shared helpers for the site's background tasks (dot-sourced by the install / watchdog scripts). ASCII only.

# Registers a keep-alive task: starts at logon, is re-launched every 5 minutes if it is not running, no time limit.
# conhost --headless = no window at all. (With Windows Terminal as the default terminal, "-WindowStyle Hidden" still
# left a visible tab; closing that tab killed the web server and the tunnel - seen 2026-11-10.)
function Register-KeepAliveTask([string]$Name, [string]$Script, [string]$ScriptArgs = '', [string]$Description = '') {
  $arg = ("--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Script`" $ScriptArgs").Trim()
  $action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\conhost.exe') -Argument $arg -WorkingDirectory (Split-Path -Parent (Split-Path -Parent $Script))
  $logon = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
  $every = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 5)
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $logon, $every -Settings $settings -Description $Description -Force | Out-Null
}

# Kills the processes of one part of the site, matched by command line. Kind: web | tunnel | watchdog
function Stop-SiteProcess([string]$Kind, [string]$TunnelName = 'price-compare') {
  $me = $PID
  $tunnelEnd = [regex]::Escape($TunnelName) + '\s*"?\s*$'
  Get-CimInstance Win32_Process | Where-Object {
    $c = $_.CommandLine
    if (-not $c -or $_.ProcessId -eq $me) { return $false }
    switch ($Kind) {
      'web'      { $c -like '*\setup\serve.ps1*' }
      'watchdog' { $c -like '*\setup\watchdog.ps1*' }
      'tunnel'   { ($c -like '*\setup\tunnel.ps1*') -or (($c -like '*cloudflared*') -and ($c -match $tunnelEnd)) }
      default    { $false }
    }
  } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
}

# Stop -> kill leftovers -> start. Safe to call when the task is not running.
function Restart-SiteTask([string]$Task, [string]$Kind) {
  try { Stop-ScheduledTask -TaskName $Task -ErrorAction Stop } catch {}
  Stop-SiteProcess $Kind
  Start-Sleep 2
  Start-ScheduledTask -TaskName $Task
}

function Write-LogFile([string]$File, [string]$Msg) {
  try {
    if ((Test-Path $File) -and (Get-Item $File).Length -gt 1MB) { Move-Item $File "$File.old" -Force }
    Add-Content $File ("{0} {1}" -f (Get-Date -Format s), $Msg)
  } catch {}
}

# Returns the HTTP status code (0 = no answer at all).
function Get-HttpStatus([string]$Url, [int]$TimeoutMs = 10000, [switch]$NoProxy) {
  try {
    $req = [Net.HttpWebRequest]::Create($Url)
    $req.Method = 'HEAD'; $req.Timeout = $TimeoutMs; $req.AllowAutoRedirect = $false; $req.KeepAlive = $false
    if ($NoProxy) { $req.Proxy = $null }
    $resp = $req.GetResponse(); $code = [int]$resp.StatusCode; $resp.Close(); return $code
  } catch {
    $e = $_.Exception.GetBaseException()
    if ($e -is [Net.WebException] -and $e.Response) { $code = [int]$e.Response.StatusCode; $e.Response.Close(); return $code }
    return 0
  }
}

# Number of live connections from cloudflared to Cloudflare (-1 = cloudflared not answering on its metrics port).
function Get-TunnelReady([int]$MetricsPort = 20241) {
  try {
    $req = [Net.HttpWebRequest]::Create("http://127.0.0.1:$MetricsPort/ready")
    $req.Timeout = 5000; $req.Proxy = $null; $req.KeepAlive = $false
    $resp = $req.GetResponse()
  } catch {
    $e = $_.Exception.GetBaseException()
    if ($e -is [Net.WebException] -and $e.Response) { $resp = $e.Response } else { return -1 }
  }
  try {
    $sr = New-Object IO.StreamReader($resp.GetResponseStream()); $body = $sr.ReadToEnd(); $sr.Close(); $resp.Close()
    if ($body -match '"readyConnections"\s*:\s*(\d+)') { return [int]$Matches[1] }
  } catch {}
  return -1
}

function Test-Internet {
  $t = New-Object Net.Sockets.TcpClient
  try { $ar = $t.BeginConnect('1.1.1.1', 443, $null, $null); return ($ar.AsyncWaitHandle.WaitOne(4000) -and $t.Connected) }
  catch { return $false } finally { $t.Close() }
}
