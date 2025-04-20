import os
import logging
import requests
from typing import List
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Hugging Face API configuration
# HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
# HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/gpt2"
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"

async def generate_interview_questions(resume_text: str, job_role: str, num_questions: int = 10) -> List[str]:
    """
    Generate interview questions based on the resume and job role using Hugging Face API.
    """
    HUGGINGFACE_API_KEY = os.environ.get("HUGGINGFACE_API_KEY", "")
    system_prompt = """
    You are an AI interview assistant. Generate relevant technical and behavioral 
    interview questions based on the candidate's resume and the job role they are applying for.
    Focus on questions that assess their skills, experience, and fit for the position.
    Make the questions challenging but fair, and ensure they are specific to the candidate's background.
    """
    
    user_prompt = f"""
    Job Role: {job_role}
    
    Resume Content:
    {resume_text}
    
    Generate exactly {num_questions} interview questions that would be appropriate for this candidate 
    applying to the {job_role} position. Include a mix of technical questions related to their 
    skills and behavioral questions to assess their fit. Format each question on a new line with a number.
    """
    
    try:
        logger.info(f"Generating questions for job role: {job_role}, text length: {len(resume_text)}")
        
        if not resume_text or len(resume_text.strip()) < 50:
            logger.warning("Resume text is too short or empty")
            return ["Failed to extract sufficient text from your resume. Please ensure your PDF contains readable text."]
        
        # Check if API key is available
        if not HUGGINGFACE_API_KEY:
            logger.error("No Hugging Face API key found in environment variables")
            return ["API configuration error: Hugging Face API key is missing. Please set HUGGINGFACE_API_KEY environment variable."]
        
        # Prepare the payload for Hugging Face
        payload = {
            "inputs": f"{system_prompt}\n\n{user_prompt}",
            "parameters": {
                "max_new_tokens": 1000,
                "temperature": 0.7,
                "return_full_text": False
            }
        }
        
        # Set up headers with API key
        headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
        
        # Make the API request
        logger.info(f"Making API request to: {HUGGINGFACE_API_URL}")
        response = requests.post(HUGGINGFACE_API_URL, headers=headers, json=payload)
        
        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"API Error: {response.status_code} - {response.text}")
            return [f"Failed to generate questions: API returned status code {response.status_code}. Please check your Hugging Face API key."]
        
        # Parse the response
        result = response.json()
        
        # Extract the generated text based on the response format
        if isinstance(result, list) and len(result) > 0 and "generated_text" in result[0]:
            content = result[0]["generated_text"]
        elif isinstance(result, dict) and "generated_text" in result:
            content = result["generated_text"]
        else:
            content = str(result)
        
        # Extract questions from the generated text
        questions = []
        lines = content.split("\n")
        
        for line in lines:
            line = line.strip()
            # Check for numbered questions or lines with question marks
            if line and ((line[0].isdigit() and "." in line[:5]) or "?" in line):
                questions.append(line)
        
        if not questions:
            logger.warning("Failed to extract questions from response")
            return ["Failed to parse questions from API response. Please try again."]
        
        return questions[:num_questions]
            
    except Exception as e:
        logger.error(f"Error in question generation: {str(e)}")
        return [f"Failed to generate questions: {str(e)}. Please try again."]