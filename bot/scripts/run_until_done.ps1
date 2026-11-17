param(
  [int]$MaxRounds = 4,
  [int]$MinGapMinutes = 30,
  [int]$MaxGapMinutes = 60,
  [int]$CooldownHours = 0,
  [switch]$Force
)
# Runs the bot round after round until every product on the site has an image,
# so you do not have to start it again after each ~70-page round.
# It STOPS (and does not retry) when Shopee shows the anti-bot verification page, when the bot errors,
# when bot\STOP.txt exists, or after $MaxRounds rounds. Verify in the browser window yourself, then start it again.
$ErrorActionPreference = 'Continue'
$bot = Split-Path $PSScriptRoot -Parent
Set-Location $bot
$env:PYTHONUTF8 = '1'; $env:PYTHONIOENCODING = 'utf-8'
$py = Join-Path $bot '.venv\Scripts\python.exe'
if (-not (Test-Path $py)) { Write-Host '[X] Run 1_setup\1_install.bat first.'; exit 1 }
$stop = Join-Path $bot 'STOP.txt'
$products = Join-Path $bot 'data\products.json'
$lastRun = Join-Path $bot 'data\last_run.json'

function Get-MissingImages {
  try {
    $j = [IO.File]::ReadAllText($products, [Text.Encoding]::UTF8) | ConvertFrom-Json
    return @($j.products | Where-Object { -not $_.image }).Count
  } catch { return -1 }
}

# Cooldown guard: if the last run was blocked by Shopee, do not start again for $CooldownHours hours
# (use -Force only after you verified by hand in the bot browser window).
if (-not $Force -and $CooldownHours -gt 0) {
  try {
    $lr = [IO.File]::ReadAllText($lastRun, [Text.Encoding]::UTF8) | ConvertFrom-Json
    if ($lr.status -like 'blocked*') {
      $age = (Get-Date) - [datetime]::Parse($lr.started)
      if ($age.TotalHours -lt $CooldownHours) {
        Write-Host ("[!] Last run was blocked by Shopee {0:N1} hours ago ({1}). Waiting at least {2} hours before the next run to avoid a ban." -f $age.TotalHours, $lr.status, $CooldownHours)
        Write-Host '    To override after verifying by hand: run_until_done.ps1 -Force'
        exit 3
      }
    }
  } catch {}
}

$round = 0
while ($round -lt $MaxRounds) {
  if (Test-Path $stop) { Write-Host '[!] STOP.txt found - stopping.'; break }
  $missing = Get-MissingImages
  if ($missing -eq 0) { Write-Host '[OK] Every product has an image. Done.'; break }
  $round++
  Write-Host ("[{0}] Round {1}/{2} - products without image: {3}" -f (Get-Date -Format 'HH:mm:ss'), $round, $MaxRounds, $missing)
  & $py (Join-Path $bot 'bot.py') --scheduled --wait-verify
  $rc = $LASTEXITCODE
  if (Test-Path (Join-Path $bot 'scripts\publish_to_site.ps1')) {
    powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $bot 'scripts\publish_to_site.ps1')
  }
  $status = ''
  try { $status = ([IO.File]::ReadAllText($lastRun, [Text.Encoding]::UTF8) | ConvertFrom-Json).status } catch {}
  if ($status -like 'blocked*') {
    Write-Host '[!] Shopee blocked the bot (verification/login). Stopping - NOT retrying automatically. Wait several hours, then verify by hand in the bot browser window.'
    break
  }
  if ($rc -eq 3) { Write-Host '[!] Guard refused to start (cooldown after a block, daily page budget used, or another script is running). Stopping.'; break }
  if ($rc -eq 1) { Write-Host '[X] The bot reported an error - see the newest file in the logs folder. Stopping.'; break }
  $after = Get-MissingImages
  if ($after -eq 0) { Write-Host '[OK] Every product has an image. Done.'; break }
  if ($round -ge $MaxRounds) { break }
  $gap = Get-Random -Minimum $MinGapMinutes -Maximum ($MaxGapMinutes + 1)
  Write-Host ("[{0}] Waiting {1} minutes before the next round (keeps the pace slow so Shopee does not block the account)..." -f (Get-Date -Format 'HH:mm:ss'), $gap)
  for ($i = 0; $i -lt $gap * 6; $i++) { if (Test-Path $stop) { break }; Start-Sleep -Seconds 10 }
}
Write-Host ("Finished. Products without image now: {0}" -f (Get-MissingImages))
