"use client";

import { useState, FormEvent, Dispatch, SetStateAction, useRef } from 'react';

interface ResumeUploadProps {
  setQuestions: Dispatch<SetStateAction<string[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function ResumeUpload({ setQuestions, setLoading, setError }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jobRoleError, setJobRoleError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    let isValid = true;
    
    // Validate file
    if (!file) {
      setFileError('Please select a resume file (PDF format)');
      isValid = false;
    } else if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Only PDF files are accepted');
      isValid = false;
    } else if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setFileError('File size should be less than 10MB');
      isValid = false;
    } else {
      setFileError(null);
    }
    
    // Validate job role
    if (!jobRole.trim()) {
      setJobRoleError('Please enter a job role');
      isValid = false;
    } else if (jobRole.trim().length < 3) {
      setJobRoleError('Job role should be at least 3 characters long');
      isValid = false;
    } else {
      setJobRoleError(null);
    }
    
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('resume', file!);
      formData.append('job_role', jobRole);
      formData.append('num_questions', numQuestions.toString());
      
      const response = await fetch('http://localhost:8000/api/parse-resume', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process resume');
      }
      
      setQuestions(data.questions);
      
      // Reset form after successful submission
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload Your Resume</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="resume">
            Resume (PDF)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="resume"
            accept=".pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setFileError(null);
            }}
            className={`w-full px-3 py-2 border ${fileError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            aria-describedby={fileError ? "resume-error" : undefined}
          />
          {fileError && (
            <p id="resume-error" className="mt-1 text-sm text-red-600">
              {fileError}
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="jobRole">
            Job Role
          </label>
          <input
            type="text"
            id="jobRole"
            value={jobRole}
            onChange={(e) => {
              setJobRole(e.target.value);
              setJobRoleError(null);
            }}
            className={`w-full px-3 py-2 border ${jobRoleError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="e.g., Software Engineer, Data Scientist"
            aria-describedby={jobRoleError ? "job-role-error" : undefined}
          />
          {jobRoleError && (
            <p id="job-role-error" className="mt-1 text-sm text-red-600">
              {jobRoleError}
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="numQuestions">
            Number of Questions
          </label>
          <div className="flex items-center">
            <button 
              type="button" 
              onClick={() => setNumQuestions(prev => Math.max(3, prev - 1))}
              className="px-3 py-2 bg-gray-200 rounded-l-md hover:bg-gray-300"
            >
              -
            </button>
            <input
              type="number"
              id="numQuestions"
              value={numQuestions}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 3 && val <= 15) {
                  setNumQuestions(val);
                }
              }}
              min={3}
              max={15}
              className="w-16 text-center px-3 py-2 border-t border-b border-gray-300"
              aria-label="Number of questions"
            />
            <button 
              type="button" 
              onClick={() => setNumQuestions(prev => Math.min(15, prev + 1))}
              className="px-3 py-2 bg-gray-200 rounded-r-md hover:bg-gray-300"
            >
              +
            </button>
            <span className="ml-3 text-gray-600">
              (3-15 questions)
            </span>
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={fileError !== null || jobRoleError !== null}
        >
          Generate Interview Questions
        </button>
      </form>
    </div>
  );
}