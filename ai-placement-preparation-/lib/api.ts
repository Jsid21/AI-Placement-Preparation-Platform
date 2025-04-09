export interface InterviewQuestion {
  text: string;
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
  question: string;
  analysis: string;
  emotions: {
    [key: string]: number;
  };
  dominant_emotion: string;
}

const API_BASE_URLS = {
  documentProcessing: 'http://localhost:8000',
  computerVision: 'http://localhost:8001',
  speechAnalysis: 'http://localhost:8002'
};

export async function analyzeResume(file: File): Promise<InterviewQuestion[]> {
  const formData = new FormData();
  formData.append('resume_file', file);
  formData.append('num_questions', '5');

  const response = await fetch(`${API_BASE_URLS.documentProcessing}/generate-questions`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze resume');
  }

  const data = await response.json();
  return data.questions.map((q: string) => ({ text: q }));
}

export async function analyzeVideo(file: File): Promise<AnalysisMetrics> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URLS.computerVision}/analyze/video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze video');
  }

  return response.json();
}

export async function analyzeSpeech(file: File, question: string): Promise<SpeechAnalysis> {
  const formData = new FormData();
  formData.append('audio_file', file);
  formData.append('question', question);

  // First analyze with Feature 1 for question analysis
  const analysisResponse = await fetch(`${API_BASE_URLS.documentProcessing}/analyze-answer`, {
    method: 'POST',
    body: formData,
  });

  if (!analysisResponse.ok) {
    throw new Error('Failed to analyze speech content');
  }

  const analysisData = await analysisResponse.json();

  // Then analyze with Feature 3 for emotion analysis
  formData.set('file', file); // Reset formData with correct field name
  const emotionResponse = await fetch(`${API_BASE_URLS.speechAnalysis}/analyze/audio`, {
    method: 'POST',
    body: formData,
  });

  if (!emotionResponse.ok) {
    throw new Error('Failed to analyze speech emotions');
  }

  const emotionData = await emotionResponse.json();

  // Combine both analyses
  return {
    question,
    analysis: analysisData.analysis,
    emotions: emotionData.emotions,
    dominant_emotion: emotionData.dominant_emotion
  };
}