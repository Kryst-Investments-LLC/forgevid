@echo off
echo ========================================
echo ForgeVid Platform Audit Launcher
echo ========================================
echo.
echo Select audit type:
echo [1] Full Comprehensive Audit (with HTML report)
echo [2] Quick Health Check
echo [3] Full Audit (console only)
echo [4] Exit
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Running Full Audit with HTML Report...
    powershell.exe -ExecutionPolicy Bypass -File "ForgeVid-Platform-Audit.ps1" -GenerateHtmlReport
    pause
) else if "%choice%"=="2" (
    echo.
    echo Running Quick Health Check...
    powershell.exe -ExecutionPolicy Bypass -File "ForgeVid-Quick-Check.ps1"
    pause
) else if "%choice%"=="3" (
    echo.
    echo Running Full Audit (Console Only)...
    powershell.exe -ExecutionPolicy Bypass -File "ForgeVid-Platform-Audit.ps1"
    pause
) else if "%choice%"=="4" (
    echo Goodbye!
    exit /b 0
) else (
    echo Invalid choice. Please run again.
    pause
)

echo.
echo Audit completed. Check results above.
pause