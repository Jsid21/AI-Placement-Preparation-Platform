"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar, Legend, LineChart, Line, Cell } from "recharts";

export default function FeedbackPage() {
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [personalityResults, setPersonalityResults] = useState<{ [key: number]: any }>({});
  const router = useRouter();

  useEffect(() => {
    // Load analysis results from localStorage (or use context/api as needed)
    const data = localStorage.getItem("analysisResults");
    if (data) setAnalysisResults(JSON.parse(data));
    else router.replace("/interview"); // Redirect if no data
  }, [router]);

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
          {analysisResults.map((res, idx) => (
            <div key={idx} className="mb-6 p-4 rounded-lg bg-[#f3f6fb] border border-[#e9f1ff]">
              <h3 className="font-semibold text-[#3b82f6] mb-2">
                Q{idx + 1}: {res.question}
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
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}