param([int]$Port = 5190)
# Static file server for the website (no Node/Python needed).
# SECURITY: only index.html, sitemap.xml, robots.txt, assets\ and pages\ are public. bot\, data\, docs\, setup\, tools\, .claude\ are NEVER served
# (bot\chrome_profile holds the Shopee login cookies; bot\config.json and affiliate_links.csv are private).
$root = (Split-Path -Parent $PSScriptRoot).TrimEnd('\')
$publicDirs = @('assets', 'pages') | ForEach-Object { $root + '\' + $_ + '\' }
$publicFiles = @('index.html', 'sitemap.xml', 'robots.txt') | ForEach-Object { $root + '\' + $_ }
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.webp'='image/webp'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.ico'='image/x-icon'; '.woff2'='font/woff2'; '.xml'='application/xml; charset=utf-8'; '.txt'='text/plain; charset=utf-8' }
$csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
$logFile = Join-Path $PSScriptRoot 'serve.log'
function Write-Log([string]$msg) {
  try {
    if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) { Move-Item $logFile "$logFile.old" -Force }
    Add-Content $logFile ("{0} {1}" -f (Get-Date -Format s), $msg)
  } catch {}
}
# Event counter (POST /t?e=view|buy&pg=&id=&l=&r=&s=) -> setup\track.log, one tab-separated line per event:
#   time  event  page  productId  linkCode  refHost  source  visitor  net  bot
# Privacy: no IP is stored. visitor = 8 hex of SHA256(random salt kept in memory, new each day | IP | user agent),
# so it counts unique visitors per day but cannot be traced back. net = cf (came through the tunnel) or local (this PC).
# Safety: the body is never read (data is in the query string), every field is whitelisted + cut short,
# rate-limited per visitor/minute, and Write-Track swallows all errors so it can never stop the server loop.
$trackFile = Join-Path $PSScriptRoot 'track.log'
$trackDay = ''; $trackSalt = ''; $trackMin = ''; $trackHits = @{}; $trackTotal = 0
function Get-Clean([string]$s, [int]$n) {
  if (-not $s) { return '' }
  $s = $s -replace '[^\w.\-:]', ''
  if ($s.Length -gt $n) { $s = $s.Substring(0, $n) }
  return $s
}
function Write-Track($ctx) {
  try {
    $q = $ctx.Request
    if ($q.HttpMethod -ne 'POST') { return }
    $org = $q.Headers['Origin']
    if ($org -and $org -ne 'null') { try { if (([Uri]$org).Host -notmatch '^(localhost|127\.0\.0\.1|(.+\.)?example.com)$') { return } } catch { return } }
    $e = $q.QueryString['e']
    if ($e -ne 'view' -and $e -ne 'buy') { return }
    $now = Get-Date
    $day = $now.ToString('yyyy-MM-dd')
    if ($day -ne $script:trackDay) { $script:trackDay = $day; $script:trackSalt = [guid]::NewGuid().ToString() }
    $ip = $q.Headers['CF-Connecting-IP']
    $net = 'cf'
    if (-not $ip) { $ip = [string]$q.RemoteEndPoint.Address; $net = 'local' }
    $ua = [string]$q.UserAgent
    $sha = [Security.Cryptography.SHA256]::Create()
    $h = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($script:trackSalt + '|' + $ip + '|' + $ua))
    $sha.Dispose()
    $vid = ($h[0..3] | ForEach-Object { $_.ToString('x2') }) -join ''
    $min = $now.ToString('HHmm')
    if ($min -ne $script:trackMin) { $script:trackMin = $min; $script:trackHits = @{}; $script:trackTotal = 0 }
    $script:trackTotal++
    $script:trackHits[$vid] = 1 + [int]$script:trackHits[$vid]
    if ($script:trackTotal -gt 600 -or $script:trackHits[$vid] -gt 20) { return }
    $bot = '0'
    if ($ua -match 'bot|crawl|spider|slurp|facebookexternalhit|preview') { $bot = '1' }
    $f = @($now.ToString('s'), $e, (Get-Clean $q.QueryString['pg'] 40), (Get-Clean $q.QueryString['id'] 60), (Get-Clean $q.QueryString['l'] 60),
      (Get-Clean $q.QueryString['r'] 60), (Get-Clean $q.QueryString['s'] 30), $vid, $net, $bot)
    if ((Test-Path $trackFile) -and (Get-Item $trackFile).Length -gt 5MB) {
      Move-Item $trackFile (Join-Path $PSScriptRoot ('track-' + $now.ToString('yyyyMMdd-HHmmss') + '.log')) -Force
      Get-ChildItem (Join-Path $PSScriptRoot 'track-*.log') | Sort-Object Name -Descending | Select-Object -Skip 20 | Remove-Item -Force
    }
    [IO.File]::AppendAllText($trackFile, ($f -join "`t") + "`r`n")
  } catch { Write-Log "track: $($_.Exception.Message)" }
}
function New-Listener {
  $x = New-Object System.Net.HttpListener
  $x.Prefixes.Add("http://localhost:$Port/")
  $x.Start()
  Write-Log "listening on http://localhost:$Port/ (pid $PID)"
  return $x
}
# Self-check: http.sys accepts TCP on the port only while our prefix is registered.
# (Seen 2026-11-10: process alive, listener silently gone -> connection refused -> 502 on the domain.)
function Test-Port {
  $t = New-Object Net.Sockets.TcpClient
  try { $ar = $t.BeginConnect('127.0.0.1', $Port, $null, $null); return ($ar.AsyncWaitHandle.WaitOne(3000) -and $t.Connected) }
  catch { return $false } finally { $t.Close() }
}
function Reset-Listener([string]$why) {
  Write-Log "restarting listener: $why"
  try { $script:l.Close() } catch {}
  $script:l = $null; $script:pending = $null
}
Write-Host "serving index.html + assets + pages from $root on http://localhost:$Port/"
$l = $null; $pending = $null; $lastCheck = Get-Date; $startFails = 0
while ($true) {
  if (-not $l -or -not $l.IsListening) {
    try { if ($l) { try { $l.Close() } catch {} }; $l = New-Listener; $pending = $null; $startFails = 0 }
    catch { $l = $null; $startFails++; if ($startFails -le 3 -or $startFails % 60 -eq 0) { Write-Log "start failed ($startFails): $($_.Exception.Message)" }; Start-Sleep 5; continue }
  }
  if (-not $pending) {
    try { $pending = $l.BeginGetContext($null, $null) } catch { Reset-Listener "BeginGetContext: $($_.Exception.Message)"; Start-Sleep 1; continue }
  }
  if (-not $pending.AsyncWaitHandle.WaitOne(15000)) {
    if (((Get-Date) - $lastCheck).TotalSeconds -ge 60) {
      $lastCheck = Get-Date
      if (-not (Test-Port)) { Reset-Listener 'port not accepting connections' }
    }
    continue
  }
  try { $c = $l.EndGetContext($pending) } catch { $pending = $null; Write-Log "GetContext: $($_.Exception.Message)"; continue }
  $pending = $null
  try {
    $r = $c.Response
    $r.Headers.Add('X-Content-Type-Options', 'nosniff')
    $r.Headers.Add('X-Frame-Options', 'DENY')
    $r.Headers.Add('Referrer-Policy', 'strict-origin-when-cross-origin')
    $r.Headers.Add('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    $r.Headers.Add('Content-Security-Policy', $csp)
    $r.Headers.Remove('Server')
    $method = $c.Request.HttpMethod
    if ($c.Request.Url.AbsolutePath -eq '/t') { Write-Track $c; $r.StatusCode = 204; $r.Close(); continue }
    if ($method -ne 'GET' -and $method -ne 'HEAD') { $r.StatusCode = 405; $r.Close(); continue }
    $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath)
    if ($p.Contains([string][char]0) -or $p.Contains('\')) { $r.StatusCode = 400; $r.Close(); continue }
    if ($p.EndsWith('/')) { $p += 'index.html' }
    $f = [IO.Path]::GetFullPath((Join-Path $root $p.TrimStart('/')))
    $ok = ($publicFiles -contains $f) -or ($publicDirs | Where-Object { $f.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) })
    if ($ok -and (Test-Path -LiteralPath $f -PathType Leaf)) {
      $b = [IO.File]::ReadAllBytes($f)
      $ext = [IO.Path]::GetExtension($f).ToLower()
      $r.ContentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
      # ข้อมูลที่บอทเขียนทับบ่อย (accessories.js, live.js, json, html) ห้ามให้เบราว์เซอร์/Cloudflare จำของเก่า — รูปภาพ/ฟอนต์ยังแคชได้
      if ($ext -in '.js', '.json', '.html', '.css', '.xml', '.txt') { $r.Headers.Add('Cache-Control', 'no-cache, max-age=0') }
      $r.ContentLength64 = $b.Length
      if ($method -eq 'GET') { $r.OutputStream.Write($b, 0, $b.Length) }
    } else { $r.StatusCode = 404 }
  } catch { Write-Log "request $($c.Request.Url.AbsolutePath): $($_.Exception.Message)"; try { $c.Response.StatusCode = 500 } catch {} }
  try { $c.Response.Close() } catch {}
}
