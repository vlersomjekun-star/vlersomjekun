# Watchdog VlersoMjekun: mban gjalle DB-ne lokale (prisma dev) dhe dev server-in.
# Ekzekutohet nga Task Scheduler ne logon + cdo 5 minuta; mund te ekzekutohet edhe me dore.
$proj = "C:\Users\clien\Searches\vlersomjekun"
$logFile = Join-Path $proj "scripts\dev-up.log"

function Write-Log($msg) {
    "$(Get-Date -Format s) $msg" | Add-Content -Path $logFile
}

# --- 1. Databaza (Prisma Postgres lokale, porta 51218) ---
$dbUp = [bool](Get-NetTCPConnection -LocalPort 51218 -State Listen -ErrorAction SilentlyContinue)
if (-not $dbUp) {
    Write-Log "DB down - pastrim lock + nisje prisma dev"
    Remove-Item -Recurse -Force `
        "$env:LOCALAPPDATA\prisma-dev-nodejs\Data\vlersomjekun\.lock", `
        "$env:LOCALAPPDATA\prisma-dev-nodejs\Data\default\.lock" `
        -ErrorAction SilentlyContinue
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c npx prisma dev --name vlersomjekun >> `"$proj\scripts\prisma-dev.log`" 2>&1" `
        -WorkingDirectory $proj -WindowStyle Hidden
    # prit derisa porta te hapet (max ~40s)
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        if (Get-NetTCPConnection -LocalPort 51218 -State Listen -ErrorAction SilentlyContinue) { break }
    }
    Write-Log "DB start attempted; listening=$([bool](Get-NetTCPConnection -LocalPort 51218 -State Listen -ErrorAction SilentlyContinue))"
}

# --- 2. Dev server (Next.js, porta 3005) ---
$webUp = [bool](Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue)
if (-not $webUp) {
    Write-Log "Web down - nisje next dev ne 3005"
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c npm run dev -- --port 3005 >> `"$proj\scripts\next-dev.log`" 2>&1" `
        -WorkingDirectory $proj -WindowStyle Hidden
}
