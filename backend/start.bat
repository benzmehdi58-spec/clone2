@echo off
echo ============================================================
echo  CyberAI Backend ^| FastAPI + LSTM (Python 3.12 venv)
echo ============================================================
cd /d "%~dp0"

if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found.
    echo Run: py -3.12 -m venv .venv
    echo Then: .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo [*] Freeing port 8000 if in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [*] Killing PID %%a on port 8000
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting server on http://localhost:8000 ...
echo Press Ctrl+C to stop.
echo.
.venv\Scripts\python run_server.py
pause
