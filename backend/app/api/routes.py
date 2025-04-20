from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from app.services.resume_service import extract_resume_text, remove_personal_info
from app.services.question_service import generate_interview_questions
from typing import List, Optional
import logging
import time
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

router = APIRouter()

class QuestionResponse(BaseModel):
    questions: List[str]
    job_role: str
    timestamp: float

@router.post("/parse-resume", response_model=QuestionResponse)
async def parse_resume_and_generate_questions(
    background_tasks: BackgroundTasks,
    resume: UploadFile = File(...),
    job_role: str = Form(...),
):
    """
    Parse a resume PDF and generate interview questions based on the resume and job role.
    """
    # Validate file type
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    try:
        start_time = time.time()
        logger.info(f"Processing resume for job role: {job_role}")
        
        # Extract text from the resume
        resume_text = await extract_resume_text(resume)
        
        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from the PDF. Please check if the PDF contains readable text.")
        
        # Remove personal information for privacy
        cleaned_text = remove_personal_info(resume_text)
        
        # Generate interview questions
        questions = await generate_interview_questions(cleaned_text, job_role)
        
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