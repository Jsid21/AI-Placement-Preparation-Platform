"use client";

import React from 'react';
import { useState } from 'react';
import { ResumeUpload } from '../../components/ResumeUpload';
import { Questions } from '../../components/Questions';

export default function InterviewPage() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="container mx-auto p-4">
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
          <Questions questions={questions} />
        )}
      </div>
    </main>
  );
}
