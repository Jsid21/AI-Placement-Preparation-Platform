import os
import re
import tempfile
import warnings
import uvicorn
import numpy as np
from typing import List, Optional
from pydub import AudioSegment
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import google.generativeai as genai
import PyPDF2
import speech_recognition as sr
import librosa
import requests
from transformers import BertTokenizer, BertForSequenceClassification
import shutil

# Configure FFmpeg path - use the one installed by winget
ffmpeg_path = shutil.which('ffmpeg')
if ffmpeg_path:
    AudioSegment.converter = ffmpeg_path
    print(f"Using FFmpeg from: {ffmpeg_path}")
else:
    print("Warning: FFmpeg not found in PATH. Audio processing features may not work correctly.")

# Suppress warnings and configure environment
warnings.filterwarnings('ignore')
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Interview Preparation API",
    description="API for resume analysis, interview question generation, and speech analysis",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.environ.get("GROQ_API_KEY", "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")
groq_client = Groq(api_key=api_key)

# Initialize Gemini
def initialize_gemini():
    google_api_key = "AIzaSyAjeaMnL97sqU-IZbjwho65DTDjMtkjlF4"
    genai.configure(api_key=google_api_key)
    return genai.GenerativeModel("gemini-1.5-flash")

# Supported audio formats
SUPPORTED_FORMATS = {
    'wav': 'WAV',
    'mp3': 'MP3',
    'mp4': 'MP4',
    'm4a': 'M4A',
    'ogg': 'OGG',
    'flac': 'FLAC'
}

# Pydantic models for request/response
class QuestionRequest(BaseModel):
    num_questions: int = 5
    job_description: Optional[str] = None

class Question(BaseModel):
    text: str

class QuestionResponse(BaseModel):
    questions: List[Question]
    message: Optional[str] = None

class AnalysisRequest(BaseModel):
    question: str
    job_description: Optional[str] = None
    resume_text: Optional[str] = None

class PersonalityScore(BaseModel):
    Extroversion: float
    Neuroticism: float
    Agreeableness: float
    Conscientiousness: float
    Openness: float

class SpeechMetrics(BaseModel):
    average_pitch: float
    pause_count: int
    average_pause_duration: float
    word_count: int
    personality_scores: PersonalityScore
    visualization_data: List[float]  # Add this field

class SpeechAnalysisResponse(BaseModel):
    transcription: str
    metrics: SpeechMetrics
    feedback: str

class ContentAnalysisResponse(BaseModel):
    analysis: str
    score: Optional[int] = None

# Function to remove personal information
def remove_details(text):
    text = re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL REDACTED]", text)
    text = re.sub(r"\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}", "[PHONE REDACTED]", text)
    return text

# Function to extract text from PDF
def extract_text_from_pdf(pdf_file):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        clean_text = remove_details(text.strip())
        
        # Check if PDF content is too short or empty
        if len(clean_text) < 50:
            return None, "The uploaded PDF appears to be empty or contains very little text."
            
        return clean_text, None
    except Exception as e:
        return None, f"Error extracting text from PDF: {str(e)}"

# Function to check for inappropriate content
def contains_inappropriate_content(text):
    # List of words/patterns that might indicate inappropriate content
    inappropriate_patterns = [
        r'\b(hate|hating|hateful)\b', 
        r'\b(racist|racism|racial slur)\b',
        r'\b(sexist|sexism)\b',
        r'\b(offensive|vulgar|explicit)\b',
        r'\bslur\b',
        # Add more patterns as needed
    ]
    
    text_lower = text.lower()
    for pattern in inappropriate_patterns:
        if re.search(pattern, text_lower):
            return True
    return False

