from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import tempfile
import os
import uvicorn
from pydantic import BaseModel
from typing import Dict, List
import logging
import subprocess
import json
import wave
import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence
import io

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

# Initialize the speech recognizer
recognizer = sr.Recognizer()
logger.info("Speech recognition initialized")

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

def convert_to_wav(input_file: str) -> str:
    """Convert audio file to 16kHz WAV format"""
    output_file = input_file + ".wav"
    try:
        subprocess.run([
            "ffmpeg", "-i", input_file, 
            "-ar", "16000", "-ac", "1", "-y",
            output_file
        ], check=True, capture_output=True)
        return output_file
    except subprocess.CalledProcessError as e:
        logger.error(f"Error converting audio: {e.stderr.decode() if e.stderr else str(e)}")
        raise HTTPException(status_code=500, detail="Error converting audio format")

def speech_to_text(audio_path: str) -> str:
    """Convert speech audio to text using SpeechRecognition library"""
    # Convert audio to WAV format if needed
    if not audio_path.lower().endswith('.wav'):
        wav_path = convert_to_wav(audio_path)
    else:
        wav_path = audio_path
    
    try:
        # Load the audio file
        with sr.AudioFile(wav_path) as source:
            # Read the audio data
            audio_data = recognizer.record(source)
            
            # Convert speech to text using Google's API (doesn't require API key)
            # You can replace with recognizer.recognize_sphinx() for fully offline
            text = recognizer.recognize_google(audio_data)
            
        # Clean up temporary file if we created one
        if wav_path != audio_path and os.path.exists(wav_path):
            os.remove(wav_path)
            
        if not text.strip():
            return "No speech detected"
            
        return text
    except sr.UnknownValueError:
        logger.warning("Speech recognition could not understand audio")
        return "No speech detected"
    except sr.RequestError as e:
        logger.error(f"Could not request results from service: {str(e)}")
        # If Google API fails, try offline sphinx
        try:
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
                text = recognizer.recognize_sphinx(audio_data)
                return text
        except Exception as e2:
            logger.error(f"Backup recognition failed: {str(e2)}")
            raise HTTPException(status_code=500, detail="Speech recognition service unavailable")
    except Exception as e:
        logger.error(f"Error in speech to text: {str(e)}")
        # Clean up temporary file if we created one
        if wav_path != audio_path and os.path.exists(wav_path):
            os.remove(wav_path)
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