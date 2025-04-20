from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import time
import base64
from deepface import DeepFace
import mediapipe as mp
from pydantic import BaseModel
from pymongo import MongoClient
from ultralytics import YOLO
from datetime import datetime
import json
import uvicorn
import torch
torch.cuda.empty_cache()

# YOLO model
yolo_model = YOLO("yolov8n.pt")

# FastAPI App
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
# client = MongoClient('mongodb://localhost:27017/')
# db = client['detection_db']
# sessions_collection = db['sessions']  # Stores session data

# MediaPipe setup
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, model_complexity=2)

LEFT_EYE = [362, 385, 387, 263]
RIGHT_EYE = [33, 160, 158, 133]

# Timers
state_timers = {
    "Eyes Focused": 0,
    "Looking Left": 0,
    "Looking Right": 0,
    "Head Centered": 0,
    "Head Not Centered": 0
}
last_state = {
    "eye": "Eyes Focused",
    "head": "Head Centered"
}
last_switch_time = time.time()
start_time = time.time()

class FrameRequest(BaseModel):
    image_base64: str

def format_time(seconds):
    return time.strftime('%H:%M:%S', time.gmtime(seconds))

def update_timers(current_eye_state, current_head_state):
    global last_switch_time, last_state
    now = time.time()
    
    # Update the timer for eye state if it has changed
    if current_eye_state != last_state['eye']:
        eye_status = last_state.get('eye', 'Unknown')  # Use 'Unknown' if no previous state is set
        if eye_status not in state_timers:
            state_timers[eye_status] = 0  # Initialize if not present
        state_timers[eye_status] += now - last_switch_time
        last_state['eye'] = current_eye_state
    
    # Update the timer for head state if it has changed
    if current_head_state != last_state['head']:
        head_status = last_state.get('head', 'Unknown')  # Use 'Unknown' if no previous state is set
        if head_status not in state_timers:
            state_timers[head_status] = 0  # Initialize if not present
        state_timers[head_status] += now - last_switch_time
        last_state['head'] = current_head_state
    
    last_switch_time = now

def check_head_movement(image_rgb):
    results = face_mesh.process(image_rgb)
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            nose_tip = face_landmarks.landmark[1]
            if abs(nose_tip.x - 0.5) > 0.15 or abs(nose_tip.y - 0.5) > 0.15:
                return "Head Not Centered"
            return "Head Centered"
    return "Unable to detect"

def check_eye_gaze(image_rgb):
    results = face_mesh.process(image_rgb)
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            left_eye_pts = np.array([[face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] for i in LEFT_EYE])
            right_eye_pts = np.array([[face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] for i in RIGHT_EYE])
            eye_center = (np.mean(left_eye_pts, axis=0) + np.mean(right_eye_pts, axis=0)) / 2
            if eye_center[0] < 0.45:
                return "Looking Right"
            elif eye_center[0] > 0.55:
                return "Looking Left"
            return "Eyes Focused"
    return "Unable to detect"

def detect_emotion(frame_bgr):
    try:
        result = DeepFace.analyze(frame_bgr, actions=['emotion'], enforce_detection=False)
        return result[0]['dominant_emotion'].capitalize()
    except:
        return "Neutral"

def detect_objects(image_bgr):
    results = yolo_model(image_bgr)[0]
    objects = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])
        label = results.names[cls_id]
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        objects.append({
            "label": label,
            "confidence": round(confidence, 2),
            "box": [x1, y1, x2, y2]
        })
    return objects

def estimate_pose(image_rgb):
    results = pose.process(image_rgb)
    if results.pose_landmarks:
        return "Pose detected"
    return "Unable to detect pose"

