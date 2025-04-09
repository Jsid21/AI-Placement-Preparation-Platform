export interface InterviewQuestion {
  text: string;
  id?: string;
}

export interface AnalysisMetrics {
  eye_contact: number;
  head_position: number;
  confidence: number;
  emotions: {
    [key: string]: number;
  };
}

export interface SpeechAnalysis {
  transcribed_text: string;
  emotions: {
    [key: string]: number;
  };
  dominant_emotion: string;
  analysis: string;
}

const API_URLS = {
  documentProcessing: 'http://localhost:8000',
  computerVision: 'http://localhost:8001',
  speechAnalysis: 'http://localhost:8002'
};

export async function analyzeResume(file: File): Promise<InterviewQuestion[]> {
  const formData = new FormData();
  formData.append('resume_file', file);

  const response = await fetch(`${API_URLS.documentProcessing}/generate-questions`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze resume');
  }

  return response.json();
}

export async function analyzeVideo(file: File): Promise<AnalysisMetrics> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URLS.computerVision}/analyze/video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze video');
  }

  return response.json();
}

export async function analyzeSpeech(
  file: File, 
  question: string
): Promise<SpeechAnalysis> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URLS.speechAnalysis}/analyze/audio`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze speech');
  }

  return response.json();
}