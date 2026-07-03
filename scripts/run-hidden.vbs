' Esegue un comando in modo VERAMENTE invisibile (0 = finestra nascosta),
' a differenza di Start-Process -WindowStyle Hidden di PowerShell che a volte
' lascia un breve lampeggio quando lancia cmd.exe come intermediario.
' Uso: wscript.exe //B //Nologo run-hidden.vbs "comando completo"
Set objShell = CreateObject("WScript.Shell")
objShell.Run WScript.Arguments(0), 0, False