@app.post("/process-frame/")
async def process_frame(
    request: FrameRequest,
    model: str = Query(...),
    session_id: str = Query(...),
):
    try:
        # Decode image
        header, encoded = request.image_base64.split(",", 1) if "," in request.image_base64 else ("", request.image_base64)
        image_data = base64.b64decode(encoded)
        np_arr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Run detection
        eye_status = check_eye_gaze(image_rgb)
        head_status = check_head_movement(image_rgb)
        emotion_status = detect_emotion(frame)
        detected_objects = detect_objects(frame)
        pose_status = estimate_pose(image_rgb)

        update_timers(eye_status, head_status)

        # Draw status text
        cv2.putText(frame, f"Eye: {eye_status}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
        cv2.putText(frame, f"Head: {head_status}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 128, 0), 2)
        cv2.putText(frame, f"Emotion: {emotion_status}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(frame, f"Pose: {pose_status}", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (128, 0, 128), 2)

        # Draw detected objects
        for obj in detected_objects:
            x1, y1, x2, y2 = obj["box"]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
            cv2.putText(frame, f"{obj['label']} {obj['confidence']}", (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        # Encode frame with annotations
        _, buffer = cv2.imencode('.jpg', frame)
        annotated_image_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

        # Frame data for DB
        # frame_data = {
        #     "timestamp": datetime.utcnow(),
        #     "eye_status": eye_status,
        #     "head_status": head_status,
        #     "emotion": emotion_status,
        #     "detected_objects": detected_objects,
        #     "pose_status": pose_status,
        # }

        # Store in MongoDB
        # sessions_collection.update_one(
        #     {"session_id": session_id},
        #     {"$push": {"frames": frame_data}, "$setOnInsert": {"created_at": datetime.utcnow()}},
        #     upsert=True
        # )

        # Return response with annotated image
        response = {
            "model": model,
            "eye_status": eye_status,
            "head_status": head_status,
            "emotion": emotion_status,
            "total_time": format_time(time.time() - start_time),
            "state_timers": {k: format_time(v) for k, v in state_timers.items()},
            "detected_objects": detected_objects,
            "pose_status": pose_status,
            "session_id": session_id,
            "annotated_image": annotated_image_base64
        }

        return JSONResponse(content=response)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"Connected to session: {session_id}")
    try:
        while True:
            data = await websocket.receive_text()
            request = FrameRequest(image_base64=data)
            
            # Decode image
            header, encoded = request.image_base64.split(",", 1) if "," in request.image_base64 else ("", request.image_base64)
            image_data = base64.b64decode(encoded)
            np_arr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Run detection
            eye_status = check_eye_gaze(image_rgb)
            head_status = check_head_movement(image_rgb)
            emotion_status = detect_emotion(frame)
            detected_objects = detect_objects(frame)
            pose_status = estimate_pose(image_rgb)

            update_timers(eye_status, head_status)

            # Annotate frame
            cv2.putText(frame, f"Eye: {eye_status}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
            cv2.putText(frame, f"Head: {head_status}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 128, 0), 2)
            cv2.putText(frame, f"Emotion: {emotion_status}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.putText(frame, f"Pose: {pose_status}", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (128, 0, 128), 2)

            # Encode annotated frame
            _, buffer = cv2.imencode(".jpg", frame)
            annotated_b64 = base64.b64encode(buffer).decode("utf-8")
            annotated_frame = f"data:image/jpeg;base64,{annotated_b64}"
            
            # Frame data
            # frame_data = {
            #     "timestamp": datetime.utcnow(),
            #     "eye_status": eye_status,
            #     "head_status": head_status,
            #     "emotion": emotion_status,
            #     "detected_objects": detected_objects,
            #     "pose_status": pose_status,
            # }
            
            # sessions_collection.update_one(
            #     {"session_id": session_id},
            #     {"$push": {"frames": frame_data}, "$setOnInsert": {"created_at": datetime.utcnow()}},
            #     upsert=True
            # )

            # Send JSON back to client
            await websocket.send_text(json.dumps({
                "eye_status": eye_status,
                "head_status": head_status,
                "emotion": emotion_status,
                "pose": pose_status,
                "detected_objects": detected_objects,
                "annotated_frame": annotated_frame,
                "state_timers": {k: format_time(v) for k, v in state_timers.items()},
                "total_time": format_time(time.time() - start_time),
            }))
            
    except WebSocketDisconnect:
        print(f"Disconnected from session: {session_id}")
        await websocket.close()

@app.get("/reset-timers")
async def reset_timers():
    global state_timers, start_time
    start_time = time.time()
    for k in state_timers:
        state_timers[k] = 0
    return {"message": "Timers reset"}

# For running the application locally
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)