from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import base64
import PyPDF2
import os
import tempfile
from dotenv import load_dotenv
import re
import io
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AI-Powered Interview Preparation API",
    description="API for generating interview questions from resumes and analyzing audio answers",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize Gemini
def initialize_gemini():
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise HTTPException(status_code=500, detail="Google API key not found")
    genai.configure(api_key=google_api_key)
    return genai.GenerativeModel("gemini-1.5-flash")

# Function to remove personal information
def remove_details(text):
    text = re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL REDACTED]", text)
    text = re.sub(r"\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}", "[PHONE REDACTED]", text)
    return text

# Extract text from PDF
def extract_text_from_pdf(pdf_file):
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        
        clean_text = remove_details(text.strip())  # Apply anonymization
        return clean_text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing PDF: {str(e)}")

# Function to generate interview questions
def generate_questions(resume_text, num_questions):
    try:
        model = initialize_gemini()
        
        prompt = f"""Based on this resume, generate {num_questions} relevant interview questions.
        Focus on technical skills, practical knowledge, and experience mentioned in the resume.
        Give questions as a numbered list. Make questions specific to the candidate's background.(start questions directly)
        Resume extracted Text: {resume_text}"""

        response = model.generate_content(prompt) 

        questions = response.text.strip().split('\n')
        questions = [q.strip() for q in questions if q.strip()]
        questions = [q.split('. ', 1)[-1] if '. ' in q else q for q in questions]
        
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")

# Function to analyze answers
def analyze_answer(audio_data, question):
    try:
        model = initialize_gemini()
        
        response = model.generate_content([
            {"mime_type": "audio/wav", "data": audio_data},
            f"Analyze this answer for the question: '{question}'. Provide feedback on correctness, depth, and clarity in details and also in ratings. also provide suggestions for improvement. analyze as you are an technical interviewer and provide feedback accordingly. keep it professional. and one standard template for all questions. (start analysis directly)"
        ])
        
        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing answer: {str(e)}")

# Pydantic models for request/response
class QuestionResponse(BaseModel):
    questions: List[str]
    resume_text: str

class AnalysisRequest(BaseModel):
    question: str

class AnalysisResponse(BaseModel):
    question: str
    analysis: str

# API endpoints
@app.post("/generate-questions", response_model=QuestionResponse)
async def api_generate_questions(
    resume_file: UploadFile = File(...),
    num_questions: int = Form(5)
):
    """
    Generate interview questions based on an uploaded resume.
    """
    if not resume_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    if num_questions < 1 or num_questions > 20:
        raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 20")
    
    # Read and process the PDF
    pdf_content = await resume_file.read()
    pdf_file = io.BytesIO(pdf_content)
    resume_text = extract_text_from_pdf(pdf_file)
    
    # Generate questions
    questions = generate_questions(resume_text, num_questions)
    
    return QuestionResponse(questions=questions, resume_text=resume_text)

@app.post("/analyze-answer", response_model=AnalysisResponse)
async def api_analyze_answer(
    audio_file: UploadFile = File(...),
    question: str = Form(...)
):
    """
    Analyze an audio recording of an answer to a specific interview question.
    """
    if not audio_file.filename.lower().endswith(('.wav', '.mp3')):
        raise HTTPException(status_code=400, detail="Only WAV and MP3 files are supported")
    
    # Read audio file
    audio_data = await audio_file.read()
    
    # Analyze the answer
    analysis = analyze_answer(audio_data, question)
    
    return AnalysisResponse(question=question, analysis=analysis)

@app.get("/")
async def root():
    """
    Root endpoint providing API information.
    """
    return {
        "message": "AI-Powered Interview Preparation API",
        "version": "1.0.0",
        "endpoints": {
            "/generate-questions": "Upload a resume to generate interview questions",
            "/analyze-answer": "Upload an audio file to analyze an interview answer"
        }
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)