"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface ResumeUploadProps {
  setQuestions: (questions: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function ResumeUpload({ setQuestions, setLoading, setError }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [jobRoleError, setJobRoleError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type !== "application/pdf") {
      setFileError("Please upload a PDF file.");
      setFile(null);
    } else {
      setFileError(null);
      setFile(selectedFile || null);
    }
  };

  const handleJobRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJobRole(e.target.value);
    setJobRoleError(e.target.value.trim() === "" ? "Please enter a job role." : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError("Please upload your resume.");
      return;
    }
    if (!jobRole.trim()) {
      setJobRoleError("Please enter a job role.");
      return;
    }
    setLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      setQuestions([
        `Why are you interested in the ${jobRole} role?`,
        `Describe a challenging project from your resume.`,
        `How do you stay updated with the latest trends in ${jobRole}?`,
        `What skills from your resume make you a good fit for this position?`,
        `Tell us about a time you solved a problem relevant to ${jobRole}.`
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-xl shadow-lg p-8 mb-8"
    >
      <h2 className="text-2xl font-bold mb-6 text-[#1a237e] text-center">
        Upload Resume &amp; Get Interview Questions
      </h2>
      <div className="mb-6">
        <label className="block text-[#1a237e] font-medium mb-2" htmlFor="resume">
          Resume (PDF)
        </label>
        <div
          className={`flex items-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
            fileError ? "border-red-400 bg-red-50" : "border-[#3b82f6] bg-[#f3f6fb] hover:bg-[#e9f1ff]"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className="w-6 h-6 text-[#3b82f6] mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[#1a237e]">
            {file ? file.name : "Click to upload your resume"}
          </span>
          <input
            ref={fileInputRef}
            id="resume"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {fileError && <p className="text-red-600 mt-2 text-sm">{fileError}</p>}
      </div>
      <div className="mb-6">
        <label className="block text-[#1a237e] font-medium mb-2" htmlFor="jobRole">
          Target Job Role
        </label>
        <input
          id="jobRole"
          type="text"
          value={jobRole}
          onChange={handleJobRoleChange}
          placeholder="e.g. Frontend Developer"
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition ${
            jobRoleError ? "border-red-400" : "border-[#3b82f6]"
          }`}
        />
        {jobRoleError && <p className="text-red-600 mt-2 text-sm">{jobRoleError}</p>}
      </div>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        type="submit"
        className="w-full bg-gradient-to-r from-[#3b82f6] to-[#1a237e] hover:from-[#1a237e] hover:to-[#3b82f6] text-white font-bold py-3 px-4 rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg text-lg"
        disabled={!!fileError || !!jobRoleError}
      >
        Generate Interview Questions
      </motion.button>
    </motion.form>
  );
}