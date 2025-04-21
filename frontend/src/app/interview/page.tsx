"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { ResumeUpload } from '../../components/ResumeUpload';
import { Questions } from '../../components/Questions';

// Custom hook for draggable functionality
function useDraggable(initial = { x: 40, y: 40 }) {
  const [position, setPosition] = useState(initial);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = "none";
  };

  const onMouseMove = (e: MouseEvent) => {
    if (dragging.current) {
      setPosition({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    }
  };

  const onMouseUp = () => {
    dragging.current = false;
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  return { position, onMouseDown };
}

export default function InterviewPage() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const [bodyLangActive, setBodyLangActive] = useState(true);
  const [bodyLangFeedback, setBodyLangFeedback] = useState<string>("Initializing...");
  const [bodyLangData, setBodyLangData] = useState<any>(null);
  const [sending, setSending] = useState(false);

  const draggable = useDraggable({ x: 40, y: 40 });

  // Stop body language analysis when interview is submitted
  const handleInterviewSubmit = () => {
    setBodyLangActive(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (bodyLangActive) {
      interval = setInterval(async () => {
        if (
          webcamRef.current &&
          webcamRef.current.getScreenshot &&
          !sending
        ) {
          setSending(true);
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            try {
              const base64 = imageSrc.split(",")[1];
              const res = await fetch("http://localhost:8001/process-frame/?model=default&session_id=test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_base64: base64 }),
              });
              const data = await res.json();
              setBodyLangFeedback(data.feedback || "No feedback");
              setBodyLangData(data); // Save all data for feedback page
            } catch (err) {
              setBodyLangFeedback("Error connecting to analysis service.");
            }
          }
          setSending(false);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [bodyLangActive, sending]);

  useEffect(() => {
    if (!bodyLangActive && bodyLangData) {
      localStorage.setItem("bodyLangFeedback", JSON.stringify(bodyLangData));
    }
  }, [bodyLangActive, bodyLangData]);

  return (
    <main className="container mx-auto p-4" style={{ position: "relative" }}>
      <h1 className="text-3xl font-bold mb-8 text-center text-[#1a237e]">
        AI Placement Preparation Platform
      </h1>
      <div className="max-w-4xl mx-auto">
        <ResumeUpload 
          setQuestions={setQuestions} 
          setLoading={setLoading} 
          setError={setError} 
        />
        {loading && (
          <div className="text-center my-8">
            <div className="spinner"></div>
            <p className="text-[#1a237e]">Analyzing your resume and generating questions...</p>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4">
            {error}
          </div>
        )}
        {questions.length > 0 && !loading && (
          <Questions questions={questions} onSubmit={handleInterviewSubmit} />
        )}
      </div>
      {/* Webcam in top-right */}
      <div
        style={{
          position: "fixed",
          top: draggable.position.y,
          left: draggable.position.x,
          zIndex: 2000,
          width: 320,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 4px 24px #0002",
          padding: 18,
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          border: "1.5px solid #e0e7ff",
          transition: "all 0.3s cubic-bezier(.4,2,.6,1)",
          cursor: "move"
        }}
        onMouseDown={draggable.onMouseDown}
      >
        {bodyLangActive && (
          <div>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={280}
              style={{ borderRadius: 14, marginBottom: 12 }}
              videoConstraints={{ facingMode: "user" }}
            />
            <div style={{ fontSize: 16, color: "#1a237e", marginTop: 8, fontWeight: 500, lineHeight: 1.7 }}>
              {bodyLangData ? (
                <div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Eye:</span> {bodyLangData.eye_status}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Head:</span> {bodyLangData.head_status}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Emotion:</span> {bodyLangData.emotion}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Pose:</span> {bodyLangData.pose_status}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Time in Focus:</span> {bodyLangData.state_timers?.["Eyes Focused"]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Time Looking Left:</span> {bodyLangData.state_timers?.["Looking Left"]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Time Looking Right:</span> {bodyLangData.state_timers?.["Looking Right"]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Head Centered:</span> {bodyLangData.state_timers?.["Head Centered"]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Head Not Centered:</span> {bodyLangData.state_timers?.["Head Not Centered"]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Session Time:</span> {bodyLangData.total_time}
                  </div>
                  {bodyLangData.detected_objects && bodyLangData.detected_objects.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontWeight: 700 }}>Objects Detected:</span>
                      <ul style={{ marginLeft: 12, fontSize: 15 }}>
                        {bodyLangData.detected_objects.map((obj: any, idx: number) => (
                          <li key={idx}>{obj.label} ({Math.round(obj.confidence * 100)}%)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Actionable suggestions */}
                  <div style={{
                    marginTop: 12,
                    color: "#e11d48",
                    fontWeight: 600,
                    fontSize: 15,
                    background: "#fef2f2",
                    borderRadius: 8,
                    padding: "8px 12px"
                  }}>
                    {bodyLangData.eye_status !== "Eyes Focused" && "Try to maintain eye contact. "}
                    {bodyLangData.head_status !== "Head Centered" && "Keep your head centered. "}
                    {bodyLangData.emotion === "Neutral" && "Show more positive emotion. "}
                    {bodyLangData.pose_status !== "Pose detected" && "Sit upright and stay visible. "}
                  </div>
                </div>
              ) : (
                <div>Analyzing...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
