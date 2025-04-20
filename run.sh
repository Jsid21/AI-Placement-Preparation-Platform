#!/bin/bash

# Display banner
echo "======================================================"
echo "   AI Placement Preparation Platform - Startup Script   "
echo "======================================================"
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
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

# Create and activate Python virtual environment
echo "Setting up Python virtual environment..."
cd backend || { echo "Error: Backend directory not found"; exit 1; }

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "✅ Virtual environment created."
else
  echo "✅ Virtual environment already exists."
fi

# Activate virtual environment (different on Windows vs Unix)
if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
  source venv/bin/activate
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  source venv/Scripts/activate
else
  echo "⚠️ Unknown OS. Please manually activate the virtual environment."
  exit 1
fi

# Install backend dependencies
echo "Installing backend dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Backend dependencies installed."

# Check for .env file
if [ ! -f ".env" ]; then
  echo "⚠️ No .env file found in the backend directory. Creating a template..."
  echo -e "# Backend Environment Variables\nHUGGINGFACE_API_KEY=\"your-api-key-here\"" > .env
  echo "Please edit the .env file and add your Hugging Face API key before using the application."
fi

echo ""

# Install frontend dependencies
echo "Setting up frontend..."
cd ../frontend || { echo "Error: Frontend directory not found"; exit 1; }

echo "Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed."
echo ""

# Start both services
echo "Starting services..."

# Start backend in the background
cd ../backend || { echo "Error: Backend directory not found"; exit 1; }
echo "Starting backend server on http://localhost:8000..."
python main.py &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

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
echo ""
echo "  Press Ctrl+C to stop all services                   "
echo "======================================================"

# Function to kill processes on script termination
cleanup() {
  echo "Stopping services..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  echo "Services stopped. Goodbye!"
  exit 0
}

# Register the cleanup function to be called on SIGINT
trap cleanup SIGINT

# Wait for user to press Ctrl+C
wait