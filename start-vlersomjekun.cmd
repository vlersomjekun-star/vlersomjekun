@echo off
rem Nisje manuale e VlersoMjekun (DB + sito) - dopo, apri http://localhost:3005
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev-up.ps1"
echo.
echo VlersoMjekun po niset... hap http://localhost:3005 pas ~20 sekondash.
timeout /t 5 >nul
start http://localhost:3005
