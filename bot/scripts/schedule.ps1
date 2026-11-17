param(
    [string]$Time = "09:00",
    [int]$EveryHours = 0,
    [switch]$Remove
)
$ErrorActionPreference = "Stop"
$name = "PhoneCaseBot"

if ($Remove) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task: $name"
    exit 0
}

try {
    $at = [datetime]::ParseExact($Time.Trim(), [string[]]@("HH:mm", "H:mm"), [Globalization.CultureInfo]::InvariantCulture, 0)
} catch {
    Write-Host "Time must look like 09:00 or 21:30"
    exit 1
}

$botRoot = Split-Path $PSScriptRoot -Parent
$bat = Join-Path $botRoot "2_run\3_run_bot.bat"
$arg = "/c `"`"" + $bat + "`" --scheduled`""
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $arg -WorkingDirectory $botRoot
if ($EveryHours -gt 0) {
    $trigger = New-ScheduledTaskTrigger -Once -At $at -RepetitionInterval (New-TimeSpan -Hours $EveryHours) -RepetitionDuration (New-TimeSpan -Days 3650)
} else {
    $trigger = New-ScheduledTaskTrigger -Daily -At $at
}
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
    -Description "Phone case price + shop voucher bot (Shopee TH)" -Force | Out-Null

if ($EveryHours -gt 0) {
    Write-Host ("OK: '" + $name + "' will run every " + $EveryHours + " hours, starting " + $at.ToString("HH:mm"))
} else {
    Write-Host ("OK: '" + $name + "' will run every day at " + $at.ToString("HH:mm"))
}