# Function to generate interview questions
def generate_questions(resume_text, num_questions, job_description=None):
    model = initialize_gemini()
    
    # Check for inappropriate content
    if contains_inappropriate_content(resume_text):
        return [], "The resume contains potentially inappropriate content."
    
    if job_description and contains_inappropriate_content(job_description):
        return [], "The job description contains potentially inappropriate content."
    
    # Extract candidate name from resume for personalization
    name_match = re.search(r"(?i)name[:\s]+([A-Za-z\s]+)", resume_text)
    candidate_name = name_match.group(1).strip() if name_match else "the candidate"
    
    if job_description:
        prompt = f"""Based on this resume and job description, generate exactly {num_questions} relevant interview questions.
        Focus on technical skills, practical knowledge, and experience mentioned in the resume that align with the job requirements.
        Give questions as a numbered list from 1 to {num_questions}. Make questions specific to {candidate_name}'s background and the job requirements.
        Do not include any introduction or additional text beyond the numbered questions.
        Resume extracted Text: {resume_text}
        
        Job Description: {job_description}"""
    else:
        prompt = f"""Based on this resume, generate exactly {num_questions} relevant interview questions.
        Focus on technical skills, practical knowledge, and experience mentioned in the resume.
        Give questions as a numbered list from 1 to {num_questions}. Make questions specific to {candidate_name}'s background.
        Do not include any introduction or additional text beyond the numbered questions.
        Resume extracted Text: {resume_text}"""

    try:
        response = model.generate_content(prompt)
        questions = response.text.strip().split('\n')
        
        # Clean and validate questions
        valid_questions = []
        for q in questions:
            q = q.strip()
            if not q:
                continue
            
            # Remove numbering and any prefixes
            if re.match(r'^\d+[\.\)]\s+', q):
                q = re.sub(r'^\d+[\.\)]\s+', '', q)
            
            # Validate that this is an actual question
            if len(q) > 15 and ('?' in q or re.search(r'\b(explain|describe|discuss|tell|how|what|when|where|why|which|who)\b', q, re.IGNORECASE)):
                # Check for inappropriate content in the question
                if not contains_inappropriate_content(q):
                    valid_questions.append(q)
        
        # Ensure we have exactly the requested number of questions
        if len(valid_questions) > num_questions:
            valid_questions = valid_questions[:num_questions]
        
        # If we don't have enough valid questions, generate more
        if len(valid_questions) < num_questions and len(valid_questions) > 0:
            additional_needed = num_questions - len(valid_questions)
            retry_prompt = f"""Based on this resume, generate exactly {additional_needed} more interview questions.
            Questions should be different from these already generated: {valid_questions}
            Focus on technical skills and experience in the resume.
            Give only the questions without numbering or other text.
            Resume: {resume_text}"""
            
            retry_response = model.generate_content(retry_prompt)
            additional_questions = [q.strip() for q in retry_response.text.strip().split('\n') if q.strip()]
            
            # Clean and validate additional questions
            for q in additional_questions:
                if len(valid_questions) >= num_questions:
                    break
                    
                if re.match(r'^\d+[\.\)]\s+', q):
                    q = re.sub(r'^\d+[\.\)]\s+', '', q)
                    
                if len(q) > 15 and ('?' in q or re.search(r'\b(explain|describe|discuss|tell|how|what|when|where|why|which|who)\b', q, re.IGNORECASE)):
                    if not contains_inappropriate_content(q):
                        valid_questions.append(q)
        
        return valid_questions, None
    except Exception as e:
        return [], f"Error generating questions: {str(e)}"

# Function to analyze answer content and provide feedback with job relevance
def analyze_answer_content(audio_file_path, question, job_description=None, resume_text=None):
    model = initialize_gemini()
    
    try:
        # Check if the audio file exists and has content
        file_size = os.path.getsize(audio_file_path)
        if file_size < 1000:  # If file is smaller than 1KB, likely empty or corrupted
            return "The audio file appears to be empty or too short to analyze. Score: 0/100", 0
        
        with open(audio_file_path, "rb") as f:
            audio_data = f.read()
        
        # Extract candidate name from resume
        candidate_name = "the candidate"
        if resume_text:
            name_match = re.search(r"(?i)name[:\s]+([A-Za-z\s]+)", resume_text)
            if name_match:
                candidate_name = name_match.group(1).strip()
        
        if job_description:
            prompt = f"""Analyze this answer for the question: '{question}'.
            The candidate's name is {candidate_name}.
            Consider the following job description: '{job_description}'.
            
            Provide feedback on:
            1. Correctness and depth of the answer
            2. Relevance to the job requirements
            3. Communication clarity
            
            Include a job fit score (0-100%) indicating how well the answer aligns with what employers would look for based on the job description.
            If you detect no speech, very unclear speech, or if the audio appears to be empty or inappropriate, give a score of 0% and note the issue.
            
            Format as a professional, structured assessment with clear ratings and actionable improvement suggestions.
            IMPORTANT: Always refer to the candidate as {candidate_name} throughout your analysis.
            Check for any inappropriate content in the speech and flag it if detected.
            """
        else:
            prompt = f"""Analyze this answer for the question: '{question}'.
            The candidate's name is {candidate_name}.
            
            Provide feedback on:
            1. Correctness and depth of the answer
            2. Communication clarity and structure
            
            Include ratings and provide suggestions for improvement. Analyze as you are a technical interviewer and provide feedback accordingly.
            If you detect no speech, very unclear speech, or if the audio appears to be empty or inappropriate, give a score of 0% and note the issue.
            
            IMPORTANT: Always refer to the candidate as {candidate_name} throughout your analysis.
            Check for any inappropriate content in the speech and flag it if detected.
            """
        
        response = model.generate_content([
            {"mime_type": "audio/wav", "data": audio_data},
            prompt
        ])
        
        content = response.text
        
        # Check for inappropriate content in the response
        if contains_inappropriate_content(content):
            return "The analysis detected potentially inappropriate content in the response. Please review the audio content for appropriateness. Score: 0/100", 0
            
        # Extract score if available
        score = 0
        score_match = re.search(r'(\d+)[\/\s]*100', content)
        if score_match:
            score = int(score_match.group(1))
            
        return content, score
    except Exception as e:
        return f"Error analyzing answer: {str(e)}. Score: 0/100", 0

