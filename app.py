import os
import re
import tempfile
import warnings
import uvicorn
import numpy as np
from typing import List, Optional
from pydub import AudioSegment
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
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

        # Extract audio features using librosa
        y, sr_rate = librosa.load(temp_wav)
        
        # Detect silence/pauses        
        intervals = librosa.effects.split(y, top_db=30)
        
        # Calculate duration of pauses
        pauses = []
        for i in range(len(intervals)-1):
            pause_duration = (intervals[i+1][0] - intervals[i][1]) / sr_rate
            if pause_duration > 0.3:  # Only count pauses longer than 0.3 seconds
                pauses.append(pause_duration)

        # Perform transcription with timestamps
        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_wav) as source:
            audio_data = recognizer.record(source)
            transcription = recognizer.recognize_google(audio_data)

        # Split audio into segments based on pauses
        segments = []
        segment_pitches = []
        
        for i in range(len(intervals)):
            start_sample, end_sample = intervals[i]
            segment = y[start_sample:end_sample]
            
            # Calculate pitch for each segment
            if len(segment) > 0:
                pitches, magnitudes = librosa.piptrack(y=segment, sr=sr_rate)
                segment_pitch = np.mean(pitches[magnitudes > np.max(magnitudes) * 0.7])
                segment_pitches.append(segment_pitch)
                
                # Convert samples to time
                start_time = float(start_sample) / sr_rate
                end_time = float(end_sample) / sr_rate
                segments.append({
                    'start_time': start_time,
                    'end_time': end_time,
                    'pitch': segment_pitch
                })

        # Calculate average pitch for reference
        avg_pitch = np.mean([s['pitch'] for s in segments]) if segments else 0

        # Add visualization data
        y_harmonic, _ = librosa.effects.hpss(y)
        frequencies = librosa.feature.mfcc(y=y_harmonic, sr=sr_rate, n_mfcc=13)
        visualization_data = frequencies[0].tolist()  # Use first MFCC coefficient for visualization

        # Perform personality detection on transcription
        personality_scores = personality_detection(transcription)

        speech_metrics = {
            'segments': segments,
            'pauses': pauses,
            'average_pitch': avg_pitch,
            'pause_count': len(pauses),
            'average_pause_duration': np.mean(pauses) if pauses else 0,
            'personality_scores': personality_scores,
            'word_count': len(transcription.split()),
            'visualization_data': visualization_data  # Add visualization data to metrics
        }

        return transcription, speech_metrics

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
    
    finally:
        # Clean up temporary files that are not the original
        if temp_wav and temp_wav != audio_file_path and os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except:
                pass

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

1. **Voice Quality:** Comment briefly on overall clarity and consistency of voice.
2. **Pitch Modulation:** Evaluate the appropriateness and variation of pitch.
3. **Pacing & Pauses:** Assess the number and duration of pauses—highlight if pacing enhances or disrupts delivery.
4. **Content Clarity:** Quickly note if content structure and message clarity were effective.
5. **Personality Traits:** Analyze how the detected personality traits may influence communication style and effectiveness.
6. **Improvement Suggestions:** Provide clear, actionable recommendations focusing specifically on pitch, pause management, and personality-based communication strategies.

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

@app.post("/analyze-speech/", response_model=SpeechAnalysisResponse)
async def api_analyze_speech(audio_file: UploadFile = File(...)):
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
        
        # Analyze audio
        transcription, speech_metrics = analyze_audio(temp_input)
        
        # Generate feedback
        feedback = generate_feedback(transcription, speech_metrics)
        
        # Create response
        response = SpeechAnalysisResponse(
            transcription=transcription,
            metrics=SpeechMetrics(
                average_pitch=speech_metrics['average_pitch'],
                pause_count=speech_metrics['pause_count'],
                average_pause_duration=speech_metrics['average_pause_duration'],
                word_count=speech_metrics['word_count'],
                personality_scores=PersonalityScore(**speech_metrics['personality_scores']),
                visualization_data=speech_metrics['visualization_data']  # Add visualization data to response
            ),
            feedback=feedback
        )
        
        # Clean up temp files
        os.remove(temp_input)
        
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

# For running the application locally
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)