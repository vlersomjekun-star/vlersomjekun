@echo off
rem Regjistron task-un e Windows qe mban gjalle VlersoMjekun (logon + cdo 5 min)
schtasks /Create /TN "VlersoMjekun Dev" /TR "powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"C:\Users\clien\Searches\vlersomjekun\scripts\dev-up.ps1\"" /SC MINUTE /MO 5 /F
schtasks /Create /TN "VlersoMjekun Dev Logon" /TR "powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"C:\Users\clien\Searches\vlersomjekun\scripts\dev-up.ps1\"" /SC ONLOGON /F
