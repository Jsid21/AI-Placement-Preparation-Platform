#!/bin/bash

echo "======================================================"
echo "   AI Placement Preparation Platform - Startup Script   "
echo "======================================================"
echo ""

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

echo "Checking required dependencies..."

if ! command_exists python3; then
  echo "Error: Python 3 is not installed. Please install Python 3 and try again."
  exit 1
fi

if ! command_exists node; then
  echo "Error: Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

if ! command_exists npm; then
  echo "Error: npm is not installed. Please install npm and try again."
  exit 1
fi

echo "✅ All required dependencies found."
echo ""

# --- Backend setup ---
echo "Setting up Python virtual environment for backend..."
cd backend || { echo "Error: Backend directory not found"; exit 1; }

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "✅ Backend virtual environment created."
else
  echo "✅ Backend virtual environment already exists."
fi

if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
  source venv/bin/activate
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  echo "⚠️ Unknown OS. Please manually activate the virtual environment."
  exit 1
fi

echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Backend dependencies installed."

if [ ! -f ".env" ]; then
  echo "⚠️ No .env file found in the backend directory. Creating a template..."
  echo -e "# Backend Environment Variables\nHUGGINGFACE_API_KEY=\"your-api-key-here\"" > .env
  echo "Please edit the .env file and add your Hugging Face API key before using the application."
fi

deactivate

echo ""

# --- Body Language Service setup ---
echo "Setting up Python virtual environment for body-language-service..."
cd ../body-language-service || { echo "Error: Body Language Service directory not found"; exit 1; }

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "✅ Body-language-service virtual environment created."
else
  echo "✅ Body-language-service virtual environment already exists."
fi

if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
  source venv/bin/activate
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  echo "⚠️ Unknown OS. Please manually activate the virtual environment."
  exit 1
fi

echo "Installing body-language-service dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Body-language-service dependencies installed."

deactivate

echo ""

# --- Frontend setup ---
echo "Setting up frontend..."
cd ../frontend || { echo "Error: Frontend directory not found"; exit 1; }

echo "Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed."
echo ""

# --- Start all services ---
echo "Starting services..."

# Start backend in the background
cd ../backend || { echo "Error: Backend directory not found"; exit 1; }
source venv/bin/activate
echo "Starting backend server on http://localhost:8000..."
python main.py &
BACKEND_PID=$!
deactivate
echo "Backend server started with PID: $BACKEND_PID"

# Start body-language-service in the background
cd ../body-language-service || { echo "Error: Body Language Service directory not found"; exit 1; }
source venv/bin/activate
echo "Starting Body Language Service on http://localhost:8001..."
uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
BODYLANG_PID=$!
deactivate
echo "Body Language Service started with PID: $BODYLANG_PID"

# Start frontend in the background
cd ../frontend || { echo "Error: Frontend directory not found"; exit 1; }
echo "Starting frontend server on http://localhost:3000..."
npm run dev &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

echo ""
echo "======================================================"
echo "  🚀 AI Placement Preparation Platform is running!     "
echo "======================================================"
echo "  📱 Frontend: http://localhost:3000                  "
echo "  ⚙️ Backend API: http://localhost:8000                "
echo "  🤳 Body Language API: http://localhost:8001          "
echo ""
echo "  Press Ctrl+C to stop all services                   "
echo "======================================================"

cleanup() {
  echo "Stopping services..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  kill $BODYLANG_PID 2>/dev/null
  echo "Services stopped. Goodbye!"
  exit 0
}

trap cleanup SIGINT

wait