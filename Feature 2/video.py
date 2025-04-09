from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import cv2
import mediapipe as mp
import numpy as np
import time
import os
import json
import io
import base64
from typing import Dict, List, Optional
import uuid
from pydantic import BaseModel
import asyncio
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("interview-monitor")

# Create app
app = FastAPI(
    title="Interview Monitoring API",
    description="API for monitoring candidate behavior during interviews",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for uploads and reports
os.makedirs("uploads", exist_ok=True)
os.makedirs("reports", exist_ok=True)

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True
)

# Indices for eye landmarks
LEFT_EYE = [362, 385, 387, 263]
RIGHT_EYE = [33, 160, 158, 133]

# Session data store
sessions = {}

# Pydantic models
class Session(BaseModel):
    id: str
    start_time: float
    eye_states: Dict[str, float]
    head_states: Dict[str, float]
    emotions: Dict[str, float]
    last_state: Dict[str, str]
    last_switch_time: float
    frames_processed: int
    current_status: Dict[str, str]

class AnalysisResult(BaseModel):
    session_id: str
    eye_status: str
    head_status: str
    emotion: str
    timestamp: float

# Helper functions
def format_time(seconds):
    """Format seconds into HH:MM:SS"""
    return time.strftime('%H:%M:%S', time.gmtime(seconds))

def create_new_session() -> str:
    """Create a new monitoring session"""
    session_id = str(uuid.uuid4())
    sessions[session_id] = Session(
        id=session_id,
        start_time=time.time(),
        eye_states={
            "Eyes Focused": 0,
            "Looking Left": 0,
            "Looking Right": 0,
            "Unable to detect": 0
        },
        head_states={
            "Head Centered": 0,
            "Head Not Centered": 0,
            "Unable to detect": 0
        },
        emotions={
            "Neutral": 0,
            "Happy": 0,
            "Sad": 0,
            "Angry": 0,
            "Fear": 0,
            "Surprise": 0,
            "Disgust": 0
        },
        last_state={
            "eye": "Unable to detect",
            "head": "Unable to detect",
            "emotion": "Neutral"
        },
        last_switch_time=time.time(),
        frames_processed=0,
        current_status={
            "eye": "Unable to detect",
            "head": "Unable to detect",
            "emotion": "Neutral"
        }
    )
    return session_id

def update_session_timers(session_id: str, current_eye_state: str, current_head_state: str, current_emotion: str):
    """Update session timers with new states"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    
    session = sessions[session_id]
    now = time.time()
    
    # Update durations for previous states
    elapsed = now - session.last_switch_time
    
    # Update eye state timer
    last_eye_state = session.last_state["eye"]
    if last_eye_state in session.eye_states:
        session.eye_states[last_eye_state] += elapsed
    
    # Update head state timer
    last_head_state = session.last_state["head"]
    if last_head_state in session.head_states:
        session.head_states[last_head_state] += elapsed
    
    # Update emotion timer
    last_emotion = session.last_state["emotion"]
    if last_emotion in session.emotions:
        session.emotions[last_emotion] += elapsed
    
    # Update current states
    session.last_state["eye"] = current_eye_state
    session.last_state["head"] = current_head_state
    session.last_state["emotion"] = current_emotion
    
    session.current_status["eye"] = current_eye_state
    session.current_status["head"] = current_head_state
    session.current_status["emotion"] = current_emotion
    
    session.last_switch_time = now
    session.frames_processed += 1

def generate_session_report(session_id: str) -> dict:
    """Generate a detailed report for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    
    session = sessions[session_id]
    total_time = time.time() - session.start_time
    
    # First, update timers for the current state
    update_session_timers(
        session_id,
        session.current_status["eye"],
        session.current_status["head"],
        session.current_status["emotion"]
    )
    
    report = {
        "session_id": session_id,
        "total_time": {
            "seconds": total_time,
            "formatted": format_time(total_time)
        },
        "eye_states": {k: {"seconds": v, "formatted": format_time(v)} for k, v in session.eye_states.items()},
        "head_states": {k: {"seconds": v, "formatted": format_time(v)} for k, v in session.head_states.items()},
        "emotions": {k: {"seconds": v, "formatted": format_time(v)} for k, v in session.emotions.items()},
        "frames_processed": session.frames_processed,
        "attention_score": calculate_attention_score(session),
        "timestamp": datetime.now().isoformat()
    }
    
    return report

def calculate_attention_score(session: Session) -> float:
    """Calculate an attention score based on eye gaze, head position and emotion"""
    total_time = sum(session.eye_states.values())
    if total_time == 0:
        return 0  # No data yet
    
    # Weight each factor
    eye_weight = 0.5
    head_weight = 0.3
    emotion_weight = 0.2
    
    # Calculate eye score (percentage of time focused)
    focus_time = session.eye_states.get("Eyes Focused", 0)
    eye_score = (focus_time / total_time) * 100 if total_time > 0 else 0
    
    # Calculate head score (percentage of time centered)
    head_center_time = session.head_states.get("Head Centered", 0)
    head_score = (head_center_time / total_time) * 100 if total_time > 0 else 0
    
    # Calculate engagement from emotions (happy, surprise are positive)
    emotion_time = sum(session.emotions.values())
    engaged_emotions_time = session.emotions.get("Happy", 0) + session.emotions.get("Surprise", 0)
    emotion_score = (engaged_emotions_time / emotion_time) * 100 if emotion_time > 0 else 0
    
    # Weighted score
    attention_score = (eye_score * eye_weight) + (head_score * head_weight) + (emotion_score * emotion_weight)
    return min(100, max(0, attention_score))  # Clamp between 0-100

