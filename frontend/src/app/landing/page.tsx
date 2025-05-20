"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* ✅ REMOVED Login/Signup buttons */}

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-12">
        {/* Left: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full md:w-1/2 text-left"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a237e] mb-6 tracking-tight drop-shadow-lg text-left">
            Ace Your Next Interview
          </h1>
          <p className="text-lg md:text-2xl text-[#374151] mb-10 max-w-xl drop-shadow text-left">
            Upload your resume and get AI-generated, role-specific interview questions instantly. Practice smarter, land your dream job faster.
          </p>
          <motion.button
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/interview")}
            className="px-10 py-4 bg-gradient-to-r from-[#3b82f6] to-[#1a237e] text-white text-xl font-semibold rounded-full shadow-lg transition-all duration-200 hover:from-[#1a237e] hover:to-[#3b82f6] focus:outline-none focus:ring-4 focus:ring-blue-300 text-left"
          >
            Start Interview
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/aptitude")}
            className="ml-4 px-10 py-4 bg-gradient-to-r from-[#f59e42] to-[#fbbf24] text-[#1a237e] text-xl font-semibold rounded-full shadow-lg transition-all duration-200 hover:from-[#fbbf24] hover:to-[#f59e42] focus:outline-none focus:ring-4 focus:ring-yellow-300 text-left"
          >
            Start Aptitude Test
          </motion.button>
        </motion.div>

        {/* Right: Image */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full md:w-1/2 flex justify-center mt-12 md:mt-0"
        >
          <img
            src="/ai-answer-demo.png"
            alt="AI Interview Demo"
            className="max-w-full md:max-w-lg rounded-2xl shadow-2xl border border-white/30"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
        </motion.div>
      </div>

      {/* Optional: Overlay for better text contrast */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none" />
    </main>
  );
}
