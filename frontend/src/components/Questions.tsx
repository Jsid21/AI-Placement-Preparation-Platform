"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface QuestionsProps {
  questions: string[];
  onSubmit?: () => void; // Add this prop
}

// Add this helper function near the top of the file (after imports)
function cleanQuestionType(question: string) {
  // Remove all asterisks, then remove leading type label (e.g., Technical Question:)
  return question
    .replace(/\*+/g, "") // Remove all asterisks
    .replace(/^(Technical|Behavioral|HR|General)\s*Question:?\s*/i, "") // Remove type label at start
    .trim();
}

export function Questions({ questions, onSubmit }: QuestionsProps) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioBlobsPerQuestion, setAudioBlobsPerQuestion] = useState<{ [key: number]: Blob[] }>({});
  const [audioFeaturesPerQuestion, setAudioFeaturesPerQuestion] = useState<{ [key: number]: any }>({});
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [sentimentPerQuestion, setSentimentPerQuestion] = useState<{ [key: number]: any }>({});
  const [answerFeedbacks, setAnswerFeedbacks] = useState<{ [key: number]: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jobRoleError, setJobRoleError] = useState<string | null>(null);

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true; // <--- Make it continuous
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onresult = (event: any) => {
      // Concatenate all results so far
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      // Only add new part
      const prev = lastTranscriptRef.current;
      const newPart = fullTranscript.startsWith(prev)
        ? fullTranscript.slice(prev.length)
        : fullTranscript; // fallback if mismatch
      if (newPart.trim()) {
        setAnswers((prevAnswers) => ({
          ...prevAnswers,
          [activeQuestion]: (prevAnswers[activeQuestion] || "") + newPart,
        }));
      }
      lastTranscriptRef.current = fullTranscript;
    };

    // Restart recognition if it stops unexpectedly (only if still recording)
    recognitionRef.current.onend = () => {
      if (isRecording) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore errors if already started
        }
      }
    };

    recognitionRef.current.onerror = () => {
      // Optionally handle errors
    };
  }, [activeQuestion, isRecording]);

  useEffect(() => {
    lastTranscriptRef.current = "";
  }, [activeQuestion]);

  // Handle spacebar shortcut
  useEffect(() => {
    const handleSpace = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.tagName === "INPUT")
      ) {
        return; // Don't trigger if typing in input/textarea
      }
      if (e.code === "Space") {
        e.preventDefault();
        handleMicAndAudioClick();
      }
    };
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
    // eslint-disable-next-line
  }, [isRecording, activeQuestion]);

  useEffect(() => {
    // Call backend to clear session audio on mount (new session)
    fetch("http://localhost:8000/api/start-session", { method: "POST" });
    setAudioBlobsPerQuestion({});
  }, []);

  const handleMicAndAudioClick = async () => {
    if (isRecording) {
      // Stop both
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorder) mediaRecorder.stop();
      setIsRecording(false);
      // Stop audio stream tracks to release mic
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      setMediaRecorder(null);
    } else {
      lastTranscriptRef.current = "";
      // Start both
      if (recognitionRef.current) recognitionRef.current.start();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      // Use a local array for chunks
      let localChunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        localChunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(localChunks, { type: "audio/webm" });
        setAudioBlobsPerQuestion((prev) => {
          const updated = { ...prev };
          // Only add if not already present (avoid duplicates)
          if (!updated[activeQuestion]) updated[activeQuestion] = [];
          updated[activeQuestion] = [...updated[activeQuestion], audioBlob];
          return updated;
        });
        uploadAudio(audioBlob);
        setMediaRecorder(null);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    setAudioChunks([]);
    recorder.start();

    recorder.ondataavailable = (e) => {
      setAudioChunks((prev) => [...prev, e.data]);
    };

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      // Save blob for this question
      setAudioBlobsPerQuestion((prev) => {
        const updated = { ...prev };
        if (!updated[activeQuestion]) updated[activeQuestion] = [];
        updated[activeQuestion].push(audioBlob);
        return updated;
      });
      // Upload to backend
      uploadAudio(audioBlob);
      setAudioChunks([]);
    };

    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, `answer_${Date.now()}.webm`);
    formData.append("question_id", activeQuestion.toString());
    await fetch("http://localhost:8000/api/upload-audio", {
      method: "POST",
      body: formData,
    });
    // Fetch features after upload
    fetchAudioFeatures(activeQuestion);
  };

  const fetchAudioFeatures = async (questionId: number) => {
    const formData = new FormData();
    formData.append("question_id", questionId.toString());
    const res = await fetch("http://localhost:8000/api/analyze-audio", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const features = await res.json();
      setAudioFeaturesPerQuestion((prev) => ({
        ...prev,
        [questionId]: features,
      }));
    }
  };

  async function analyzeSentimentForAnswer(questionIdx: number, answer: string) {
    if (!answer) return;
    try {
      const res = await fetch("http://localhost:8000/api/analyze-sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answer }),
      });
      if (res.ok) {
        const sentiment = await res.json();
        setSentimentPerQuestion((prev) => ({
          ...prev,
          [questionIdx]: sentiment,
        }));
      }
    } catch (e) {
      // Optionally handle error
    }
  }

  async function fetchAnswerFeedback(question: string, answer: string, jobDescription?: string, resumeText?: string) {
    const res = await fetch("http://localhost:8000/api/analyze-answer-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, job_description: jobDescription, resume_text: resumeText }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.feedback;
    }
    return "Could not analyze answer.";
  }

  const handleNextQuestion = () => {
    if (activeQuestion < questions.length - 1) {
      setActiveQuestion(activeQuestion + 1);
    } else {
      setShowAllQuestions(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (activeQuestion > 0) {
      setActiveQuestion(activeQuestion - 1);
    }
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers({
      ...answers,
      [activeQuestion]: e.target.value
    });
    analyzeSentimentForAnswer(activeQuestion, e.target.value);
  };

  const handleSubmitInterview = async () => {
    try {
      // For each question, ensure sentiment is available
      const updatedSentiment: { [key: number]: any } = { ...sentimentPerQuestion };
      for (let q = 0; q < questions.length; q++) {
        if (!updatedSentiment[q] && answers[q]) {
          try {
            const res = await fetch("http://localhost:8000/api/analyze-sentiment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: answers[q] }),
            });
            if (res.ok) {
              updatedSentiment[q] = await res.json();
            }
          } catch (e) {
            updatedSentiment[q] = null;
          }
        }
      }
      setSentimentPerQuestion(updatedSentiment);

      // For each question, for each audio blob, call /api/analyze-audio and collect results
      const results: any[] = [];
      for (let q = 0; q < questions.length; q++) {
        const blobs = audioBlobsPerQuestion[q] || [];
        const featuresList: any[] = [];
        for (let i = 0; i < blobs.length; i++) {
          // Upload each audio blob (if not already uploaded)
          const formData = new FormData();
          formData.append("audio", blobs[i], `answer_${Date.now()}_${i}.webm`);
          formData.append("question_id", q.toString());
          await fetch("http://localhost:8000/api/upload-audio", {
            method: "POST",
            body: formData,
          });
          // Analyze
          const analyzeForm = new FormData();
          analyzeForm.append("question_id", q.toString());
          const res = await fetch("http://localhost:8000/api/analyze-audio", {
            method: "POST",
            body: analyzeForm,
          });
          if (res.ok) {
            const features = await res.json();
            featuresList.push(features);
          }
        }
        if (featuresList.length > 0) {
          const avg = (key: string) =>
            featuresList.reduce((sum, f) => sum + (f[key] || 0), 0) / featuresList.length;
          results.push({
            question: questions[q],
            duration_sec: avg("duration_sec"),
            avg_pitch: avg("avg_pitch"),
            tempo_bpm: avg("tempo_bpm"),
            avg_volume: avg("avg_volume"),
            total_pauses_sec: avg("total_pauses_sec"),
            num_pauses: avg("num_pauses"),
            sentiment: updatedSentiment[q] || null,
          });
        } else {
          results.push({ question: questions[q], noAudio: true, sentiment: updatedSentiment[q] || null });
        }
      }
      setAnalysisResults(results);
      localStorage.setItem("analysisResults", JSON.stringify(results));

      // After collecting answers:
      const feedbacks: { [key: number]: any } = {};
      for (let i = 0; i < questions.length; i++) {
        if (answers[i]) {
          feedbacks[i] = await fetchAnswerFeedback(questions[i], answers[i]);
        }
      }
      setAnswerFeedbacks(feedbacks);
      localStorage.setItem("answerFeedbacks", JSON.stringify(feedbacks));

      setSubmitted(true);
      setSubmitError(null);

      // Send session report
      const sessionId = "some-session-id"; // Replace with actual session ID logic
      const totalSeconds = results.reduce((sum, r) => sum + (r.duration_sec || 0), 0);
      const formattedTime = new Date(totalSeconds * 1000).toISOString().substr(11, 8); // HH:mm:ss

      const eyeStates = {}; // Collect or calculate eye states
      const headStates = {}; // Collect or calculate head states
      const emotions = {}; // Collect or calculate emotions
      const framesProcessed = 0; // Replace with actual frame count if available
      const attentionScore = 0; // Replace with actual attention score if available

      const feedback = {
        candidate_response: Object.values(answers),
        correctness: analysisResults.reduce((sum, r) => sum + (r.correctness || 0), 0) / analysisResults.length || null,
        depth: analysisResults.reduce((sum, r) => sum + (r.depth || 0), 0) / analysisResults.length || null,
        relevance: analysisResults.reduce((sum, r) => sum + (r.relevance || 0), 0) / analysisResults.length || null,
        communication_clarity: analysisResults.reduce((sum, r) => sum + (r.communication_clarity || 0), 0) / analysisResults.length || null,
        job_fit_score: analysisResults.reduce((sum, r) => sum + (r.job_fit_score || 0), 0) / analysisResults.length || null,
        suggestions: [].concat(...analysisResults.map(r => r.suggestions || [])),
        recommendation: analysisResults.map(r => r.recommendation).filter(Boolean).join(" ") || "No recommendation.",
        assessment_text: analysisResults.map(r => r.assessment_text).filter(Boolean).join("\n") || null
      };

      const sessionReport = {
        session_id: sessionId,
        total_time: { seconds: totalSeconds, formatted: formattedTime },
        eye_states: eyeStates,
        head_states: headStates,
        emotions: emotions,
        frames_processed: framesProcessed,
        attention_score: attentionScore,
        ai_feedback: feedback
      };

      await fetch('http://localhost:4000/session-report/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionReport),
      });
    } catch (e) {
      setSubmitError("Submission failed. Please try again.");
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError("Please upload your resume.");
      return;
    }
    if (!jobRole.trim()) {
      setJobRoleError("Please enter a job role.");
      return;
    }
    setLoading(true);
    setError(null);

    // Prepare form data
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job_role", jobRole);
    formData.append("num_questions", numQuestions.toString());

    try {
      const response = await fetch("http://localhost:8000/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        // Show backend error for empty/invalid PDF
        setError(data.detail || "Failed to generate questions. Please upload a valid resume PDF.");
        setQuestions([]);
        return;
      }
      if (data.questions && Array.isArray(data.questions) && data.questions[0]?.startsWith("Failed to extract")) {
        setError("Please upload a valid resume PDF with sufficient and relevant information.");
        setQuestions([]);
        return;
      }
      setQuestions(data.questions);
    } catch (err) {
      setError("Failed to generate questions. Please upload a valid resume PDF.");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Sequential (Practice) Mode
  if (!showAllQuestions) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8 bg-white p-8 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-bold mb-6 text-[#1a237e]">Interview Questions</h2>
        <div className="mb-4 p-2 bg-[#f3f6fb] rounded-lg flex justify-between items-center text-sm text-[#3b82f6]">
          <span>Question {activeQuestion + 1} of {questions.length}</span>
          <button
            className="text-[#1a237e] hover:underline font-medium"
            onClick={() => setShowAllQuestions(true)}
          >
            View All
          </button>
        </div>
        <motion.div
          key={activeQuestion}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="p-5 border border-[#e9f1ff] rounded-lg mb-4 bg-[#f3f6fb]"
        >
          <h3 className="font-semibold text-lg mb-2 text-[#1a237e] flex items-center">
            <span className="mr-2 bg-[#3b82f6] text-white rounded-full w-8 h-8 flex items-center justify-center">{activeQuestion + 1}</span>
            {cleanQuestionType(questions[activeQuestion])}
          </h3>
          <div className="mt-4">
            <label className="block text-[#374151] mb-2 font-medium" htmlFor="answer">
              Your Answer:
            </label>
            <div className="relative">
              <textarea
                id="answer"
                rows={5}
                className="w-full px-3 py-2 border border-[#3b82f6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] bg-white transition pr-12"
                placeholder="Type your answer here or use the mic..."
                value={answers[activeQuestion] || ''}
                onChange={handleAnswerChange}
              />
              <button
                type="button"
                aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                onClick={handleMicAndAudioClick}
                className={`absolute top-2 right-2 p-2 rounded-full transition ${
                  isRecording
                    ? "bg-red-100 text-red-600 animate-pulse"
                    : "bg-[#e9f1ff] text-[#1a237e] hover:bg-[#3b82f6] hover:text-white"
                }`}
                tabIndex={0}
              >
                {isRecording ? (
                  // Recording icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="red" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                ) : (
                  // Mic icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v2m0 0h3m-3 0H9m6-6a3 3 0 01-6 0V7a3 3 0 016 0v5z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isRecording ? "Listening... (press Space to stop)" : "Press mic or Space to answer by voice"}
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleMicAndAudioClick}
              className={`px-5 py-2 rounded-full font-semibold transition ${
                isRecording
                  ? "bg-red-600 text-white"
                  : "bg-[#e9f1ff] text-[#1a237e] hover:bg-[#3b82f6] hover:text-white"
              }`}
            >
              {isRecording ? "Stop Recording & Speech-to-Text" : "Record Answer (Audio + Text)"}
            </button>
            <ul className="mt-4">
              {(audioBlobsPerQuestion[activeQuestion] || []).map((blob, idx) => (
                <li key={idx}>
                  <audio controls src={URL.createObjectURL(blob)} />
                </li>
              ))}
            </ul>
            {audioFeaturesPerQuestion[activeQuestion] && (
              <div className="mt-2 p-2 bg-gray-50 rounded">
                <strong>Audio Analysis:</strong>
                <ul>
                  <li>Duration: {audioFeaturesPerQuestion[activeQuestion].duration_sec?.toFixed(2)} sec</li>
                  <li>Pitch: {audioFeaturesPerQuestion[activeQuestion].avg_pitch?.toFixed(2)}</li>
                  <li>Pace (BPM): {audioFeaturesPerQuestion[activeQuestion].tempo_bpm?.toFixed(2)}</li>
                  <li>Volume: {audioFeaturesPerQuestion[activeQuestion].avg_volume?.toFixed(4)}</li>
                  <li>Pauses: {audioFeaturesPerQuestion[activeQuestion].num_pauses}</li>
                  <li>Total Pause Time: {audioFeaturesPerQuestion[activeQuestion].total_pauses_sec?.toFixed(2)} sec</li>
                </ul>
              </div>
            )}
          </div>
        </motion.div>
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePreviousQuestion}
            disabled={activeQuestion === 0}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              activeQuestion === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#e9f1ff] text-[#1a237e] hover:bg-[#3b82f6] hover:text-white'
            }`}
          >
            Previous
          </button>
          {activeQuestion < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="px-5 py-2 bg-gradient-to-r from-[#3b82f6] to-[#1a237e] text-white rounded-full font-semibold shadow-md hover:from-[#1a237e] hover:to-[#3b82f6] transition"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold shadow-md transition"
            >
              Submit Interview
            </button>
          )}
        </div>
        <div className="mt-6 flex items-center">
          <button
            onClick={handleMicAndAudioClick}
            className={`px-5 py-2 rounded-full font-semibold transition ${
              isRecording
                ? 'bg-red-600 text-white'
                : 'bg-[#e9f1ff] text-[#1a237e] hover:bg-[#3b82f6] hover:text-white'
            }`}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
        </div>
        {submitted && (
          <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-[#1a237e]">Audio Analysis Summary</h2>
            {analysisResults.map((res, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="font-semibold text-[#3b82f6] mb-2">
                  Q{idx + 1}: {res.question}
                </h3>
                {res.noAudio ? (
                  <div className="text-red-500">No audio recorded for this question.</div>
                ) : (
                  <ul className="ml-4 text-sm">
                    <li>Duration: {res.duration_sec?.toFixed(2)} sec</li>
                    <li>Pitch: {res.avg_pitch?.toFixed(2)}</li>
                    <li>Pace (BPM): {res.tempo_bpm?.toFixed(2)}</li>
                    <li>Volume: {res.avg_volume?.toFixed(4)}</li>
                    <li>Pauses: {res.num_pauses?.toFixed(1)}</li>
                    <li>Total Pause Time: {res.total_pauses_sec?.toFixed(2)} sec</li>
                    {res.sentiment && (
                      <>
                        <li>Sentiment Polarity: {res.sentiment.polarity?.toFixed(2)}</li>
                        <li>Subjectivity: {res.sentiment.subjectivity?.toFixed(2)}</li>
                      </>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {submitted && (
          <div className="flex justify-center mt-6">
            <a
              href="/feedback"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-[#3b82f6] text-white rounded-full font-semibold"
            >
              View Feedback & Analysis
            </a>
          </div>
        )}
      </motion.div>
    );
  }

  // All Questions Mode
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8 bg-white p-8 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold mb-6 text-[#1a237e] flex items-center">
        Generated Interview Questions
        <button
          onClick={() => setShowAllQuestions(false)}
          className="ml-4 text-sm px-4 py-1 bg-[#e9f1ff] hover:bg-[#3b82f6] hover:text-white text-[#1a237e] rounded-full font-semibold transition"
        >
          Practice Mode
        </button>
      </h2>
      <div className="space-y-5 mb-8">
        {questions.map((question, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.07 }}
            className="p-5 border border-[#e9f1ff] rounded-lg bg-[#f3f6fb]"
          >
            <div className="font-medium text-lg mb-2 text-[#1a237e]">
              {cleanQuestionType(question)}
            </div>
            {answers[index] && (
              <div className="mt-3 pt-3 border-t border-[#e9f1ff]">
                <p className="text-sm font-medium text-[#374151]">Your Answer:</p>
                <p className="text-[#374151] mt-1">{answers[index]}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 p-6 border border-green-100 rounded-xl bg-green-50"
      >
        <h3 className="text-lg font-bold mb-2 text-green-800">Ready for More Practice?</h3>
        <p className="text-green-700 mb-4">
          Switch to Practice Mode to answer one question at a time.
        </p>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition duration-200 flex items-center"
          onClick={() => setShowAllQuestions(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Practice Mode
        </button>
      </motion.div>
      {error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4">
    {error}
  </div>
)}
    </motion.div>
  );
}