def convert_to_wav(audio_file, file_type):
    """Convert audio file to WAV format"""
    try:
        # Create a temporary file for the converted audio
        temp_dir = tempfile.gettempdir()
        temp_wav = os.path.join(temp_dir, "temp_audio.wav")
        
        # Load the audio file using pydub
        audio = AudioSegment.from_file(audio_file, format=file_type.lower())
        
        # Export as WAV
        audio.export(temp_wav, format="wav")
        return temp_wav
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error converting audio file: {str(e)}")

# Verify Groq API connection
def verify_groq_connection():
    try:
        url = "https://api.groq.com/openai/v1/models"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return True
    except Exception as e:
        return False

# Function for personality detection
def personality_detection(text):
    try:
        tokenizer = BertTokenizer.from_pretrained("Minej/bert-base-personality")
        model = BertForSequenceClassification.from_pretrained("Minej/bert-base-personality")

        inputs = tokenizer(text, truncation=True, padding=True, return_tensors="pt")
        outputs = model(**inputs)
        predictions = outputs.logits.squeeze().detach().numpy()

        # Apply sigmoid function to convert logits to probabilities
        def sigmoid(x):
            return 1 / (1 + np.exp(-x))
        
        predictions = sigmoid(predictions)
        
        # Scale to 0-100 range for better readability
        predictions = predictions * 100

        label_names = ['Extroversion', 'Neuroticism', 'Agreeableness', 'Conscientiousness', 'Openness']
        result = {label_names[i]: float(predictions[i]) for i in range(len(label_names))}

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in personality detection: {str(e)}")

