"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface QuestionsProps {
  questions: string[];
}

export function Questions({ questions }: QuestionsProps) {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showAllQuestions, setShowAllQuestions] = useState(false);

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
  };

  const handleSubmitInterview = () => {
    alert('Your interview responses have been submitted!');
    // Here you would send the answers to the backend for analysis
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
            {questions[activeQuestion]}
          </h3>
          <div className="mt-4">
            <label className="block text-[#374151] mb-2 font-medium" htmlFor="answer">
              Your Answer:
            </label>
            <textarea
              id="answer"
              rows={5}
              className="w-full px-3 py-2 border border-[#3b82f6] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] bg-white transition"
              placeholder="Type your answer here..."
              value={answers[activeQuestion] || ''}
              onChange={handleAnswerChange}
            />
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
              onClick={handleSubmitInterview}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold shadow-md transition"
            >
              Submit Interview
            </button>
          )}
        </div>
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
            <div className="flex items-start">
              <span className="font-semibold text-white bg-[#3b82f6] rounded-full w-8 h-8 flex items-center justify-center mr-3">{index + 1}</span>
              <p className="font-medium text-[#1a237e]">{question}</p>
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
    </motion.div>
  );
}