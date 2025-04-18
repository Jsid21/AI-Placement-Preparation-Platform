@REM Simply double-click the run_platform.bat file or run it from command prompt:
@REM run_platform.bat    in terminal or command prompt
@REM This script sets up a virtual environment, installs dependencies, and starts the services for the AI Placement Preparation Platform.





@echo off
echo AI Placement Preparation Platform Launcher
echo ========================================

REM Activate the virtual environment (assumes it already exists)
call venv\Scripts\activate

REM Start all services in separate windows
echo Starting all services...

REM Start main FastAPI backend
start cmd /k "title Main API && call venv\Scripts\activate && cd /d D:\College\T.Y\TY_Project_2\AI-Placement-Preparation-Platform && python app.py"

REM Wait a bit for main API to start
timeout /t 3 /nobreak > nul

REM Start Feature 2 (Computer Vision)
start cmd /k "title Computer Vision API && call venv\Scripts\activate && cd /d D:\College\T.Y\TY_Project_2\AI-Placement-Preparation-Platform\Feature 2 && python main.py"

REM Start Feature 3 (if it exists)
if exist "Feature 3\app.py" (
    start cmd /k "title Speech Analysis API && call venv\Scripts\activate && cd /d D:\College\T.Y\TY_Project_2\AI-Placement-Preparation-Platform\Feature 3 && python app.py"
)

REM Start Streamlit UI (Feature 1)
if exist "Feature 1\app.py" (
    start cmd /k "title Streamlit UI && call venv\Scripts\activate && cd /d D:\College\T.Y\TY_Project_2\AI-Placement-Preparation-Platform\Feature 1 && streamlit run app.py"
)

REM Start Next.js frontend if it exists
if exist "ai-placement-preparation-\package.json" (
    start cmd /k "title NextJS Frontend && cd /d D:\College\T.Y\TY_Project_2\AI-Placement-Preparation-Platform\ai-placement-preparation- && npm run dev"
)

echo.
echo All services are starting!
echo.
echo Access points:
echo - Main API: http://localhost:8000/docs
echo - Computer Vision API: http://localhost:8001/docs
echo - Speech Analysis API: http://localhost:8002/docs (if available)
echo - Streamlit UI: http://localhost:8501 (if available)
echo - Next.js Frontend: http://localhost:3000 (if available)
echo.
echo Press any key to close this window (services will continue running)
pause > nul