# Core analysis logic
def check_head_movement(frame):
    """Detect if head is centered in frame"""
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            nose_tip = face_landmarks.landmark[1]
            x, y = nose_tip.x, nose_tip.y
            if abs(x - 0.5) > 0.15 or abs(y - 0.5) > 0.15:
                return "Head Not Centered"
            return "Head Centered"
    return "Unable to detect"

def check_eye_gaze(frame):
    """Detect eye gaze direction"""
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            left_eye_pts = np.array([[face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] for i in LEFT_EYE])
            right_eye_pts = np.array([[face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] for i in RIGHT_EYE])
            left_eye_center = np.mean(left_eye_pts, axis=0)
            right_eye_center = np.mean(right_eye_pts, axis=0)

            eye_center = (left_eye_center + right_eye_center) / 2
            x, y = eye_center

            if x < 0.45:
                return "Looking Right"
            elif x > 0.55:
                return "Looking Left"
            elif y < 0.45:
                return "Looking Up"
            elif y > 0.55:
                return "Looking Down"
            return "Eyes Focused"
    return "Unable to detect"

def detect_emotion(frame):
    """Detect dominant emotion in face"""
    try:
        # Using DeepFace for emotion detection
        # If you don't have DeepFace installed or want to avoid its dependencies, 
        # you could simplify this to return a placeholder value
        import deepface
        from deepface import DeepFace
        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
        return result[0]['dominant_emotion'].capitalize()
    except Exception as e:
        logger.warning(f"Could not detect emotion: {str(e)}")
        return "Neutral"

def analyze_frame(frame, session_id: str) -> AnalysisResult:
    """Analyze a single frame for eye gaze, head position and emotion"""
    eye_status = check_eye_gaze(frame)
    head_status = check_head_movement(frame)
    
    # Emotion detection can be computationally expensive, so we can disable it if needed
    emotion_status = detect_emotion(frame)
    
    # Update session with new states
    update_session_timers(session_id, eye_status, head_status, emotion_status)
    
    return AnalysisResult(
        session_id=session_id,
        eye_status=eye_status,
        head_status=head_status,
        emotion=emotion_status,
        timestamp=time.time()
    )

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint with basic API info"""
    return {
        "name": "Interview Monitoring API",
        "version": "1.0.0",
        "endpoints": {
            "POST /sessions": "Create a new monitoring session",
            "GET /sessions/{session_id}": "Get session status",
            "POST /sessions/{session_id}/frame": "Process a single frame",
            "POST /sessions/{session_id}/video": "Process a complete video",
            "GET /sessions/{session_id}/report": "Get session report",
            "WebSocket /ws/{session_id}": "Real-time monitoring"
        }
    }

@app.post("/sessions", status_code=201)
async def create_session():
    """Create a new interview monitoring session"""
    session_id = create_new_session()
    return {"session_id": session_id, "message": "Session created successfully"}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get current status of a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return {
        "session_id": session_id,
        "start_time": session.start_time,
        "duration": time.time() - session.start_time,
        "frames_processed": session.frames_processed,
        "current_status": session.current_status
    }

@app.post("/sessions/{session_id}/frame")
async def process_frame(session_id: str, file: UploadFile = File(...)):
    """Process a single frame image"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Read image data
        content = await file.read()
        nparr = np.frombuffer(content, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Analyze the frame
        result = analyze_frame(frame, session_id)
        
        return {
            "session_id": session_id,
            "eye_status": result.eye_status,
            "head_status": result.head_status,
            "emotion": result.emotion
        }
    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing frame: {str(e)}")

@app.post("/sessions/{session_id}/video")
async def process_video(session_id: str, file: UploadFile = File(...)):
    """Process a complete video file"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        # Save uploaded file to disk temporarily
        file_path = f"uploads/{session_id}_{file.filename}"
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Process video
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")
        
        frame_count = 0
        results = []
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process every 5th frame to speed up analysis
            if frame_count % 5 == 0:
                result = analyze_frame(frame, session_id)
                results.append({
                    "frame": frame_count,
                    "eye_status": result.eye_status,
                    "head_status": result.head_status,
                    "emotion": result.emotion
                })
            
            frame_count += 1
        
        cap.release()
        
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {
            "session_id": session_id,
            "frames_processed": frame_count,
            "analysis_samples": results[:10]  # Return first 10 results as sample
        }
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")

@app.get("/sessions/{session_id}/report")
async def get_report(session_id: str, format: str = "json"):
    """Get a detailed report for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    report = generate_session_report(session_id)
    
    if format.lower() == "json":
        return report
    elif format.lower() == "file":
        # Save report to file
        report_path = f"reports/report_{session_id}_{int(time.time())}.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        
        return FileResponse(
            path=report_path,
            filename=f"interview_report_{session_id}.json",
            media_type="application/json"
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format specified. Use 'json' or 'file'")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time monitoring"""
    if session_id not in sessions:
        await websocket.close(code=1008, reason="Session not found")
        return
    
    await websocket.accept()
    
    try:
        while True:
            # Wait for a frame from the client
            data = await websocket.receive_bytes()
            
            # Convert bytes to numpy array
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                await websocket.send_json({"error": "Invalid frame data"})
                continue
            
            # Analyze the frame
            result = analyze_frame(frame, session_id)
            
            # Send the result back to the client
            await websocket.send_json({
                "session_id": session_id,
                "eye_status": result.eye_status,
                "head_status": result.head_status,
                "emotion": result.emotion,
                "timestamp": result.timestamp
            })
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close(code=1011, reason=f"Server error: {str(e)}")

# Mount static files directory for frontend
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception as e:
    logger.warning(f"Could not mount static directory: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)