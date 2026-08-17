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

echo [1/4] Menyemak fail pemasang ...
if /i "%~dp0."=="%~d0\." (
  echo.
  echo RALAT: pasang.bat berada di AKAR pemacu ^(%~d0\^).
  echo Ekstrak zip ke dalam SATU FOLDER dahulu, contoh %~d0\quick-login\,
  echo kemudian klik dua kali pasang.bat dari dalam folder itu.
  echo.
  pause
  exit /b 1
)
if not exist "%~dp0index.html" (
  echo.
  echo RALAT: index.html tiada di sebelah pasang.bat.
  echo Anda mungkin menjalankan pasang.bat terus dari dalam fail zip.
  echo Sila EKSTRAK zip sepenuhnya dahulu, kemudian klik dua kali pasang.bat.
  echo.
  pause
  exit /b 1
)
if not exist "%~dp0data\roster.js" (
  echo.
  echo RALAT: data\roster.js tiada. Zip belum diekstrak sepenuhnya.
  echo Ekstrak zip sepenuhnya dahulu, kemudian klik dua kali pasang.bat.
  echo.
  pause
  exit /b 1
)

echo [2/4] Menyalin fail ke %DEST% ...
robocopy "%~dp0." "%DEST%" /E /XF pasang.bat nyahpasang.bat /XD .git /NFL /NDL /NJH /NJS
if errorlevel 8 (
  echo.
  echo RALAT: gagal menyalin fail ke %DEST%.
  echo Sebab lazim: folder %DEST% dimiliki oleh akaun Windows lain,
  echo atau pasang.bat dijalankan dari lokasi yang tidak dibenarkan.
  echo.
  pause
  exit /b 1
)
if not exist "%DEST%\index.html" (
  echo.
  echo RALAT: pemasangan tidak lengkap - %DEST%\index.html tiada.
  echo.
  pause
  exit /b 1
)

echo [3/4] Mencari Chrome ...
set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined CHROME (
  echo RALAT: Chrome tidak dijumpai. Pasang Chrome dahulu.
  pause
  exit /b 1
)

echo [4/4] Membuat ikon "Quick Login" di Desktop ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Quick Login.lnk'; $ws=New-Object -ComObject WScript.Shell; $l=$ws.CreateShortcut($p); $l.TargetPath='%CHROME%'; $l.Arguments='--incognito --start-maximized %URL%'; $l.IconLocation='C:\login-launcher\quicklogin.ico'; $l.WindowStyle=3; $l.Save(); if (-not (Test-Path $p)) { exit 1 }"
if errorlevel 1 (
  echo.
  echo RALAT: gagal buat ikon di Desktop.
  echo Sebab lazim: PowerShell dihadkan oleh polisi sekolah ^(AppLocker /
  echo Constrained Language Mode^). Sila hubungi juruteknik.
  echo.
  pause
  exit /b 1
)

REM --- semakan polisi: mod samaran dimatikan oleh sekolah? ---
set "INCOG="
for /f "tokens=3" %%A in ('reg query "HKLM\SOFTWARE\Policies\Google\Chrome" /v IncognitoModeAvailability 2^>nul') do set "INCOG=%%A"
if not defined INCOG for /f "tokens=3" %%A in ('reg query "HKCU\SOFTWARE\Policies\Google\Chrome" /v IncognitoModeAvailability 2^>nul') do set "INCOG=%%A"
if "%INCOG%"=="0x1" (
  echo.
  echo *** AMARAN PENTING ***
  echo Polisi Chrome di komputer ini MEMATIKAN mod samaran ^(incognito^).
  echo Launcher tetap boleh dibuka, TETAPI sesi murid TIDAK akan dipadam
  echo secara automatik - murid seterusnya mungkin masih log masuk sebagai
  echo murid sebelumnya. Sila maklumkan kepada guru TMK / juruteknik.
  echo.
)

echo.
echo Selesai! Ikon "Quick Login" sudah ada di Desktop.
echo Murid klik dua kali ikon itu - launcher buka dalam Chrome.
echo Ingat: TUTUP SELURUH tetingkap Chrome selepas guna
echo        ^(bukan tutup tab sahaja^) supaya murid seterusnya bersih.
echo.
pause
