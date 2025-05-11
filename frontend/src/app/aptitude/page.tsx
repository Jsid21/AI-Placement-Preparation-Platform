"use client";
import { useState } from "react";
import { motion } from "framer-motion";

type Question = {
  question: string;
  options: { [key: string]: string };
  correct_answer: string;
  explanation: string;
};

export default function AptitudeTestPage() {
  const [step, setStep] = useState<"config" | "test" | "result">("config");
  const [numQuestions, setNumQuestions] = useState(10);
  const [categories, setCategories] = useState<string[]>(["Logical Reasoning"]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [idx: number]: string }>({});
  const [loading, setLoading] = useState(false);

  // Replace with your backend API endpoint for generating aptitude questions
  const API_URL = "http://localhost:8000/api/generate-aptitude-questions";

  async function startTest() {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_questions: numQuestions, categories }),
      });
      const data = await res.json();
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setStep("test");
      } else {
        alert("Failed to generate questions. Please try again.");
      }
    } catch (e) {
      alert("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOptionSelect(qIdx: number, option: string) {
    setAnswers((prev) => ({ ...prev, [qIdx]: option }));
  }

  function submitTest() {
    setStep("result");
  }

  function restart() {
    setStep("config");
    setQuestions([]);
    setAnswers({});
  }

  // Score calculation
  const correct = Array.isArray(questions)
    ? questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_answer ? 1 : 0), 0)
    : 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#e9f1ff] to-[#f3f6fb] px-4 py-10">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-[#1a237e] text-center">
          Aptitude Test Practice
        </h1>
        {step === "config" && (
          <form
            onSubmit={e => {
              e.preventDefault();
              startTest();
            }}
            className="space-y-6"
          >
            <div>
              <label className="block font-medium mb-2">Number of Questions</label>
              <input
                type="number"
                min={5}
                max={50}
                value={numQuestions}
                onChange={e => setNumQuestions(Number(e.target.value))}
                className="border px-3 py-2 rounded w-32"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Categories</label>
              <div className="flex flex-wrap gap-3">
                {["Logical Reasoning", "Quantitative Aptitude", "English"].map(cat => (
                  <label key={cat} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={e => {
                        setCategories(cats =>
                          e.target.checked
                            ? [...cats, cat]
                            : cats.filter(c => c !== cat)
                        );
                      }}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#f59e42] to-[#fbbf24] text-[#1a237e] font-bold py-3 px-4 rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-lg text-lg"
              disabled={loading || categories.length === 0}
            >
              {loading ? "Generating..." : "Start Test"}
            </button>
          </form>
        )}
        {step === "test" && (
          <form
            onSubmit={e => {
              e.preventDefault();
              submitTest();
            }}
          >
            {questions.map((q, idx) => (
              <div key={idx} className="mb-8">
                <div className="font-semibold mb-2">
                  {idx + 1}. {q.question}
                </div>
                <div className="space-y-2">
                  {Object.entries(q.options).map(([key, val]) => (
                    <label key={key} className="block">
                      <input
                        type="radio"
                        name={`q${idx}`}
                        value={key}
                        checked={answers[idx] === key}
                        onChange={() => handleOptionSelect(idx, key)}
                        className="mr-2"
                      />
                      <span>{key}: {val}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#3b82f6] to-[#1a237e] text-white font-bold py-3 px-4 rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg text-lg"
            >
              Submit Test
            </button>
          </form>
        )}
        {step === "result" && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-[#1a237e] text-center">
              Score: {correct} / {questions.length}
            </h2>
            <div className="mb-6">
              {questions.map((q, idx) => (
                <div key={idx} className="mb-4 p-4 rounded bg-[#f3f6fb]">
                  <div className="font-medium mb-1">
                    {idx + 1}. {q.question}
                  </div>
                  <div>
                    <span>Your answer: </span>
                    <span className={answers[idx] === q.correct_answer ? "text-green-700 font-bold" : "text-red-600 font-bold"}>
                      {answers[idx] || "Not answered"}
                    </span>
                    <span> | Correct: <b>{q.correct_answer}</b></span>
                  </div>
                  <div className="text-sm mt-2 text-gray-700">
                    <b>Explanation:</b> {q.explanation}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={restart}
              className="w-full bg-gradient-to-r from-[#f59e42] to-[#fbbf24] text-[#1a237e] font-bold py-3 px-4 rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-lg text-lg"
            >
              Take Another Test
            </button>
          </div>
        )}
      </div>
    </main>
  );
}