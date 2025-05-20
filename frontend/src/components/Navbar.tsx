// src/components/Navbar.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:4000/auth/logout", {
        credentials: "include",
      });
      setUser(null);
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="w-full flex justify-between items-center p-4 shadow bg-white sticky top-0 left-0 z-50">
      <Link href="/" className="text-xl font-bold text-[#1a237e]">
        AI Interview Prep
      </Link>

      <div className="flex items-center space-x-3">
        <Link
          href="/"
          className="px-3 py-1.5 text-[#1a237e] font-semibold rounded-full hover:bg-[#e3e8f7] transition"
        >
          Home
        </Link>
        {!user ? (
          <>
            <button
              onClick={() => router.push("/login")}
              className="px-3 py-1.5 bg-white text-[#1a237e] font-semibold rounded-full shadow hover:bg-[#e3e8f7] transition"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="px-3 py-1.5 bg-[#1a237e] text-white font-semibold rounded-full shadow hover:bg-[#3b82f6] transition"
            >
              Sign Up
            </button>
          </>
        ) : (
          <div className="relative group">
            <button className="w-8 h-8 rounded-full bg-[#1a237e] text-white font-bold flex items-center justify-center">
              {(user.username?.charAt(0).toUpperCase()) || "U"}
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-[#1a237e]"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
