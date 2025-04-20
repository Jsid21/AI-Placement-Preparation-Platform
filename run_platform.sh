# Make it executable:
# chmod +x run_platform.sh

# And run it:
# ./run_platform.sh



#!/bin/bash
echo "AI Placement Preparation Platform Launcher"
echo "========================================"

# Set up virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Setting up virtual environment..."
    python -m venv venv
    source venv/bin/activate
    python -m pip install --upgrade pip
    
    echo "Installing main dependencies..."
    pip install fastapi uvicorn python-multipart pydub python-dotenv groq google-generativeai PyPDF2 SpeechRecognition librosa requests transformers torch
    
    echo "Installing Feature 2 dependencies..."
    pip install opencv-python mediapipe numpy tf-keras deepface==0.0.79 ultralytics websockets pymongo
    
    echo "Installing Streamlit..."
    pip install streamlit
else
    source venv/bin/activate
fi

# Start all services in separate terminals
echo "Starting all services..."

# Function to start a command in a new terminal
function start_terminal() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "tell app \"Terminal\" to do script \"cd $(pwd) && $1\""
    else
        # Linux
        gnome-terminal -- bash -c "$1; exec bash" &> /dev/null
    fi
}

# Start main FastAPI backend
start_terminal "cd $(pwd) && source venv/bin/activate && python app.py"

# Wait a bit for main API to start
sleep 3

# Start Feature 2 (Computer Vision)
start_terminal "cd $(pwd)/Feature\ 2 && source ../venv/bin/activate && python main.py"

# Start Feature 3 (if it exists)
if [ -f "Feature 3/app.py" ]; then
    start_terminal "cd $(pwd)/Feature\ 3 && source ../venv/bin/activate && python app.py"
fi

# Start Streamlit UI (Feature 1)
if [ -f "Feature 1/app.py" ]; then
    start_terminal "cd $(pwd)/Feature\ 1 && source ../venv/bin/activate && streamlit run app.py"
fi

# Start Next.js frontend if it exists
if [ -f "ai-placement-preparation-/package.json" ]; then
    start_terminal "cd $(pwd)/ai-placement-preparation- && npm install && npm run dev"
fi

echo ""
echo "All services are starting!"
echo ""
echo "Access points:"
echo "- Main API: http://localhost:8000/docs"
echo "- Computer Vision API: http://localhost:8001/docs"
echo "- Speech Analysis API: http://localhost:8002/docs (if available)"
echo "- Streamlit UI: http://localhost:8501 (if available)"
echo "- Next.js Frontend: http://localhost:3000 (if available)"