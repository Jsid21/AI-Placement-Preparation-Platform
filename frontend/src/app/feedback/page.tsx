"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar, Legend, LineChart, Line, Cell } from "recharts";

function getQuestionType(question: string) {
  if (/technical/i.test(question)) return { type: "Technical", color: "bg-[#e0f2fe] text-[#0369a1]" };
  if (/behavioral|behavioural/i.test(question)) return { type: "Behavioral", color: "bg-[#fef9c3] text-[#92400e]" };
  if (/hr|human resources/i.test(question)) return { type: "HR", color: "bg-[#ede9fe] text-[#7c3aed]" };
  return { type: "General", color: "bg-[#f3f6fb] text-[#1a237e]" };
}

function generateBodyLangFeedback(data: any) {
  if (!data) return "No body language data available.";

  // Metrics
  const focusTime = data.state_timers?.["Eyes Focused"] || "00:00:00";
  const lookingLeft = data.state_timers?.["Looking Left"] || "00:00:00";
  const lookingRight = data.state_timers?.["Looking Right"] || "00:00:00";
  const headCentered = data.state_timers?.["Head Centered"] || "00:00:00";
  const headNotCentered = data.state_timers?.["Head Not Centered"] || "00:00:00";
  const sessionTime = data.total_time || "00:00:00";
  const emotion = data.emotion || "Neutral";
  const pose = data.pose_status || "Unknown";
  const detectedObjects = data.detected_objects || [];

  // Suggestions
  let suggestions: string[] = [];
  if (focusTime < sessionTime) suggestions.push("Try to maintain eye contact with the camera for a greater portion of the interview.");
  if (headNotCentered > headCentered) suggestions.push("Keep your head centered to appear more attentive.");
  if (emotion === "Neutral") suggestions.push("Show more positive emotion, such as smiling, to appear more engaged.");
  if (pose !== "Pose detected") suggestions.push("Sit upright and ensure your upper body is visible to the camera.");
  if (detectedObjects.some((obj: any) => obj.label === "phone")) suggestions.push("Avoid distractions like your phone during the interview.");

  // Build feedback summary
  return (
    `<div>
      <div class="mb-2"><b>Session Time:</b> ${sessionTime}</div>
      <div class="mb-2"><b>Eye Contact:</b> Focused for ${focusTime}, Looking Left: ${lookingLeft}, Looking Right: ${lookingRight}</div>
      <div class="mb-2"><b>Head Position:</b> Centered for ${headCentered}, Not Centered: ${headNotCentered}</div>
      <div class="mb-2"><b>Emotion Detected:</b> ${emotion}</div>
      <div class="mb-2"><b>Pose:</b> ${pose}</div>
      ${detectedObjects.length > 0 ? `<div class="mb-2"><b>Objects Detected:</b> ${detectedObjects.map((obj: any) => obj.label).join(", ")}</div>` : ""}
      <div class="mt-3 p-3 bg-green-50 rounded text-green-900">
        <b>Positive Feedback & Suggestions:</b>
        <ul class="list-disc ml-6">
          ${suggestions.length > 0
            ? suggestions.map((s) => `<li>${s}</li>`).join("")
            : "<li>Great job! Your body language was confident and professional. Keep it up!</li>"
          }
        </ul>
      </div>
    </div>`
  );
}

