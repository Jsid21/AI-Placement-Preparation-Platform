from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import speech_recognition as sr
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import tempfile
import os
import uvicorn
from pydantic import BaseModel
from typing import Dict, List
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("emotional-analysis")

# Initialize the FastAPI app
app = FastAPI(
    title="Emotional Analysis API",
    description="API for analyzing emotions from speech and text",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the model and tokenizer (load once at startup)
model_name = "j-hartmann/emotion-english-distilroberta-base"
try:
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    logger.info(f"Successfully loaded model: {model_name}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    # We'll continue and handle this in the endpoints

# Emotion labels
EMOTION_LABELS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'love']

# Pydantic models for request/response validation
class TextAnalysisRequest(BaseModel):
    text: str

class EmotionAnalysisResult(BaseModel):
    emotions: Dict[str, float]
    dominant_emotion: str

class ErrorResponse(BaseModel):
    error: str

# Helper functions
def analyze_text_emotion(text: str) -> Dict:
    """Analyze the emotional content of text using the pre-loaded model"""
    try:
        # Tokenize the text
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        # Get predictions
        with torch.no_grad():
            outputs = model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Convert to dictionary of emotion scores
        emotion_scores = {label: float(score) for label, score in zip(EMOTION_LABELS, predictions[0])}
        
        # Get dominant emotion
        dominant_emotion = max(emotion_scores, key=emotion_scores.get)
        
        return {
            "emotions": emotion_scores,
            "dominant_emotion": dominant_emotion
        }
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in analysis: {str(e)}")

def speech_to_text(audio_path: str) -> str:
    """Convert speech audio to text using Google's speech recognition"""
    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(audio_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            return text
    except sr.UnknownValueError:
        raise HTTPException(status_code=400, detail="Could not understand audio")
    except sr.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Speech recognition service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Error in speech to text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

# API endpoints
@app.get("/")
async def root():
    """Root endpoint with basic API info"""
    return {
        "name": "Emotional Analysis API",
        "version": "1.0.0",
        "endpoints": {
            "POST /analyze/text": "Analyze emotions from text",
            "POST /analyze/audio": "Analyze emotions from speech audio",
        }
    }

@app.post(
    "/analyze/text", 
    response_model=EmotionAnalysisResult,
    responses={500: {"model": ErrorResponse}}
)
async def analyze_text(request: TextAnalysisRequest):
    """Analyze emotions from text input"""
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text input cannot be empty")
    
    result = analyze_text_emotion(request.text)
    return JSONResponse(content=result)

@app.post(
    "/analyze/audio", 
    response_model=EmotionAnalysisResult,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def analyze_audio(file: UploadFile = File(...)):
    """Analyze emotions from speech audio"""
    # Check file type
    if not file.filename.endswith(('.wav', '.mp3', '.ogg', '.flac')):
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Please upload a WAV, MP3, OGG, or FLAC file"
        )
    
    # Create a temporary file to store the uploaded audio
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        try:
            # Write the uploaded file content to the temporary file
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        except Exception as e:
            logger.error(f"Error saving audio file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing audio file: {str(e)}")
    
    try:
        # Convert speech to text
        text = speech_to_text(temp_path)
        logger.info(f"Speech converted to text: {text}")
        
        # Analyze the text for emotions
        result = analyze_text_emotion(text)
        
        # Add the transcribed text to the response
        result["transcribed_text"] = text
        
        return JSONResponse(content=result)
    finally:
        # Always clean up the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/health")
async def health_check():
    """Check if the API and models are healthy"""
    return {"status": "ok", "model_loaded": model is not None and tokenizer is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)