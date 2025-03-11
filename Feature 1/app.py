import streamlit as st
import google.generativeai as genai
import base64
import PyPDF2
import os
import tempfile
from dotenv import load_dotenv
import re

load_dotenv()

# Initialize Gemini
def initialize_gemini():
    google_api_key = os.getenv("GOOGLE_API_KEY")
    genai.configure(api_key=google_api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


# Function to remove personal information
def remove_details(text):
  
    text = re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL REDACTED]", text)
    text = re.sub(r"\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}", "[PHONE REDACTED]", text)

    return text

# Modify extract_text_from_pdf
def extract_text_from_pdf(pdf_file):
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() or ""
    
    clean_text = remove_details(text.strip())  # Apply anonymization
    return clean_text


# Function to generate interview questions
def generate_questions(resume_text, num_questions):
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


# Function to analyze answers
def analyze_answer(audio_file_path, question):
    model = initialize_gemini()
    
    with open(audio_file_path, "rb") as f:
        audio_data = f.read()
    
    response = model.generate_content([
        {"mime_type": "audio/wav", "data": audio_data},
        f"Analyze this answer for the question: '{question}'. Provide feedback on correctness, depth, and clarity in details and also in ratings. also provide suggestions for improvement. analyze as you are an technical interviewer and provide feedback accordingly. keep it professional. and one standard template for all questions. (start analysis directly)"
    ])
    
    return response.text

# Streamlit UI
def main():
    st.title("AI-Powered Interview Preparation Platform")
    
    # Upload Resume
    uploaded_file = st.file_uploader("Upload Resume (PDF)", type="pdf")
    num_questions = st.slider("Select number of questions", 3, 10, 5)
    
    if uploaded_file:
        resume_text = extract_text_from_pdf(uploaded_file)  # Extract text only
        
        with st.expander("View Extracted Resume Text"):
            st.text(resume_text)
        
        if st.button("Generate Interview Questions"):
            with st.spinner("Generating questions..."):
                questions = generate_questions(resume_text, num_questions)  # Pass text
                st.session_state.questions = questions
                st.success("Questions generated successfully!")
    
    # Upload Answers in mp3
    if "questions" in st.session_state:
        st.subheader("Upload Your Recorded Answers")
        audio_files = {}

        for i, question in enumerate(st.session_state.questions, 1):
            st.write(f"**{i}. {question}**")

            # Upload answer audio file
            uploaded_audio = st.file_uploader(f"Upload your answer for Question {i} (WAV/MP3)", type=["wav", "mp3"])

            if uploaded_audio:
                # Save uploaded audio file to a temporary location
                temp_audio_path = os.path.join(tempfile.gettempdir(), uploaded_audio.name)
                
                with open(temp_audio_path, "wb") as f:
                    f.write(uploaded_audio.read())  # Save the uploaded file as bytes
                
                st.success(f"Uploaded successfully: {uploaded_audio.name}")
                audio_files[f"audio_{i}"] = temp_audio_path  # Store path in session state

        st.session_state.audio_files = audio_files

    # Analyze Answers
    if "audio_files" in st.session_state and st.button("Analyze Answers"):
        st.subheader("Answer Analysis")
        
        for i, question in enumerate(st.session_state.questions, 1):
            audio_key = f"audio_{i}"
            if audio_key in st.session_state.audio_files:
                with st.spinner(f"Analyzing answer for Question {i}..."):
                    analysis = analyze_answer(st.session_state.audio_files[audio_key], question)
                    st.write(f"**Question {i}: {question}**")
                    st.write(f"🔍 **Analysis:** {analysis}")

if __name__ == "__main__":
    main()