export default function FeedbackPage() {
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [personalityResults, setPersonalityResults] = useState<{ [key: number]: any }>({});
  const [bodyLangFeedback, setBodyLangFeedback] = useState<any>(null);
  const [answerFeedbacks, setAnswerFeedbacks] = useState<{ [key: number]: string }>({});
  const router = useRouter();
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (feedbackRef.current) {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf()
        .set({
          margin: 0.5,
          filename: "AI-Interview-Feedback-Report.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        })
        .from(feedbackRef.current)
        .save();
    }
  };

  useEffect(() => {
    // Load analysis results from localStorage (or use context/api as needed)
    const data = localStorage.getItem("analysisResults");
    if (data) setAnalysisResults(JSON.parse(data));
    else router.replace("/interview"); // Redirect if no data
  }, [router]);

  useEffect(() => {
    const data = localStorage.getItem("bodyLangFeedback");
    if (data) setBodyLangFeedback(JSON.parse(data));
  }, []);

  useEffect(() => {
    const data = localStorage.getItem("answerFeedbacks");
    if (data) setAnswerFeedbacks(JSON.parse(data));
  }, []);

  useEffect(() => {
    if (!analysisResults.length) return;
    // Fetch personality for each answer
    analysisResults.forEach((res, idx) => {
      if (res.question && !personalityResults[idx]) {
        fetch("http://localhost:8000/api/analyze-personality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: res.question }),
        })
          .then((r) => r.json())
          .then((data) => {
            setPersonalityResults((prev) => ({ ...prev, [idx]: data }));
          });
      }
    });
    // eslint-disable-next-line
  }, [analysisResults]);

  if (!analysisResults.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-[#1a237e] mb-4">No Feedback Available</h2>
        <button
          className="px-6 py-2 bg-[#3b82f6] text-white rounded-full font-semibold"
          onClick={() => router.push("/interview")}
        >
          Go to Interview
        </button>
      </div>
    );
  }

  // Prepare data for charts
  const chartData = analysisResults.map((res, idx) => ({
    name: `Q${idx + 1}`,
    Pitch: res.avg_pitch,
    Pace: res.tempo_bpm,
    Volume: res.avg_volume,
    Pauses: res.num_pauses,
    Duration: res.duration_sec,
    PauseTime: res.total_pauses_sec,
    Polarity: res.sentiment?.polarity,
    Subjectivity: res.sentiment?.subjectivity,
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e9f1ff] to-[#f3f6fb] py-10 px-4">
      <div ref={feedbackRef}>
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-[#1a237e] text-center">
            <span role="img" aria-label="feedback">📝</span> Your Interview Feedback
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Radar Chart for overall features */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-2 text-[#3b82f6] text-center">Speech Quality Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  <Radar name="Pitch" dataKey="Pitch" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Pace" dataKey="Pace" stroke="#1a237e" fill="#1a237e" fillOpacity={0.2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Bar Chart for Pauses */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-2 text-[#3b82f6] text-center">Pauses & Duration</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Pauses" fill="#3b82f6" />
                  <Bar dataKey="PauseTime" fill="#1a237e" />
                  <Bar dataKey="Duration" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Radial Bar Chart for Sentiment */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-2 text-[#3b82f6] text-center">Sentiment Gauge</h2>
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="100%"
                  barSize={18}
                  data={analysisResults.map((res, idx) => ({
                    name: `Q${idx + 1}`,
                    polarity: ((res.sentiment?.polarity ?? 0) + 1) * 50,
                  }))}
                >
                  <RadialBar
                    label={{ position: "insideStart", fill: "#fff" }}
                    background
                    dataKey="polarity"
                    fill="#34d399"
                  />
                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            {/* Line Chart for Feature Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-2 text-[#3b82f6] text-center">Feature Trends Across Questions</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="Pitch" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="Pace" stroke="#f59e42" strokeWidth={2} />
                  <Line type="monotone" dataKey="Polarity" stroke="#34d399" strokeWidth={2} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-[#1a237e]">Detailed Feedback</h2>
            {analysisResults.map((res, idx) => {
              const { type, color } = getQuestionType(res.question);
              let cleanQuestion = res.question
                .replace(/^Q?\d+[:.\s-]*/i, "") // Remove Q1:, 1., etc.
                .replace(/^(\*+|\s)+/, "")      // Remove leading asterisks/spaces
                .replace(/^\*\*/, "")           // Remove double asterisks at start
                .replace(/\*\*/g, "")           // Remove any remaining double asterisks
                .replace(new RegExp(`^${type} Question:?\\s*`, "i"), "") // Remove duplicate type prefix
                .trim();
              return (
                <div key={idx} className="mb-6 p-4 rounded-lg bg-[#f3f6fb] border border-[#e0e7ff] avoid-break">
                  <h3 className={`font-semibold mb-2 rounded px-3 py-2 inline-block ${color}`}>
                    Q{idx + 1}: {type} Question: {cleanQuestion}
                  </h3>
                  {res.noAudio ? (
                    <div className="text-red-500">No audio recorded for this question.</div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <ul className="ml-4 text-sm flex-1">
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
                      {personalityResults[idx] && (
                        <div style={{ width: 360, height: 180 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(personalityResults[idx]).map(([trait, value]) => ({
                                trait,
                                value: Number(value),
                              }))}
                              layout="vertical"
                              margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                            >
                              <XAxis type="number" domain={[0, 1]} hide />
                              <YAxis
                                dataKey="trait"
                                type="category"
                                tick={{ fontWeight: 600, fill: "#3b82f6" }}
                                width={150}
                              />
                              <Tooltip
                                cursor={{ fill: "#e0e7ff" }}
                                formatter={(v: number) => v.toFixed(2)}
                              />
                              <Bar
                                dataKey="value"
                                fill="#f59e42"
                                radius={[10, 10, 10, 10]}
                                isAnimationActive={true}
                                barSize={28}
                              >
                                {Object.entries(personalityResults[idx]).map(([_, __], i) => (
                                  <Cell
                                    key={`cell-${i}`}
                                    fill={
                                      [
                                        "#f59e42", // Extroversion
                                        "#6366f1", // Neuroticism
                                        "#34d399", // Agreeableness
                                        "#fbbf24", // Conscientiousness
                                        "#3b82f6", // Openness
                                      ][i]
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}
                  {answerFeedbacks[idx] && (
                    <div className="mt-4 p-5 bg-white rounded-xl shadow border border-[#e0e7ff]">
                      <h4 className="text-lg font-bold text-[#3b82f6] mb-2">AI Interview Feedback</h4>
                      <div
                        className="space-y-2 text-[#1a237e] text-base leading-relaxed"
                        suppressHydrationWarning
                        dangerouslySetInnerHTML={{
                          __html:
                            answerFeedbacks[idx]
                              .replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold text-[#3b82f6]">$1</span>')
                              .replace(/\*/g, "")
                              .replace(/(?:\r\n|\r|\n)/g, "<br />")
                              .replace(/^\d+\.\s/gm, '<span class="font-semibold text-[#f59e42]">•</span> ')
                              .replace(/Actionable Improvement Suggestions:/g, '<span class="font-semibold text-[#34d399]">Suggestions:</span>')
                              .replace(/Job Fit Score:/g, '<span class="font-semibold text-[#f43f5e]">Job Fit Score:</span>')
                              .replace(/Correctness:/g, '<span class="font-semibold">Correctness:</span>')
                              .replace(/Depth:/g, '<span class="font-semibold">Depth:</span>')
                              .replace(/Relevance to the Job:/g, '<span class="font-semibold">Relevance to the Job:</span>')
                              .replace(/Communication Clarity:/g, '<span class="font-semibold">Communication Clarity:</span>')
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {bodyLangFeedback && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg shadow avoid-break">
                <h3 className="text-lg font-bold mb-2 text-blue-900">Body Language Analysis</h3>
                <div
                  className="text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: generateBodyLangFeedback(bodyLangFeedback) }}
                />
              </div>
            )}
          </div>
          <div className="flex justify-center mt-10">
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#1a237e] text-white rounded-full font-bold shadow-lg hover:from-[#1a237e] hover:to-[#3b82f6] transition"
            >
              Download Feedback Report (PDF)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}