# Watchdog VlersoMjekun: mban gjalle vetem dev server-in (Next.js, porta 3005).
#
# PostgreSQL eshte tani sherbim Windows i vertete (postgresql-x64-17, Automatic
# startup) — nuk ka nevoje per supervizim, nuk vdes vete si pglite/prisma dev
# (motori eksperimental WASM i perdorur me pare, i cili crashonte periodikisht
# me "Aborted()" ne pglite — shih git history per detaje).
#
# Ekzekutohet nga Task Scheduler ne logon + cdo 20 minuta (jo 5 — me pak nevoje
# tani qe DB eshte i qendrueshem); mund te ekzekutohet edhe me dore.
#
# Lancimi eshte VERTET i padukshem (wscript.exe + WScript.Shell.Run windowStyle=0)
# — ndryshe nga Start-Process -WindowStyle Hidden qe mund te shkaktoje nje
# lampezim te shkurter te terminalit kur nis cmd.exe si ndermjetes.
$proj = "C:\Users\clien\Searches\vlersomjekun"
$logFile = Join-Path $proj "scripts\dev-up.log"
$vbs = Join-Path $proj "scripts\run-hidden.vbs"

function Write-Log($msg) {
    "$(Get-Date -Format s) $msg" | Add-Content -Path $logFile
}

# --- PostgreSQL: sherbim Windows — kontrollohet, nisje nese eshte ndalur ---
$pg = Get-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
if ($pg -and $pg.Status -ne "Running") {
    Write-Log "PostgreSQL service jo aktiv (status: $($pg.Status)) - nisje"
    Start-Service -Name "postgresql-x64-17" -ErrorAction SilentlyContinue
}

# --- Dev server (Next.js, porta 3005) ---
$webUp = [bool](Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue)
if (-not $webUp) {
    Write-Log "Web down - nisje next dev ne 3005 (padukshem)"
    $cmd = "cmd.exe /c cd /d `"$proj`" && npm run dev -- --port 3005 >> `"$proj\scripts\next-dev.log`" 2>&1"
    Start-Process -FilePath "wscript.exe" -ArgumentList "//B", "//Nologo", "`"$vbs`"", "`"$cmd`""
}
