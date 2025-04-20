"use client";

import { useState } from "react";

interface QuestionsProps {
  questions: string[];
}

export function Questions({ questions }: QuestionsProps) {
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Generated Interview Questions</h2>
      
      <div className="space-y-4 mb-8">
        {questions.map((question, index) => (
          <div 
            key={index} 
            className={`p-4 border rounded-lg transition-all duration-200 ${
              activeQuestion === index ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 border-gray-200'
            }`}
            onClick={() => setActiveQuestion(activeQuestion === index ? null : index)}
          >
            <div className="flex items-start">
              <span className="font-semibold text-blue-600 mr-2">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{question}</p>
                
                {activeQuestion === index && (
                  <div className="mt-4 pl-2 border-l-2 border-blue-300">
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Preparation Tips:</h4>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      <li>Review related topics in your resume</li>
                      <li>Prepare a structured answer using the STAR method</li>
                      <li>Practice your response out loud</li>
                      <li>Keep your answer concise (1-2 minutes)</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="ml-2">
                {activeQuestion === index ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 border border-green-100 rounded-lg bg-green-50">
        <h3 className="text-lg font-medium mb-2 text-green-800">Ready for the Next Step?</h3>
        <p className="text-green-700 mb-4">
          Practice answering these questions to prepare for your interview. 
          Use our AI Mock Interview feature to get feedback on your responses.
        </p>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition duration-200 flex items-center"
          onClick={() => alert('Mock Interview feature coming soon!')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Start Mock Interview
        </button>
      </div>
    </div>
  );
}