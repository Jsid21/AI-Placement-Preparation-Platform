"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { ResumeUpload } from '../../components/ResumeUpload';
import { Questions } from '../../components/Questions';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      // Not logged in, redirect to login
      router.replace("/login");
    }
  }, [user, router]);

  if (user === null) {
    // Optionally show a loading spinner or nothing while redirecting
    return null;
  }

  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const webcamRef = useRef<Webcam>(null);
  const [bodyLangActive, setBodyLangActive] = useState(false);
  const [bodyLangFeedback, setBodyLangFeedback] = useState<string>("Initializing...");
  const [bodyLangData, setBodyLangData] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showBodyLangDetails, setShowBodyLangDetails] = useState(false);

  const draggable = useDraggable({ x: 40, y: 40 });

  // Stop body language analysis when interview is submitted
  const handleInterviewSubmit = () => {
    setBodyLangActive(false);
  };

  useEffect(() => {
    if (questions.length > 0 && !loading) {
      setBodyLangActive(true);
    } else {
      setBodyLangActive(false);
    }
  }, [questions, loading]);

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
      {bodyLangActive && (
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
                <div><b>Eye:</b> {bodyLangData.eye_status}</div>
                <div><b>Head:</b> {bodyLangData.head_status}</div>
                <div><b>Emotion:</b> {bodyLangData.emotion}</div>
                <div><b>Pose:</b> {bodyLangData.pose_status}</div>
                <button
                  style={{
                    margin: "12px 0 8px 0",
                    padding: "6px 16px",
                    background: "#e9f1ff",
                    color: "#1a237e",
                    borderRadius: 8,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left"
                  }}
                  onClick={() => setShowBodyLangDetails((prev) => !prev)}
                >
                  {showBodyLangDetails ? "Hide Details ▲" : "Show All Parameters ▼"}
                </button>
                {showBodyLangDetails && (
                  <div style={{ fontSize: 15, marginTop: 4 }}>
                    <div><b>Time in Focus:</b> {bodyLangData.state_timers?.["Eyes Focused"]}</div>
                    <div><b>Time Looking Left:</b> {bodyLangData.state_timers?.["Looking Left"]}</div>
                    <div><b>Time Looking Right:</b> {bodyLangData.state_timers?.["Looking Right"]}</div>
                    <div><b>Head Centered:</b> {bodyLangData.state_timers?.["Head Centered"]}</div>
                    <div><b>Head Not Centered:</b> {bodyLangData.state_timers?.["Head Not Centered"]}</div>
                    <div><b>Session Time:</b> {bodyLangData.total_time}</div>
                    {bodyLangData.detected_objects && bodyLangData.detected_objects.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <b>Objects Detected:</b>
                        <ul>
                          {bodyLangData.detected_objects.map((obj: any, idx: number) => (
                            <li key={idx}>{obj.label} ({Math.round(obj.confidence * 100)}%)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>Analyzing...</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
