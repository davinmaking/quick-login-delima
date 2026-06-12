@echo off
REM ============================================================
REM  Nyahpasang Login Launcher (buang ikon + fail).
REM  Klik DUA KALI fail ini (TIDAK perlu Administrator).
REM ============================================================

echo [1/2] Membuang ikon "Quick Login" dari Desktop ...
powershell -NoProfile -Command "Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Quick Login.lnk') -ErrorAction SilentlyContinue"
del "%USERPROFILE%\Desktop\Quick Login.lnk" 2>nul

echo [2/2] Membuang fail C:\login-launcher ...
cd /d C:\
rmdir /s /q C:\login-launcher 2>nul

echo.
echo Selesai. Login Launcher telah dibuang.
echo.
pause
