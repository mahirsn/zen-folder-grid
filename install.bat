@echo off
rem Installs Zen Folder Grid with fx-autoconfig on Windows 10 or later.
rem Usage: install.bat [zen install folder]
setlocal EnableDelayedExpansion

set "FXAC_URL=https://codeload.github.com/MrOtherGuy/fx-autoconfig/zip/refs/heads/master"
set "SCRIPT_URL=https://raw.githubusercontent.com/mahirsn/zen-folder-grid/main/folder-grid.uc.mjs"
set "SINE_URL=https://github.com/CosmoCreeper/Sine"

tasklist /FI "IMAGENAME eq zen.exe" 2>nul | find /I "zen.exe" >nul
if not errorlevel 1 call :die "Zen is running. Close Zen, then run this file again." & goto :end

rem 1. The Zen install folder.
set "ZEN_DIR=%~1"
if not defined ZEN_DIR for %%d in ("%ProgramFiles%\Zen Browser" "%ProgramFiles%\Zen" "%LOCALAPPDATA%\Zen Browser") do (
  if not defined ZEN_DIR if exist "%%~d\application.ini" set "ZEN_DIR=%%~d"
)
if not defined ZEN_DIR call :die "Zen not found. Give its install folder: install.bat C:\path\to\zen" & goto :end
if not exist "%ZEN_DIR%\application.ini" call :die "%ZEN_DIR% is not a Zen install folder." & goto :end
echo Zen: %ZEN_DIR%

rem 2. The Zen profile.
set "ROOT=%APPDATA%\zen"
if not exist "%ROOT%\profiles.ini" call :die "No Zen profile found. Open Zen once, then run this file again." & goto :end
set N=0
for /f "usebackq tokens=1,* delims==" %%a in ("%ROOT%\profiles.ini") do (
  if /i "%%a"=="Path" (
    set /a N+=1
    set "P!N!=%%b"
  )
)
if %N%==0 call :die "No profile in %ROOT%\profiles.ini." & goto :end
set CHOICE=1
if %N% gtr 1 (
  echo Profiles:
  for /l %%i in (1,1,%N%) do echo   %%i^) !P%%i!
  set /p "CHOICE=Choose a profile [1-%N%]: "
)
set "PROFILE="
for /l %%i in (1,1,%N%) do if "!CHOICE!"=="%%i" set "PROFILE=!P%%i!"
if not defined PROFILE call :die "No such profile." & goto :end
set "PROFILE=%PROFILE:/=\%"
if not "%PROFILE:~1,1%"==":" set "PROFILE=%ROOT%\%PROFILE%"
set "CHROME=%PROFILE%\chrome"
echo Profile: %PROFILE%

set SINE=0
if exist "%CHROME%\sine-mods" set SINE=1
if exist "%CHROME%\JS\sine.sys.mjs" set SINE=1
if exist "%ZEN_DIR%\config.js" findstr /i sine "%ZEN_DIR%\config.js" >nul && set SINE=1
if %SINE%==1 (
  echo This Zen uses Sine. fx-autoconfig would break it.
  echo Install the mod in Sine instead: Sine settings ^> add mod ^> mahirsn/zen-folder-grid
  echo See %SINE_URL%
  set ERR=1
  goto :end
)

rem Writing to the program folder needs an administrator.
copy /y nul "%ZEN_DIR%\zfg-write-test.tmp" >nul 2>&1
if errorlevel 1 call :die "Writing to %ZEN_DIR% needs an administrator. Right-click install.bat and choose Run as administrator." & goto :end
del "%ZEN_DIR%\zfg-write-test.tmp"

rem 3. Get the files (curl and tar come with Windows 10 and later).
set "TMPD=%TEMP%\zen-folder-grid-%RANDOM%"
mkdir "%TMPD%"
curl -fsSL -o "%TMPD%\fx.zip" "%FXAC_URL%" || (call :die "Download of fx-autoconfig failed." & goto :clean)
tar -xf "%TMPD%\fx.zip" -C "%TMPD%" || (call :die "fx-autoconfig zip could not be opened." & goto :clean)
set "FXAC=%TMPD%\fx-autoconfig-master"
if exist "%~dp0folder-grid.uc.mjs" (
  copy /y "%~dp0folder-grid.uc.mjs" "%TMPD%\" >nul
) else (
  curl -fsSL -o "%TMPD%\folder-grid.uc.mjs" "%SCRIPT_URL%" || (call :die "Download of the script failed." & goto :clean)
)

rem 4. The program files. 5. The profile files.
call :put "%FXAC%\program\config.js" "%ZEN_DIR%\config.js" || goto :clean
call :put "%FXAC%\program\defaults\pref\config-prefs.js" "%ZEN_DIR%\defaults\pref\config-prefs.js" || goto :clean
for %%f in ("%FXAC%\profile\chrome\utils\*") do (
  call :put "%%~f" "%CHROME%\utils\%%~nxf" || goto :clean
)
call :put "%TMPD%\folder-grid.uc.mjs" "%CHROME%\JS\folder-grid.uc.mjs" || goto :clean

echo.
echo Done. Open Zen.
echo If the grid menu does not show, open about:support, click "Clear startup cache" and restart Zen.

:clean
if defined TMPD rmdir /s /q "%TMPD%"
:end
if defined ERR (
  if not defined NOPAUSE pause
  exit /b 1
)
if not defined NOPAUSE pause
exit /b 0

rem Copies a file; an old, different file is kept as <name>.bak.
:put
if exist "%~2" (
  fc /b "%~1" "%~2" >nul 2>&1 && exit /b 0
  copy /y "%~2" "%~2.bak" >nul || (call :die "Backup of %~2 failed." & exit /b 1)
  echo Backup: %~2.bak
)
if not exist "%~dp2" mkdir "%~dp2"
copy /y "%~1" "%~2" >nul || (call :die "Copy to %~2 failed." & exit /b 1)
exit /b 0

:die
echo Error: %~1
set ERR=1
exit /b 1
