// API client functions for interview practice app

export interface InterviewQuestion {
  text: string;
}

export interface PersonalityScore {
  Extroversion: number;
  Neuroticism: number;
  Agreeableness: number;
  Conscientiousness: number;
  Openness: number;
}

export interface SpeechMetrics {
  average_pitch: number;
  pause_count: number;
  average_pause_duration: number;
  word_count: number;
  personality_scores: PersonalityScore;
}

export interface SpeechAnalysis {
  transcription: string;
  metrics: SpeechMetrics;
  feedback: string;
}

// Function to analyze resume and generate questions
export async function analyzeResume(file: File, jobDescription?: string): Promise<InterviewQuestion[]> {
  const formData = new FormData();
  formData.append("resume_file", file);
  formData.append("num_questions", "5");
  
  if (jobDescription) {
    formData.append("job_description", jobDescription);
  }

  try {
    const response = await fetch('/api/generate-questions/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to analyze resume");
    }

    const data = await response.json();
    return data.questions;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Function to extract text from resume PDF
export async function extractResumeText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch('/api/extract-pdf-text/', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to extract text from resume");
  }
  
  const data = await response.json();
  return data.text;
}

// Function to analyze recorded answer
export async function analyzeAnswer(
  audioBlob: Blob, 
  question: string, 
  resumeText?: string, 
  jobDescription?: string
): Promise<{contentAnalysis: string, score: number, speechAnalysis: SpeechAnalysis}> {
  // First analyze the content
  const formData = new FormData();
  formData.append("audio_file", audioBlob, "answer.wav");
  formData.append("question", question);
  
  if (resumeText) {
    formData.append("resume_text", resumeText);
  }
  
  if (jobDescription) {
    formData.append("job_description", jobDescription);
  }

  const contentResponse = await fetch('/api/analyze-answer/', {
    method: 'POST',
    body: formData,
  });

  if (!contentResponse.ok) {
    const errorData = await contentResponse.json();
    throw new Error(errorData.detail || "Failed to analyze answer content");
  }

  const contentData = await contentResponse.json();

  // Then analyze the speech patterns
  const speechFormData = new FormData();
  speechFormData.append("audio_file", audioBlob, "answer.wav");

  const speechResponse = await fetch('/api/analyze-speech/', {
    method: 'POST',
    body: speechFormData,
  });

  if (!speechResponse.ok) {
    const errorData = await speechResponse.json();
    throw new Error(errorData.detail || "Failed to analyze speech patterns");
  }

  const speechData = await speechResponse.json();

  return {
    contentAnalysis: contentData.analysis,
    score: contentData.score || 0,
    speechAnalysis: speechData
  };
}