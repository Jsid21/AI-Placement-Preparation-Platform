import os
import streamlit as st
import google.generativeai as genai
from dotenv import load_dotenv
import pandas as pd
import plotly.express as px
import time
import json
import re

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize session state
if 'questions' not in st.session_state:
    st.session_state.questions = []
if 'answers' not in st.session_state:
    st.session_state.answers = {}
if 'current_question' not in st.session_state:
    st.session_state.current_question = 0
if 'test_started' not in st.session_state:
    st.session_state.test_started = False
if 'test_completed' not in st.session_state:
    st.session_state.test_completed = False

# Model configuration
generation_config = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 1,
    "max_output_tokens": 2048,
}

# safety_settings = [
#     {
#         "category": "HARM_BLOCK_THRESHOLD",
#         "threshold": "BLOCK_MEDIUM_AND_ABOVE"
#     },
# ]

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
    # safety_settings=safety_settings
)

def clean_json_response(text):
    """Clean the JSON response from Gemini by removing markdown code blocks"""
    # Remove markdown code block notation if present
    text = re.sub(r'```json', '', text)
    text = re.sub(r'```', '', text)
    return text.strip()

def generate_questions(num_questions, categories):
    """Generate aptitude questions using Gemini API"""
    prompt = f"""
    Generate exactly {num_questions} aptitude questions for placement preparation covering the following categories:
    {', '.join(categories)}. The Level of Questions should be intermediate to Advance.
    
    For each question, provide:
    1. The question text
    2. Multiple choice options (A, B, C, D)
    3. The correct answer (just the letter)
    4. A brief explanation of the solution
    
    Return ONLY the JSON with the following structure:
    {{
        "questions": [
            {{
                "question": "question text",
                "options": {{
                    "A": "option A",
                    "B": "option B",
                    "C": "option C",
                    "D": "option D"
                }},
                "correct_answer": "A",
                "explanation": "explanation text"
            }},
            ...
        ]
    }}
    IMPORTANT: Return ONLY the JSON, no additional text or explanation.
    """
    
    try:
        response = model.generate_content(prompt)
        if response.text:
            cleaned_response = clean_json_response(response.text)
            return json.loads(cleaned_response)
        else:
            st.error("Failed to generate questions. Please try again.")
            return None
    except json.JSONDecodeError as e:
        st.error(f"Failed to parse response as JSON. Error: {str(e)}")
        st.text("Raw response for debugging:")
        st.text(response.text if response else "No response")
        return None
    except Exception as e:
        st.error(f"Error generating questions: {str(e)}")
        return None

def display_question(question_data, question_num):
    """Display a single question with options"""
    st.subheader(f"Question {question_num + 1}")
    st.write(question_data['question'])
    
    options = question_data['options']
    selected_option = st.radio(
        "Select your answer:",
        options=list(options.keys()),
        format_func=lambda x: f"{x}: {options[x]}",
        key=f"question_{question_num}"
    )
    
    return selected_option

def calculate_score():
    """Calculate the user's score"""
    correct = 0
    total = len(st.session_state.questions)
    
    for i, question in enumerate(st.session_state.questions):
        user_answer = st.session_state.answers.get(i)
        if user_answer == question['correct_answer']:
            correct += 1
    
    return correct, total

def generate_report():
    """Generate a detailed report with score and analysis"""
    correct, total = calculate_score()
    score_percentage = (correct / total) * 100
    
    st.header("Test Report")
    st.subheader(f"Score: {correct}/{total} ({score_percentage:.2f}%)")
    
    # Score visualization
    fig = px.pie(
        names=["Correct", "Incorrect"],
        values=[correct, total - correct],
        title="Performance Summary"
    )
    st.plotly_chart(fig)
    
    # Category-wise analysis (if categories were tracked)
    st.subheader("Question Review")
    
    for i, question in enumerate(st.session_state.questions):
        with st.expander(f"Question {i + 1}: {question['question']}"):
            st.write(f"Your answer: {st.session_state.answers.get(i, 'Not answered')}")
            st.write(f"Correct answer: {question['correct_answer']}")
            st.write("Explanation:")
            st.write(question['explanation'])

def main():
    st.title("Placement Preparation Platform")
    st.subheader("Aptitude Test Practice")
    
    if not st.session_state.test_started and not st.session_state.test_completed:
        # Test configuration
        with st.form("test_config"):
            num_questions = st.slider("Number of questions", 5, 50, 10)
            categories = st.multiselect(
                "Select question categories",
                ["Logical Reasoning", "Quantitative Aptitude", "English"],
                default=["Logical Reasoning"]
            )
            
            if st.form_submit_button("Start Test"):
                if not categories:
                    st.warning("Please select at least one category")
                else:
                    with st.spinner("Generating questions..."):
                        questions_data = generate_questions(num_questions, categories)
                        if questions_data and 'questions' in questions_data:
                            st.session_state.questions = questions_data['questions']
                            st.session_state.test_started = True
                            st.rerun()
                        else:
                            st.error("Failed to generate valid questions. Please try again.")
    
    elif st.session_state.test_started and not st.session_state.test_completed:
        # Display current question
        current_q = st.session_state.current_question
        total_q = len(st.session_state.questions)
        
        # Save answer if moving to next question
        if current_q > 0:
            prev_answer = st.session_state.get(f"question_{current_q - 1}")
            if prev_answer:
                st.session_state.answers[current_q - 1] = prev_answer
        
        # Show progress
        progress = current_q / total_q
        st.progress(progress)
        st.write(f"Question {current_q + 1} of {total_q}")
        
        # Display current question
        selected_option = display_question(
            st.session_state.questions[current_q],
            current_q
        )
        
        # Navigation buttons
        col1, col2 = st.columns(2)
        with col1:
            if current_q > 0:
                if st.button("Previous"):
                    st.session_state.current_question -= 1
                    st.rerun()
        
        with col2:
            if current_q < total_q - 1:
                if st.button("Next"):
                    st.session_state.current_question += 1
                    st.rerun()
            else:
                if st.button("Submit Test"):
                    st.session_state.answers[current_q] = selected_option
                    st.session_state.test_completed = True
                    st.session_state.test_started = False
                    st.rerun()
    
    elif st.session_state.test_completed:
        # Show test results
        generate_report()
        
        if st.button("Take Another Test"):
            st.session_state.questions = []
            st.session_state.answers = {}
            st.session_state.current_question = 0
            st.session_state.test_started = False
            st.session_state.test_completed = False
            st.rerun()

if __name__ == "__main__":
    main()