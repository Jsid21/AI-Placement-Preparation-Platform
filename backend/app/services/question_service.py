import os
from openai import AsyncOpenAI
from typing import List

# Create OpenAI client
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", "your-api-key-here"))

async def generate_interview_questions(resume_text: str, job_role: str, num_questions: int = 10) -> List[str]:
    """
    Generate interview questions based on the resume and job role using OpenAI API.
    """
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
    
    Generate {num_questions} interview questions that would be appropriate for this candidate 
    applying to the {job_role} position. Include a mix of technical questions related to their 
    skills and behavioral questions to assess their fit.
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # Extract questions from the response
        content = response.choices[0].message.content
        questions = [line.strip() for line in content.split('\n') if line.strip() and (line.strip()[0].isdigit() or "?" in line)]
        
        return questions
    except Exception as e:
        print(f"Error in question generation: {str(e)}")
        return ["Failed to generate questions. Please try again."]