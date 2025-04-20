"use client";

import { useState } from "react";

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
    console.log('Answers:', answers);
    // Here you would send the answers to the backend for analysis
  };

  // If we're in sequential mode, show only the current question
  if (!showAllQuestions) {
    return (
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Interview Questions</h2>
        
        <div className="mb-4 p-1 bg-gray-100 rounded">
          <div className="flex justify-between text-sm text-gray-500 px-3 py-1">
            <span>Question {activeQuestion + 1} of {questions.length}</span>
            <button 
              className="text-blue-600 hover:underline"
              onClick={() => setShowAllQuestions(true)}
            >
              View All
            </button>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg mb-4">
          <h3 className="font-medium text-lg mb-1">
            <span className="font-semibold text-blue-600 mr-2">{activeQuestion + 1}.</span>
            {questions[activeQuestion]}
          </h3>
          
          <div className="mt-4">
            <label className="block text-gray-700 mb-2" htmlFor="answer">
              Your Answer:
            </label>
            <textarea
              id="answer"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your answer here..."
              value={answers[activeQuestion] || ''}
              onChange={handleAnswerChange}
            />
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <button
            onClick={handlePreviousQuestion}
            disabled={activeQuestion === 0}
            className={`px-4 py-2 rounded-md ${
              activeQuestion === 0 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            Previous
          </button>
          
          {activeQuestion < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmitInterview}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              Submit Interview
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // If we're viewing all questions at once
  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">
        Generated Interview Questions
        <button 
          onClick={() => setShowAllQuestions(false)}
          className="ml-4 text-sm px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
        >
          Practice Mode
        </button>
      </h2>
      
      <div className="space-y-4 mb-8">
        {questions.map((question, index) => (
          <div 
            key={index} 
            className="p-4 border rounded-lg"
          >
            <div className="flex items-start">
              <span className="font-semibold text-blue-600 mr-2">{index + 1}.</span>
              <p className="font-medium">{question}</p>
            </div>
            
            {answers[index] && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                <p className="text-gray-600 mt-1">{answers[index]}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 border border-green-100 rounded-lg bg-green-50">
        <h3 className="text-lg font-medium mb-2 text-green-800">Ready for More Practice?</h3>
        <p className="text-green-700 mb-4">
          Switch to Practice Mode to answer one question at a time.
        </p>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition duration-200 flex items-center"
          onClick={() => setShowAllQuestions(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Practice Mode
        </button>
      </div>
    </div>
  );
}