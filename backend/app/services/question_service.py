import os
import logging
import requests
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Groq API configuration
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Choose a model: "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma-7b-it"
# GROQ_MODEL = "llama3-70b-8192"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def generate_interview_questions(resume_text: str, job_role: str, num_questions: int = 10) -> List[str]:
    """
    Generate interview questions based on the resume and job role using Groq API.
    """
    if not GROQ_API_KEY:
        logger.error("No Groq API key found in environment variables")
        return ["API configuration error: Groq API key is missing. Please set GROQ_API_KEY environment variable."]

    system_prompt = (
        "You are an AI interview assistant. Generate relevant technical and behavioral "
        "interview questions based on the candidate's resume and the job role they are applying for. "
        "Focus on questions that assess their skills, experience, and fit for the position. "
        "Make the questions challenging but fair, and ensure they are specific to the candidate's background."
    )

    user_prompt = (
        f"Job Role: {job_role}\n\n"
        f"Resume Content:\n{resume_text}\n\n"
        f"Generate exactly {num_questions} interview questions that would be appropriate for this candidate "
        f"applying to the {job_role} position. Include a mix of technical questions related to their "
        f"skills and behavioral questions to assess their fit. Format each question on a new line with a number."
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 1024,
        "temperature": 0.7,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        logger.info(f"Generating questions for job role: {job_role}, text length: {len(resume_text)}")
        
        if not resume_text or len(resume_text.strip()) < 50:
            logger.warning("Resume text is too short or empty")
            return ["Failed to extract sufficient text from your resume. Please ensure your PDF contains readable text."]
        
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            logger.error(f"Groq API Error: {response.status_code} - {response.text}")
            return [f"Failed to generate questions: Groq API returned status code {response.status_code}."]

        result = response.json()
        content = result["choices"][0]["message"]["content"]

        # Extract questions from the generated text
        questions = []
        for line in content.split("\n"):
            line = line.strip()
            if line and ((line[0].isdigit() and "." in line[:5]) or "?" in line):
                questions.append(line)
        if not questions:
            logger.warning("Failed to extract questions from Groq response")
            return ["Failed to parse questions from Groq API response. Please try again."]
        return questions[:num_questions]
    except Exception as e:
        logger.error(f"Error in Groq question generation: {str(e)}")
        return [f"Failed to generate questions: {str(e)}. Please try again."]