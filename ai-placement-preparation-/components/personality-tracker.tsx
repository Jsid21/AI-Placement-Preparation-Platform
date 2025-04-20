'use client'

import { useEffect, useState } from 'react'
import { Progress } from "@/components/ui/progress"

interface PersonalityScores {
  Extroversion: number;
  Neuroticism: number;
  Agreeableness: number;
  Conscientiousness: number;
  Openness: number;
}

interface PersonalityTrackerProps {
  text?: string;
  isRealTime?: boolean;
}

export default function PersonalityTracker({ text = '', isRealTime = false }: PersonalityTrackerProps) {
  const [scores, setScores] = useState<PersonalityScores>({
    Extroversion: 0,
    Neuroticism: 0,
    Agreeableness: 0,
    Conscientiousness: 0,
    Openness: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Function to analyze text with REST API
  const analyzeText = async (text: string) => {
    if (!text || text.trim().length < 10) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('text', text);
      
      const response = await fetch('/api/analyze-personality', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze personality');
      }
      
      const data = await response.json();
      setScores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error("Personality analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Use regular API instead of WebSockets for simplicity
  useEffect(() => {
    if (text && text.trim().length > 10) {
      analyzeText(text);
    }
  }, [text]);

  return (
    <div className="w-full p-4 bg-gray-900 rounded-md border border-gray-800">
      <h3 className="text-xl font-medium mb-4 text-white">Personality Analysis</h3>
      
      {loading && <p className="text-sm text-gray-400 mb-2">Analyzing...</p>}
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
      
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(scores).map(([trait, score]) => (
          <div key={trait} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-300">{trait}</span>
              <span className="text-sm font-medium text-white">{score.toFixed(1)}%</span>
            </div>
            <Progress 
              value={score} 
              className="h-2 bg-gray-700" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}