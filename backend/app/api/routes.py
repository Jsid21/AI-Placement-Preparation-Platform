import os
import requests
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, Request, Body
from fastapi.responses import JSONResponse
from app.services.resume_service import extract_resume_text, remove_personal_info
from app.services.question_service import generate_interview_questions
from app.services.audio_analysis_service import extract_audio_features
from app.services.sentiment_service import analyze_sentiment
from app.services.personality_service import personality_detection
from typing import List, Optional
import logging
import time
from pydantic import BaseModel
from uuid import uuid4

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

router = APIRouter()

AUDIO_DIR = "session_audio"

def clear_audio_dir():
    if os.path.exists(AUDIO_DIR):
        for f in os.listdir(AUDIO_DIR):
            os.remove(os.path.join(AUDIO_DIR, f))
    else:
        os.makedirs(AUDIO_DIR)

class QuestionResponse(BaseModel):
    questions: List[str]
    job_role: str
    timestamp: float

class AnswerFeedbackRequest(BaseModel):
    answer: str
    question: str
    job_description: str = None
    resume_text: str = None

@router.post("/parse-resume", response_model=QuestionResponse)
async def parse_resume_and_generate_questions(
    background_tasks: BackgroundTasks,
    resume: UploadFile = File(...),
    job_role: str = Form(...),
    num_questions: int = Form(5),  # Default to 5 questions if not specified
):
    """
    Parse a resume PDF and generate interview questions based on the resume and job role.
    """
    # Validate file type
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    # Validate number of questions
    if num_questions < 3 or num_questions > 15:
        num_questions = 5  # Reset to default if outside valid range
    
    try:
        start_time = time.time()
        logger.info(f"Processing resume for job role: {job_role}, requesting {num_questions} questions")
        
        # Extract text from the resume
        resume_text = await extract_resume_text(resume)
        
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from the PDF. Please check if the PDF contains readable text.")
        
        # Remove personal information for privacy
        cleaned_text = remove_personal_info(resume_text)
        
        # Generate interview questions
        questions = await generate_interview_questions(cleaned_text, job_role, num_questions)
        
        # Log completion time for performance monitoring
        elapsed_time = time.time() - start_time
        logger.info(f"Resume processing completed in {elapsed_time:.2f} seconds")
        
        # Background task to clean up any temporary files if needed
        background_tasks.add_task(lambda: logger.info("Cleanup completed"))
        
        return QuestionResponse(
            questions=questions,
            job_role=job_role,
            timestamp=time.time()
        )
    except Exception as e:
        logger.error(f"Error in resume processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-session")
async def start_session():
    clear_audio_dir()
    session_id = str(uuid4())
    return {"session_id": session_id}

@router.post("/upload-audio")
async def upload_audio(
    audio: UploadFile = File(...),
    question_id: str = Form(...)
):
    # Save audio file locally
    file_location = os.path.join(AUDIO_DIR, f"q{question_id}_{audio.filename}")
    with open(file_location, "wb") as f:
        f.write(await audio.read())
    return {"status": "success", "filename": file_location}

@router.post("/analyze-audio")
async def analyze_audio(question_id: str = Form(...)):
    # Find the latest audio file for this question
    files = [f for f in os.listdir(AUDIO_DIR) if f.startswith(f"q{question_id}_")]
    if not files:
        return {"error": "No audio found for this question"}
    latest_file = sorted(files)[-1]
    audio_path = os.path.join(AUDIO_DIR, latest_file)
    features = extract_audio_features(audio_path)
    return features

@router.post("/analyze-sentiment")
async def analyze_sentiment_api(request: Request):
    data = await request.json()
    text = data.get("text", "")
    result = analyze_sentiment(text)
    return result

@router.post("/analyze-personality")
async def analyze_personality_api(request: Request):
    data = await request.json()
    text = data.get("text", "")
    result = personality_detection(text)
    return result

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = "llama3-70b-8192"

