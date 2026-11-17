param([int]$Days = 14, [switch]$IncludeLocal)
# สรุปตัวเลขจาก setup\track.log (serve.ps1 จดไว้): คนเข้า/วัน, คลิกซื้อ/วัน, สินค้าที่ถูกกดมากสุด 10 อันดับ, มาจากไหน
# เรียกผ่าน track-report.bat · ห้ามเอา BOM ออก (ไฟล์มีภาษาไทย PowerShell 5.1 ต้องมี BOM)
# -IncludeLocal = นับการเปิดจากเครื่องนี้ด้วย (ใช้ตอนทดสอบ) ปกติไม่นับ
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$here = $PSScriptRoot
$root = Split-Path -Parent $here

$files = @(Get-ChildItem (Join-Path $here 'track*.log') -ErrorAction SilentlyContinue)
if (-not $files) {
  Write-Host ''
  Write-Host 'ยังไม่มีข้อมูล — ยังไม่มีใครเปิดเว็บตั้งแต่ติดตัววัด หรือเซิร์ฟเวอร์ยังไม่ได้รีสตาร์ต (setup\check-web.bat -Fix)'
  Write-Host ''
  Read-Host 'กด Enter เพื่อปิด' | Out-Null
  exit 0
}

$since = (Get-Date).Date.AddDays(1 - $Days).ToString('yyyy-MM-dd')
$all = foreach ($f in $files) {
  foreach ($ln in [IO.File]::ReadAllLines($f.FullName)) {
    $c = $ln.Split("`t")
    if ($c.Count -lt 10) { continue }
    [pscustomobject]@{ day = $c[0].Substring(0, 10); e = $c[1]; pg = $c[2]; id = $c[3]; l = $c[4]; r = $c[5]; s = $c[6]; v = $c[7]; net = $c[8]; bot = $c[9] }
  }
}
$all = @($all | Where-Object { $_.day -ge $since })
$localN = @($all | Where-Object { $_.net -eq 'local' }).Count
$botN = @($all | Where-Object { $_.bot -eq '1' }).Count
$ev = @($all | Where-Object { $_.bot -ne '1' -and ($IncludeLocal -or $_.net -ne 'local') })

# ชื่อสินค้าจาก bot\affiliate_links.csv: ร้าน_สินค้า และโค้ดลิงก์สั้น -> ชื่อ
$names = @{}
$csv = Join-Path $root 'bot\affiliate_links.csv'
if (Test-Path $csv) {
  foreach ($row in (Import-Csv $csv -Encoding UTF8)) {
    if (-not $row.name) { continue }
    if ($row.product_url -match '/product/(\d+)/(\d+)') { $names[$Matches[1] + '_' + $Matches[2]] = $row.name }
    if ($row.affiliate_link) { $code = ($row.affiliate_link.TrimEnd('/') -split '/')[-1]; if ($code) { $names[$code] = $row.name } }
  }
}
function Get-Name($x) {
  foreach ($k in @($x.id, $x.l)) { if ($k -and $names.ContainsKey($k)) { $n = $names[$k]; if ($n.Length -gt 60) { $n = $n.Substring(0, 60) + '…' }; return $n } }
  return '(ไม่รู้ชื่อ)'
}

$scope = 'ไม่นับเครื่องนี้'
if ($IncludeLocal) { $scope = 'รวมการเปิดจากเครื่องนี้ (โหมดทดสอบ)' }
Write-Host ''
Write-Host "===== ตัววัดเว็บ — $Days วันล่าสุด ($scope) ====="
Write-Host ''
Write-Host 'วันที่        คนเข้า  เปิดหน้า  คลิกซื้อ  คนที่กดซื้อ'
$byDay = $ev | Group-Object day | Sort-Object Name -Descending
if (-not $byDay) { Write-Host '  (ยังไม่มี)' }
foreach ($g in $byDay) {
  $views = @($g.Group | Where-Object { $_.e -eq 'view' })
  $buys = @($g.Group | Where-Object { $_.e -eq 'buy' })
  $people = @($views | Select-Object -ExpandProperty v -Unique).Count
  $buyers = @($buys | Select-Object -ExpandProperty v -Unique).Count
  Write-Host ('{0}  {1,6}  {2,8}  {3,8}  {4,11}' -f $g.Name, $people, $views.Count, $buys.Count, $buyers)
}
$tv = @($ev | Where-Object { $_.e -eq 'view' }).Count
$tb = @($ev | Where-Object { $_.e -eq 'buy' }).Count
$rate = '-'
if ($tv) { $rate = ('{0:N1}%' -f (100.0 * $tb / $tv)) }
Write-Host ('รวม: เปิดหน้า {0} · คลิกซื้อ {1} · คลิกต่อการเปิดหน้า {2}' -f $tv, $tb, $rate)

Write-Host ''
Write-Host '--- สินค้าที่ถูกกดไป Shopee มากสุด 10 อันดับ ---'
$top = $ev | Where-Object { $_.e -eq 'buy' } | Group-Object { if ($_.id) { $_.id } else { $_.l } } | Sort-Object Count -Descending | Select-Object -First 10
if (-not $top) { Write-Host '  (ยังไม่มีใครกดซื้อ)' }
$i = 0
foreach ($g in $top) { $i++; Write-Host ('{0,2}. {1,4} ครั้ง  {2}  [{3}]' -f $i, $g.Count, (Get-Name $g.Group[0]), $g.Name) }

Write-Host ''
Write-Host '--- มาจากไหน (การเปิดหน้าแรกที่มาจากนอกเว็บ) ---'
$entry = @($ev | Where-Object { $_.e -eq 'view' -and $_.r -ne 'self' })
$src = $entry | Group-Object {
  if ($_.s) { 'ป้าย src=' + $_.s } elseif ($_.r) { $_.r } else { '(ไม่มีที่มา: พิมพ์เอง / แอปที่ซ่อนที่มา)' }
} | Sort-Object Count -Descending | Select-Object -First 15
if (-not $src) { Write-Host '  (ยังไม่มี)' }
foreach ($g in $src) { Write-Host ('{0,6}  {1}' -f $g.Count, $g.Name) }
Write-Host '  หมายเหตุ: ป้าย src=fbclid คือคลิกมาจาก Facebook · l.facebook.com / lm.facebook.com ก็คือ Facebook'

Write-Host ''
if ($IncludeLocal) { Write-Host ('ในตัวเลขข้างบนมีการเปิดจากเครื่องนี้ {0} ครั้ง · ไม่ได้นับบอท/ตัวพรีวิวลิงก์ {1} ครั้ง' -f $localN, $botN) }
else { Write-Host ('ไม่ได้นับ: เปิดจากเครื่องนี้ {0} ครั้ง · บอท/ตัวพรีวิวลิงก์ {1} ครั้ง' -f $localN, $botN) }
Write-Host 'ตัวเลขคลิก/ออเดอร์จริงต้องดูในหน้า Shopee Affiliate (รายงาน) ประกอบกัน'
Write-Host ''
Read-Host 'กด Enter เพื่อปิด' | Out-Null
