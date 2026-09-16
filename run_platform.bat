@echo off
echo ======================================================
echo    AI Placement Preparation Platform - Startup Script
echo ======================================================

REM Start Auth Backend
echo Starting Auth Backend...
start cmd /k "cd /d %~dp0auth-backend && node index.js"

REM Start Backend
echo Starting Backend...
start cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python main.py"

REM Start Body Language Service
echo Starting Body Language Service...
start cmd /k "cd /d %~dp0body-language-service && (call conda activate ai_body 2>nul || call venv\Scripts\activate) && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

REM Start Frontend
echo Starting Frontend...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo ======================================================
echo All 4 services are starting!
echo Access points:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo - Auth Backend: http://localhost:4000
echo - Body Language API: http://localhost:8001
echo ======================================================
pause