def analyze_audio(audio_file_path):
    """Process audio file and return transcription, pitch details, and pause information"""
    temp_input = None
    temp_wav = None
    try:
        # Determine file extension
        file_extension = audio_file_path.split('.')[-1].lower()
        
        if file_extension not in SUPPORTED_FORMATS:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Please upload one of: {', '.join(SUPPORTED_FORMATS.keys())}")

        # Convert to WAV if needed
        if file_extension != 'wav':
            temp_wav = convert_to_wav(audio_file_path, file_extension)
        else:
            temp_wav = audio_file_path

        # Add error checking for file existence
        if not os.path.exists(temp_wav):
            raise HTTPException(status_code=400, detail="Audio file not found or conversion failed")

        # Load audio with error handling
        try:
            y, sr_rate = librosa.load(temp_wav, sr=None)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load audio file: {str(e)}")

        if len(y) == 0:
            raise HTTPException(status_code=400, detail="Audio file appears to be empty")

        # Detect silence/pauses with safe defaults
        try:
            intervals = librosa.effects.split(y, top_db=30)
        except Exception as e:
            print(f"Error detecting pauses: {str(e)}")
            intervals = np.array([[0, len(y)]])  # Fallback to treating entire audio as one segment

        # Calculate duration of pauses
        pauses = []
        for i in range(len(intervals)-1):
            pause_duration = (intervals[i+1][0] - intervals[i][1]) / sr_rate
            if pause_duration > 0.3:  # Only count pauses longer than 0.3 seconds
                pauses.append(pause_duration)

        # Perform transcription with error handling
        try:
            recognizer = sr.Recognizer()
            with sr.AudioFile(temp_wav) as source:
                audio_data = recognizer.record(source)
                transcription = recognizer.recognize_google(audio_data)
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            transcription = ""  # Fallback to empty transcription

        # Calculate pitch and segments with error handling
        segments = []
        segment_pitches = []
        
        try:
            for i in range(len(intervals)):
                start_sample, end_sample = intervals[i]
                segment = y[start_sample:end_sample]
                
                if len(segment) > 0:
                    pitches, magnitudes = librosa.piptrack(y=segment, sr=sr_rate)
                    if len(pitches) > 0 and len(magnitudes) > 0:
                        pitch_mask = magnitudes > np.max(magnitudes) * 0.7
                        valid_pitches = pitches[pitch_mask]
                        segment_pitch = np.mean(valid_pitches) if len(valid_pitches) > 0 else 0
                    else:
                        segment_pitch = 0
                    
                    segment_pitches.append(segment_pitch)
                    segments.append({
                        'start_time': float(start_sample) / sr_rate,
                        'end_time': float(end_sample) / sr_rate,
                        'pitch': segment_pitch
                    })
        except Exception as e:
            print(f"Error calculating pitch: {str(e)}")
            # Add a default segment if pitch calculation fails
            segments = [{'start_time': 0, 'end_time': len(y)/sr_rate, 'pitch': 0}]
            segment_pitches = [0]

        # Calculate average pitch safely
        avg_pitch = np.mean([s['pitch'] for s in segments]) if segments else 0

        # Generate visualization data safely
        try:
            y_harmonic, _ = librosa.effects.hpss(y)
            frequencies = librosa.feature.mfcc(y=y_harmonic, sr=sr_rate, n_mfcc=13)
            visualization_data = frequencies[0].tolist()
        except Exception as e:
            print(f"Error generating visualization data: {str(e)}")
            visualization_data = [0] * 13  # Fallback to empty visualization

        # Get personality scores with error handling
        try:
            personality_scores = personality_detection(transcription) if transcription else {
                'Extroversion': 0,
                'Neuroticism': 0,
                'Agreeableness': 0,
                'Conscientiousness': 0,
                'Openness': 0
            }
        except Exception as e:
            print(f"Error in personality detection: {str(e)}")
            personality_scores = {
                'Extroversion': 0,
                'Neuroticism': 0,
                'Agreeableness': 0,
                'Conscientiousness': 0,
                'Openness': 0
            }

        # Prepare metrics with safe values
        speech_metrics = {
            'segments': segments,
            'pauses': pauses,
            'average_pitch': float(avg_pitch),
            'pause_count': len(pauses),
            'average_pause_duration': float(np.mean(pauses)) if pauses else 0.0,
            'personality_scores': personality_scores,
            'word_count': len(transcription.split()) if transcription else 0,
            'visualization_data': visualization_data
        }

        return transcription, speech_metrics

    except Exception as e:
        print(f"Unexpected error in analyze_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    
    finally:
        # Clean up temporary files
        try:
            if temp_wav and temp_wav != audio_file_path and os.path.exists(temp_wav):
                os.remove(temp_wav)
        except Exception as e:
            print(f"Error cleaning up temporary files: {str(e)}")

def generate_feedback(transcription, speech_metrics):
    if not verify_groq_connection():
        raise HTTPException(status_code=503, detail="Unable to connect to Groq API. Please try again later.")

    # Analyze pitch variations
    pitch_variations = []
    for i, segment in enumerate(speech_metrics['segments']):
        variation = ((segment['pitch'] - speech_metrics['average_pitch']) / speech_metrics['average_pitch']) * 100
        pitch_variations.append(variation)

    # Format personality scores for the prompt
    personality_analysis = "\n".join([f"- {trait}: {score:.2f}" for trait, score in speech_metrics['personality_scores'].items()])

    prompt = f"""Analyze the provided speech transcription, voice metrics, and personality traits. Deliver concise, structured feedback addressing:

1. *Voice Quality:* Comment briefly on overall clarity and consistency of voice.
2. *Pitch Modulation:* Evaluate the appropriateness and variation of pitch.
3. *Pacing & Pauses:* Assess the number and duration of pauses—highlight if pacing enhances or disrupts delivery.
4. *Content Clarity:* Quickly note if content structure and message clarity were effective.
5. *Personality Traits:* Analyze how the detected personality traits may influence communication style and effectiveness.
6. *Improvement Suggestions:* Provide clear, actionable recommendations focusing specifically on pitch, pause management, and personality-based communication strategies.

Speech Analysis Data:
- Transcription: {transcription}
- Average Pitch: {speech_metrics['average_pitch']:.2f} Hz
- Total Pauses: {speech_metrics['pause_count']}
- Average Pause Duration: {speech_metrics['average_pause_duration']} seconds
- Pitch Variation: from {min(pitch_variations) if pitch_variations else 0:.1f}% to {max(pitch_variations) if pitch_variations else 0:.1f}% compared to the average.

Personality Traits:
{personality_analysis}

Format your response clearly, succinctly, and in easily readable bullet points. Keep feedback professional, specific, and positive in tone.
"""

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an experienced professional speech coach providing concise, structured, and actionable feedback. Your responses must be brief, specific, and supportive. Focus explicitly on the speaker's voice modulation, pitch consistency, use of pauses, content clarity, personality traits, and overall delivery effectiveness. Provide clear recommendations for improvement, formatted into distinct bullet points, without unnecessary elaboration."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=500,
            top_p=0.95,
            stream=False
        )
        
        return completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(e)}")

