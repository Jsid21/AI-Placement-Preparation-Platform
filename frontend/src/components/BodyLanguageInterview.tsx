import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

const API_URL = "http://localhost:8001/process-frame/";

const BodyLanguageInterview: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [feedback, setFeedback] = useState<string>("Initializing...");
  const [sending, setSending] = useState(false);

  // Capture frame and send to API every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
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
            const res = await fetch(API_URL + "?model=default&session_id=test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_base64: base64 }),
            });
            const data = await res.json();
            setFeedback(data.feedback || "No feedback");
          } catch (err) {
            setFeedback("Error connecting to analysis service.");
          }
        }
        setSending(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sending]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Body Language Interview</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        videoConstraints={{ facingMode: "user" }}
      />
      <div style={{ marginTop: 20, fontSize: 18, color: "#1976d2" }}>
        <strong>Real-Time Feedback:</strong>
        <div>{feedback}</div>
      </div>
    </div>
  );
};

export default BodyLanguageInterview;