@router.post("/analyze-answer-feedback")
async def analyze_answer_feedback(request: Request):
    data = await request.json()
    answer = data.get("answer")
    question = data.get("question")
    job_description = data.get("job_description")
    resume_text = data.get("resume_text")

    system_prompt = (
        "You are an expert technical interviewer. Analyze the candidate's answer to the interview question below. "
        "Provide feedback on correctness, depth, relevance to the job, and communication clarity. "
        "Give a job fit score (0-100%) and actionable improvement suggestions. Format as a professional, structured assessment."
    )

    user_prompt = (
        f"Question: {question}\n"
        f"Answer: {answer}\n"
        f"{f'Job Description: {job_description}' if job_description else ''}\n"
        f"{f'Resume: {resume_text}' if resume_text else ''}\n"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 512,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return {"feedback": f"Groq API error: {response.status_code} - {response.text}"}
        result = response.json()
        feedback = result["choices"][0]["message"]["content"]
        return {"feedback": feedback}
    except Exception as e:
        return {"feedback": f"Error analyzing answer: {str(e)}"}

import requests, re, json

@router.post("/generate-aptitude-questions")
async def generate_aptitude_questions(
    num_questions: int = Body(...),
    categories: list = Body(...)
):
    if not GROQ_API_KEY:
        logger.error("Groq API key not configured.")
        return JSONResponse(status_code=500, content={"detail": "Groq API key not configured."})

    prompt = f"""
You are an expert aptitude question generator helping candidates prepare for placement and interview tests.

Your task is to generate exactly {num_questions} high-quality, intermediate-to-advanced level **aptitude questions** from the following categories:
{', '.join(categories)}.

---

🔍 Your approach:
1. Think step-by-step about each question. Use reasoning to ensure that it is conceptually sound, relevant, and challenging enough for competitive exams.
2. For quantitative problems, carefully construct correct mathematical expressions, numbers, and choices.
3. For logical or analytical problems, make sure patterns, reasoning steps, or coding logic are coherent and solvable.

---

📦 For each question, return it in this **strict JSON format** only:

{{
  "questions": [
    {{
      "question": "question text",
      "options": {{
        "A": "option A text",
        "B": "option B text",
        "C": "option C text",
        "D": "option D text"
      }},
      "correct_answer": "B",
      "explanation": "Brief chain-of-thought reasoning explaining the correct answer"
    }},
    ...
  ]
}}

🚫 IMPORTANT:
- Do NOT include any text before or after the JSON block.
- Do NOT include markdown, labels like "Answer:", "Explanation:", or commentary.
- Do NOT repeat or rephrase the prompt.
- Keep all options inside the "options" key.
- All output must be directly parsable as JSON.

---

🎓 EXAMPLES to follow:

Example 1 — Category: Quantitative Aptitude  
{{
  "question": "A boat covers 24 km upstream in 6 hours and the same distance downstream in 4 hours. What is the speed of the boat in still water?",
  "options": {{
    "A": "4 km/h",
    "B": "5 km/h",
    "C": "6 km/h",
    "D": "7 km/h"
  }},
  "correct_answer": "C",
  "explanation": "Upstream speed = 24/6 = 4 km/h, Downstream speed = 24/4 = 6 km/h. Speed in still water = (6 + 4)/2 = 5 km/h → correct answer is B."
}}

Example 2 — Category: Logical Reasoning  
{{
  "question": "If 'EARTH' is coded as 'GCTUJ', how is 'WORLD' coded in the same way?",
  "options": {{
    "A": "YQTNF",
    "B": "YPVNE",
    "C": "YQUNE",
    "D": "YQTNH"
  }},
  "correct_answer": "A",
  "explanation": "Each letter is shifted +2 alphabetically: W→Y, O→Q, R→T, L→N, D→F. So, WORLD becomes YQTNF."
}}

Example 3 — Category: Data Interpretation  
{{
  "question": "A company’s profit increased from $120,000 in 2022 to $150,000 in 2023. What is the percentage increase?",
  "options": {{
    "A": "20%",
    "B": "22.5%",
    "C": "25%",
    "D": "30%"
  }},
  "correct_answer": "C",
  "explanation": "Change = 150,000 - 120,000 = 30,000 → (30,000 / 120,000) * 100 = 25%."
}}

---

Now, generate the questions based on the categories provided. Remember to apply reasoning, and return a clean JSON object exactly in the above structure.
"""

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert aptitude test generator."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 2048,
        "temperature": 0.7,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        logger.info(f"Groq API status: {response.status_code}")
        if response.status_code != 200:
            logger.error(f"Groq API error: {response.status_code} - {response.text}")
            return JSONResponse(status_code=500, content={"detail": f"Groq API error: {response.status_code} - {response.text}"})
        result = response.json()
        text = result["choices"][0]["message"]["content"]
        logger.info(f"Groq raw response: {text[:500]}")  # Log first 500 chars

        # Remove markdown code block if present
        text = re.sub(r"^```json", "", text.strip(), flags=re.MULTILINE)
        text = re.sub(r"^```", "", text.strip(), flags=re.MULTILINE)
        # Try to extract JSON object
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            json_str = match.group(0)
        else:
            json_str = text

        try:
            data = json.loads(json_str)
        except Exception as e:
            logger.error(f"JSON decode error: {e}\nRaw: {text}")
            return JSONResponse(status_code=500, content={"detail": f"Failed to parse Groq response as JSON. Raw: {text}"})

        if "questions" not in data or not isinstance(data["questions"], list):
            logger.error("No 'questions' key in Groq response or not a list.")
            return JSONResponse(status_code=500, content={"detail": "Groq response did not contain 'questions'."})

        return {"questions": data["questions"]}
    except Exception as e:
        logger.error(f"Exception in /generate-aptitude-questions: {e}")
        return JSONResponse(status_code=500, content={"detail": f"Failed to generate questions: {str(e)}"})