"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Mic, Square, RotateCcw, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import PersonalityTracker from '@/components/personality-tracker';

// Interface definitions
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
  visualization_data: number[];
}

export interface InterviewQuestion {
  text: string;
}

export interface SpeechAnalysis {
  transcription: string;
  metrics: SpeechMetrics;
  feedback: string;
}

export default function InterviewPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [textAnalysis, setTextAnalysis] = useState<string>("")
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [resumeText, setResumeText] = useState<string>("")
  const [jobDescription, setJobDescription] = useState<string>("")
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [visualizerData, setVisualizerData] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const { toast } = useToast()

  // Function to analyze resume and generate questions
  const analyzeResume = async (file: File) => {
    const formData = new FormData();
    formData.append("resume_file", file);
    formData.append("num_questions", "5");
    
    if (jobDescription.trim()) {
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
      
      // Also extract resume text for later use
      const resumeTextFormData = new FormData();
      resumeTextFormData.append("file", file);
      
      const resumeTextResponse = await fetch('/api/extract-pdf-text/', {
        method: 'POST',
        body: resumeTextFormData,
      });
      
      if (resumeTextResponse.ok) {
        const textData = await resumeTextResponse.json();
        setResumeText(textData.text);
      }
      
      return data.questions;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  // Update your startRecording function to use a supported format
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Explicitly set audio format to WAV
      const options = { 
        mimeType: 'audio/webm',  // WebM is well supported by browsers
      };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Set up audio visualization
      setupAudioVisualization(stream);
    } catch (error) {
      console.error("Recording error:", error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please ensure your microphone is connected.",
        variant: "destructive",
      });
    }
  };

  // Setup audio visualization
  const setupAudioVisualization = (stream: MediaStream) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzer);

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isRecording) return;
        
        animationFrameRef.current = requestAnimationFrame(draw);
        analyzer.getByteFrequencyData(dataArray);
        setVisualizerData(Array.from(dataArray));
      };

      draw();
    } catch (error) {
      console.error("Audio visualization error:", error);
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setVisualizerData([]);
    }
  };

  // Update the analyzeAnswer function to convert to a supported format
  const analyzeAnswer = async (audioBlob: Blob, questionText: string) => {
    try {
      const formData = new FormData();
      
      // Check if the audio format is supported
      const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 
                            audioBlob.type.includes('mp3') ? 'mp3' : 
                            audioBlob.type.includes('wav') ? 'wav' : 'webm';
      
      // Use the detected extension
      formData.append("audio_file", audioBlob, `answer.${fileExtension}`);
      formData.append("question", questionText);
      
      if (resumeText) {
        formData.append("resume_text", resumeText);
      }
      
      if (jobDescription) {
        formData.append("job_description", jobDescription);
      }

      // First analyze the text content
      const contentResponse = await fetch('/api/analyze-answer/', {
        method: 'POST',
        body: formData,
      });

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json();
        throw new Error(errorData.detail || "Failed to analyze answer");
      }

      const contentData = await contentResponse.json();

      // Then analyze the speech patterns using the same audio blob
      const speechFormData = new FormData();
      speechFormData.append("audio_file", audioBlob, `answer.${fileExtension}`);

      const speechResponse = await fetch('/api/analyze-speech/', {
        method: 'POST',
        body: speechFormData,
      });

      if (!speechResponse.ok) {
        let errorDetail = "Failed to analyze speech";
        try {
          const errorData = await speechResponse.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorDetail);
      }

      const speechData = await speechResponse.json();

      setScore(contentData.score);
      return { contentAnalysis: contentData.analysis, speechAnalysis: speechData };
    } catch (error) {
      console.error("Audio analysis error:", error);
      throw error;
    }
  };

  // Handle resume upload
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      toast({
        title: "Analyzing resume...",
        description: "Please wait while we generate questions",
      });

      const generatedQuestions = await analyzeResume(file);
      
      if (generatedQuestions.length === 0) {
        throw new Error("No questions were generated");
      }

      setQuestions(generatedQuestions);
      setCurrentQuestion(0);
      setTextAnalysis("");
      setSpeechAnalysis(null);
      setAudioBlob(null);
      setScore(null);
      
      toast({
        title: "Resume analyzed",
        description: `Generated ${generatedQuestions.length} interview questions`,
      });
    } catch (error) {
      console.error("Resume analysis error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze resume",
        variant: "destructive",
      });
    }
  };

  // Handle job description input
  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJobDescription(e.target.value);
  };

  // Handle analysis of recorded answer
  const handleAnalyzeAnswer = async () => {
    try {
      if (!audioBlob) {
        toast({
          title: "Error",
          description: "No audio recording found",
          variant: "destructive",
        });
        return;
      }

      setIsAnalyzing(true);
      toast({
        title: "Analyzing answer...",
        description: "Please wait while we analyze your response",
      });

      const result = await analyzeAnswer(audioBlob, questions[currentQuestion].text);
      
      if (!result) {
        throw new Error("No analysis was returned");
      }

      setTextAnalysis(result.contentAnalysis);
      setSpeechAnalysis(result.speechAnalysis);
      setShowDetailedAnalysis(false);

      toast({
        title: "Analysis complete",
        description: "Your answer has been analyzed",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze answer",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset the current answer
  const resetAnswer = () => {
    setAudioBlob(null);
    setTextAnalysis("");
    setSpeechAnalysis(null);
    setScore(null);
  };

  // Toggle detailed analysis view
  const toggleDetailedAnalysis = () => {
    setShowDetailedAnalysis(!showDetailedAnalysis);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">AI Interview Practice</h1>

      {questions.length === 0 ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Your Resume</h2>
          <Input
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            className="mb-4"
          />
          
          <h3 className="text-md font-medium mb-2">Job Description (Optional)</h3>
          <textarea
            className="w-full p-2 border rounded-md mb-4 min-h-32"
            placeholder="Paste job description here to get more targeted questions and feedback..."
            value={jobDescription}
            onChange={handleJobDescriptionChange}
          />
          
          <p className="text-sm text-gray-400">
            Upload your resume to generate personalized interview questions based on your experience
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Question {currentQuestion + 1} of {questions.length}
            </h2>
            <p className="text-lg mb-6">{questions[currentQuestion].text}</p>
            
            <div className="space-y-4">
              <div className="flex space-x-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    disabled={audioBlob !== null}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={stopRecording}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </Button>
                )}
                
                {audioBlob && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleAnalyzeAnswer}
                      disabled={isRecording || isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Answer"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetAnswer}
                      disabled={isRecording || isAnalyzing}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </>
                )}
              </div>

              {isRecording && (
                <div className="mt-4 w-full h-16 bg-black/5 rounded-lg overflow-hidden">
                  <div className="flex h-full items-end justify-center space-x-1">
                    {visualizerData.map((value, index) => (
                      <div
                        key={index}
                        className="w-1 bg-primary transition-all duration-75"
                        style={{
                          height: `${(value / 255) * 100}%`,
                          minHeight: '2px'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {audioBlob && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Your Recording</h3>
                  <audio controls className="w-full">
                    <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                  </audio>
                </div>
              )}

              {/* Content Analysis Results */}
              {textAnalysis && (
                <Card className="p-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Content Analysis:</h3>
                    {score !== null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Score: {score}/100</span>
                        <Progress value={score} className="w-32 h-2" />
                      </div>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{textAnalysis}</p>
                </Card>
              )}

              {/* Speech Analysis Results */}
              {speechAnalysis && speechAnalysis.metrics && (
                <Card className="p-4 mt-4 bg-muted">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Speech Analysis:</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleDetailedAnalysis}
                      className="flex items-center"
                    >
                      <BarChart2 className="w-4 h-4 mr-1" />
                      {showDetailedAnalysis ? "Hide Details" : "Show Details"}
                    </Button>
                  </div>
                  
                  <div className="whitespace-pre-wrap mb-4">{speechAnalysis.feedback}</div>
                  
                  {showDetailedAnalysis && (
                    <div className="space-y-4 mt-4 p-4 bg-background rounded-md">
                      <div>
                        <h4 className="font-medium mb-2">Transcription:</h4>
                        <p className="text-sm italic">"{speechAnalysis.transcription || ''}"</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Speech Metrics:</h4>
                        <ul className="text-sm space-y-1">
                          <li><span className="font-medium">Word Count:</span> {speechAnalysis.metrics?.word_count || 0} words</li>
                          <li><span className="font-medium">Average Pitch:</span> {speechAnalysis.metrics?.average_pitch?.toFixed(2) || 0} Hz</li>
                          <li><span className="font-medium">Pauses:</span> {speechAnalysis.metrics?.pause_count || 0} (avg {speechAnalysis.metrics?.average_pause_duration?.toFixed(2) || 0} seconds)</li>
                        </ul>
                      </div>
                      
                      {speechAnalysis.metrics?.personality_scores && (
                        <div>
                          <h4 className="font-medium mb-2">Personality Analysis:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(speechAnalysis.metrics.personality_scores).map(([trait, score]) => (
                              <div key={trait} className="flex flex-col">
                                <div className="flex justify-between">
                                  <span className="text-sm">{trait}</span>
                                  <span className="text-sm font-medium">{score?.toFixed(1) || 0}%</span>
                                </div>
                                <Progress value={score || 0} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Visualization */}
                  <div className="mt-4 w-full h-16 bg-black/5 rounded-lg overflow-hidden">
                    <div className="flex h-full items-end justify-center space-x-1">
                      {speechAnalysis.metrics.visualization_data.map((value, index) => (
                        <div
                          key={index}
                          className="w-2 bg-gradient-to-t from-primary/80 to-primary hover:from-primary/90 hover:to-primary/90 rounded-t transition-all duration-75"
                          style={{
                            height: `${Math.min(Math.abs(value * 8), 100)}%`,
                            minHeight: '2px',
                            transform: 'scaleY(0.98)',
                            transformOrigin: 'bottom'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Visualization */}
                  {speechAnalysis.metrics.visualization_data && speechAnalysis.metrics.visualization_data.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Speech Pattern Visualization:</h4>
                      <div className="w-full h-32 bg-black/5 rounded-lg overflow-hidden p-2">
                        <div className="flex h-full items-end justify-start space-x-[2px] overflow-x-auto">
                          {speechAnalysis.metrics.visualization_data.map((value, index) => (
                            <div
                              key={index}
                              className="w-2 bg-primary/80 rounded-t transition-all duration-75"
                              style={{
                                height: `${Math.min(Math.abs(value * 8), 100)}%`,
                                minHeight: '2px'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <div className="mt-6">
                <PersonalityTracker 
                  text={speechAnalysis?.transcription || ""} 
                  isRealTime={isRecording} 
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentQuestion((prev) => prev > 0 ? prev - 1 : prev);
                    resetAnswer();
                  }}
                  disabled={currentQuestion === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Question
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentQuestion((prev) => prev < questions.length - 1 ? prev + 1 : prev);
                    resetAnswer();
                  }}
                  disabled={currentQuestion === questions.length - 1}
                >
                  Next Question
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}