"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { analyzeResume, analyzeSpeech, analyzeVideo, InterviewQuestion, AnalysisMetrics } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"

export default function InterviewPage() {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(null)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      // Cleanup media streams when component unmounts
      audioStream?.getTracks().forEach(track => track.stop())
      videoStream?.getTracks().forEach(track => track.stop())
    }
  }, [audioStream, videoStream])

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show loading toast
      toast({
        title: "Analyzing resume...",
        description: "Please wait while we generate questions",
      });

      const generatedQuestions = await analyzeResume(file);
      
      if (generatedQuestions.length === 0) {
        throw new Error("No questions were generated");
      }

      setQuestions(generatedQuestions);
      setCurrentQuestion(0); // Reset to first question
      
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

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
      
      setAudioStream(audioStream)
      setVideoStream(videoStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream
      }

      const mediaRecorder = new MediaRecorder(new MediaStream([
        ...audioStream.getTracks(),
        ...videoStream.getTracks()
      ]))

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start recording",
        variant: "destructive",
      })
    }
  }

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !questions[currentQuestion]) return;

    // Show loading toast
    toast({
      title: "Processing recording...",
      description: "Please wait while we analyze your response",
    });

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) return;

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
          const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });

          const [speechAnalysis, videoAnalysis] = await Promise.all([
            analyzeSpeech(
              new File([audioBlob], "answer.wav"),
              questions[currentQuestion].text
            ),
            analyzeVideo(new File([videoBlob], "recording.webm"))
          ]);

          setMetrics({
            ...videoAnalysis,
            emotions: speechAnalysis.emotions
          });

          toast({
            title: "Analysis complete",
            description: "Your response has been analyzed",
          });

          // Cleanup streams
          audioStream?.getTracks().forEach(track => track.stop());
          videoStream?.getTracks().forEach(track => track.stop());
          setAudioStream(null);
          setVideoStream(null);
          setIsRecording(false);

          resolve();
        } catch (error) {
          console.error("Analysis error:", error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to analyze recording",
            variant: "destructive",
          });
          resolve();
        }
      };

      mediaRecorderRef.current.stop();
    });
  };

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
          <p className="text-sm text-gray-400">
            Upload your resume to generate personalized interview questions
          </p>
        </Card>
      ) : questions[currentQuestion] ? ( // Add this check
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Question {currentQuestion + 1} of {questions.length}
            </h2>
            <p className="text-lg mb-6">{questions[currentQuestion].text}</p>
            
            {/* Video preview */}
            {videoStream && (
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-900">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full"
                />
              </div>
            )}

            <div className="space-x-4">
              {!isRecording ? (
                <Button onClick={startRecording}>
                  Start Recording
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={() => stopRecording()}
                >
                  Stop Recording
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion((prev) => 
                  prev < questions.length - 1 ? prev + 1 : prev
                )}
              >
                Next Question
              </Button>
            </div>
          </Card>

          {metrics && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Eye Contact</label>
                  <Progress value={metrics.eye_contact} className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Head Position</label>
                  <Progress value={metrics.head_position} className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Confidence</label>
                  <Progress value={metrics.confidence} className="mt-2" />
                </div>
                {metrics.emotions && (
                  <div>
                    <label className="text-sm font-medium">Emotions</label>
                    {Object.entries(metrics.emotions).map(([emotion, score]) => (
                      <div key={emotion} className="mt-2">
                        <label className="text-xs text-gray-400">{emotion}</label>
                        <Progress value={score * 100} className="mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-6">
          <p className="text-lg">No questions available. Please upload your resume.</p>
        </Card>
      )}
    </div>
  )
}