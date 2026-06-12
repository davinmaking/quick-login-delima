@echo off
REM ============================================================
REM  Pasang Login Launcher pada laptop makmal
REM  Klik DUA KALI fail ini (TIDAK perlu Administrator).
REM  Menyalin fail + buat ikon "Quick Login" di Desktop.
REM  Ikon buka launcher dalam Chrome MOD SAMARAN (incognito):
REM    - log masuk Google di web sahaja (tiada prompt "Turn on sync?")
REM    - tutup tetingkap = kuki log masuk terus padam (kelas seterusnya bersih)
REM  Tiada polisi registry - sebab cabang ...\Policies perlu admin.
REM ============================================================

set DEST=C:\login-launcher
set URL=file:///C:/login-launcher/index.html

echo [1/3] Menyalin fail ke %DEST% ...
robocopy "%~dp0." "%DEST%" /E /XF pasang.bat nyahpasang.bat /XD .git /NFL /NDL /NJH /NJS
if errorlevel 8 (
  echo RALAT: gagal menyalin fail ke %DEST%.
  pause
  exit /b 1
)

echo [2/3] Mencari Chrome ...
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined CHROME (
  echo RALAT: Chrome tidak dijumpai. Pasang Chrome dahulu.
  pause
  exit /b 1
)

echo [3/3] Membuat ikon "Quick Login" di Desktop ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $l=$ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Quick Login.lnk')); $l.TargetPath='%CHROME%'; $l.Arguments='--incognito --start-maximized %URL%'; $l.IconLocation='C:\login-launcher\quicklogin.ico'; $l.WindowStyle=3; $l.Save()"
if errorlevel 1 (
  echo RALAT: gagal buat ikon di Desktop.
  pause
  exit /b 1
)

echo.
echo Selesai! Ikon "Quick Login" sudah ada di Desktop.
echo Murid klik dua kali ikon itu - launcher buka dalam Chrome.
echo Ingat: TUTUP tetingkap selepas guna supaya kelas seterusnya bersih.
echo.
pause
