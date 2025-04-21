"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

export default function FeedbackPage() {
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load analysis results from localStorage (or use context/api as needed)
    const data = localStorage.getItem("analysisResults");
    if (data) setAnalysisResults(JSON.parse(data));
    else router.replace("/interview"); // Redirect if no data
  }, [router]);

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
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e9f1ff] to-[#f3f6fb] py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-[#1a237e] text-center">
          <span role="img" aria-label="feedback">📝</span> Your Interview Feedback
        </h1>
        <div className="mb-10 flex flex-col md:flex-row gap-8 items-center justify-center">
          {/* Radar Chart for overall features */}
          <div className="w-full md:w-1/2">
            <h2 className="text-lg font-semibold mb-2 text-[#3b82f6] text-center">Speech Quality Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Radar name="Pitch" dataKey="Pitch" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Radar name="Pace" dataKey="Pace" stroke="#1a237e" fill="#1a237e" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart for Pauses */}
          <div className="w-full md:w-1/2">
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
                <ul className="ml-4 text-sm">
                  <li>Duration: {res.duration_sec?.toFixed(2)} sec</li>
                  <li>Pitch: {res.avg_pitch?.toFixed(2)}</li>
                  <li>Pace (BPM): {res.tempo_bpm?.toFixed(2)}</li>
                  <li>Volume: {res.avg_volume?.toFixed(4)}</li>
                  <li>Pauses: {res.num_pauses?.toFixed(1)}</li>
                  <li>Total Pause Time: {res.total_pauses_sec?.toFixed(2)} sec</li>
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}