# Endpoints
@app.get("/")
async def root():
    return {"message": "Welcome to the AI Interview Preparation API"}

@app.post("/extract-pdf-text/", response_model=dict)
async def extract_pdf_text(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read the file content
        contents = await file.read()
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name
        
        # Extract text from the PDF
        text, error = extract_text_from_pdf(temp_path)
        
        # Clean up
        os.unlink(temp_path)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-questions/", response_model=QuestionResponse)
async def api_generate_questions(
    resume_file: UploadFile = File(...),
    num_questions: int = Form(5),
    job_description: Optional[str] = Form(None),
    job_description_file: Optional[UploadFile] = File(None)
):
    # Process resume file
    if not resume_file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for resume")
    
    try:
        # Read the resume file content
        resume_contents = await resume_file.read()
        
        # Create a temporary file for resume
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(resume_contents)
            resume_path = temp_file.name
        
        # Extract text from resume
        resume_text, resume_error = extract_text_from_pdf(resume_path)
        
        # Clean up resume file
        os.unlink(resume_path)
        
        if resume_error:
            raise HTTPException(status_code=400, detail=resume_error)
        
        # Process job description file if provided
        job_desc_text = job_description
        if job_description_file:
            if not job_description_file.filename.endswith('.pdf'):
                raise HTTPException(status_code=400, detail="Only PDF files are supported for job description")
            
            # Read the job description file content
            job_desc_contents = await job_description_file.read()
            
            # Create a temporary file for job description
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(job_desc_contents)
                job_desc_path = temp_file.name
            
            # Extract text from job description
            job_desc_from_file, job_desc_error = extract_text_from_pdf(job_desc_path)
            
            # Clean up job description file
            os.unlink(job_desc_path)
            
            if job_desc_error:
                raise HTTPException(status_code=400, detail=job_desc_error)
            
            # Use job description from file if provided
            job_desc_text = job_desc_from_file
        
        # Generate questions
        questions, error = generate_questions(resume_text, num_questions, job_description=job_desc_text)
        
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        return QuestionResponse(
            questions=[Question(text=q) for q in questions],
            message="Questions generated successfully"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-speech/")
async def analyze_speech_endpoint(audio_file: UploadFile = File(...)):
    try:
        print(f"Received audio file: {audio_file.filename}, content_type: {audio_file.content_type}")
        
        # Save audio file temporarily with original extension
        file_extension = os.path.splitext(audio_file.filename)[1].lower()
        if not file_extension:
            file_extension = ".webm" if "webm" in audio_file.content_type else ".wav"
            
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        content = await audio_file.read()
        temp_file.write(content)
        temp_file.close()
        
        print(f"Saved temporary file: {temp_file.name}, size: {os.path.getsize(temp_file.name)} bytes")
        
        # Convert to WAV if not already
        wav_file = temp_file.name
        if not file_extension.lower() == '.wav':
            print(f"Converting {file_extension} to WAV...")
            try:
                output_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                output_wav.close()
                
                # Use FFmpeg for conversion
                sound = AudioSegment.from_file(temp_file.name)
                sound.export(output_wav.name, format="wav")
                
                # Replace the original file path with the WAV file path
                os.unlink(temp_file.name)
                wav_file = output_wav.name
                print(f"Conversion successful: {wav_file}, size: {os.path.getsize(wav_file)} bytes")
            except Exception as e:
                print(f"Conversion error: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Failed to convert audio file: {str(e)}")
        
        # Get transcription and metrics
        try:
            transcription, metrics, visualization_data = analyze_audio(wav_file)
            print(f"Audio analysis successful: transcription length = {len(transcription)}")
            
            # Get personality scores
            personality_scores = personality_detection(transcription)
            
            # Generate feedback based on metrics and transcription
            feedback = generate_feedback(transcription, metrics)
            
            # Include personality scores in the metrics
            metrics["personality_scores"] = personality_scores
            metrics["visualization_data"] = visualization_data
            
            # Clean up temp file
            os.unlink(wav_file)
            
            return {
                "transcription": transcription,
                "metrics": metrics,
                "feedback": feedback
            }
        except Exception as e:
            print(f"Error analyzing audio: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Error processing audio: {str(e)}")
            
    except Exception as e:
        print(f"Unexpected error in analyze_speech_endpoint: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error analyzing speech: {str(e)}")

@app.post("/analyze-answer/", response_model=ContentAnalysisResponse)
async def api_analyze_answer(
    audio_file: UploadFile = File(...),
    question: str = Form(...),
    job_description: Optional[str] = Form(None),
    resume_text: Optional[str] = Form(None)
):
    file_extension = audio_file.filename.split('.')[-1].lower()
    
    if file_extension not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Please upload one of: {', '.join(SUPPORTED_FORMATS.keys())}"
        )
    
    try:
        # Save uploaded file to temp location
        temp_dir = tempfile.gettempdir()
        temp_input = os.path.join(temp_dir, f"input_audio.{file_extension}")
        
        # Read file content
        contents = await audio_file.read()
        
        # Save file to temp location
        with open(temp_input, 'wb') as f:
            f.write(contents)
        
        # Convert to WAV if needed
        if file_extension != 'wav':
            temp_wav = convert_to_wav(temp_input, file_extension)
        else:
            temp_wav = temp_input
        
        # Analyze audio content
        analysis, score = analyze_answer_content(
            temp_wav, 
            question, 
            job_description=job_description, 
            resume_text=resume_text
        )
        
        # Clean up temp files
        if temp_input != temp_wav and os.path.exists(temp_input):
            os.remove(temp_input)
        if os.path.exists(temp_wav):
            os.remove(temp_wav)
        
        return ContentAnalysisResponse(
            analysis=analysis,
            score=score
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-personality/", response_class=JSONResponse)
async def api_analyze_personality(text: str = Form(...)):
    """
    Analyze text to detect personality traits using the bert-base-personality model.
    """
    try:
        if not text or len(text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Text is too short for meaningful personality analysis")
        
        # Check for inappropriate content
        if contains_inappropriate_content(text):
            raise HTTPException(status_code=400, detail="The text contains potentially inappropriate content")
        
        # Use the existing personality_detection function
        personality_scores = personality_detection(text)
        
        return JSONResponse(content=personality_scores)
    
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error analyzing personality: {str(e)}")

@app.websocket("/ws/personality/")
async def personality_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time personality analysis.
    """
    await websocket.accept()
    try:
        while True:
            # Receive text from the client
            text = await websocket.receive_text()
            
            if not text or len(text.strip()) < 10:
                await websocket.send_json({
                    "error": "Text is too short for meaningful analysis",
                    "scores": {
                        "Extroversion": 0,
                        "Neuroticism": 0,
                        "Agreeableness": 0,
                        "Conscientiousness": 0,
                        "Openness": 0
                    }
                })
                continue
            
            # Check for inappropriate content
            if contains_inappropriate_content(text):
                await websocket.send_json({
                    "error": "The text contains potentially inappropriate content",
                    "scores": {
                        "Extroversion": 0,
                        "Neuroticism": 0,
                        "Agreeableness": 0,
                        "Conscientiousness": 0,
                        "Openness": 0
                    }
                })
                continue
            
            # Analyze personality
            try:
                personality_scores = personality_detection(text)
                
                # Send the result back
                await websocket.send_json({
                    "scores": personality_scores
                })
            except Exception as e:
                await websocket.send_json({
                    "error": f"Error analyzing personality: {str(e)}",
                    "scores": {
                        "Extroversion": 0,
                        "Neuroticism": 0,
                        "Agreeableness": 0,
                        "Conscientiousness": 0,
                        "Openness": 0
                    }
                })
                
    except WebSocketDisconnect:
        print("Client disconnected")

# For running the application locally
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)