"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const res = await fetch("http://localhost:4000/auth/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.replace("/interview");
          }
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    checkLoggedIn();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user); // Update the global auth state
        setMessage("Login successful! Redirecting...");
        setTimeout(() => router.push("/interview"), 1000);
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch (err) {
      setMessage("Network error");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#e3e8f7] to-[#f5f7fa]">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-[#1a237e] text-center">
          Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            placeholder="Username"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a237e]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full py-2 bg-[#1a237e] text-white font-semibold rounded-lg hover:bg-[#3b82f6] transition"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="my-4 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-2 text-gray-500">or</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <button
          className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center"
          onClick={() => window.location.href = "http://localhost:4000/auth/google/"}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
            <g>
              <path
                fill="#4285F4"
                d="M44.5 20H24v8.5h11.7C34.6 33.4 29.8 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.9 0 5.6 1 7.7 2.7l6.4-6.4C34.1 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c10.5 0 19.5-8.5 19.5-19.5 0-1.3-.1-2.5-.3-3.5z"
              />
              <path
                fill="#34A853"
                d="M6.3 14.7l7 5.1C15.2 17.1 19.3 14.5 24 14.5c2.9 0 5.6 1 7.7 2.7l6.4-6.4C34.1 6.5 29.3 4.5 24 4.5c-7.2 0-13.3 4.1-16.7 10.2z"
              />
              <path
                fill="#FBBC05"
                d="M24 45.5c5.8 0 10.6-1.9 14.1-5.2l-6.5-5.3c-2 1.4-4.6 2.2-7.6 2.2-5.8 0-10.7-3.9-12.5-9.1l-7 5.4C7.2 41.1 14.7 45.5 24 45.5z"
              />
              <path
                fill="#EA4335"
                d="M44.5 20H24v8.5h11.7c-1.1 3.1-4.1 5.5-7.7 5.5-4.7 0-8.6-3.8-8.6-8.5s3.9-8.5 8.6-8.5c2.3 0 4.3.8 5.9 2.2l6.4-6.4C34.1 6.5 29.3 4.5 24 4.5c-7.2 0-13.3 4.1-16.7 10.2z"
              />
            </g>
          </svg>
          Login with Google
        </button>
        {message && (
          <div className="mt-4 text-center text-red-600">{message}</div>
        )}
        <div className="mt-6 text-center">
          <span>Don't have an account? </span>
          <button
            className="text-[#1a237e] underline font-semibold"
            onClick={() => router.push("/signup")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}