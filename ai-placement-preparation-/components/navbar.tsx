"use client"

import Link from "next/link"
import { Github, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Github className="h-6 w-6 text-lime-400" />
            <span className="font-bold text-white hidden md:inline-block">AI Placement Preparation</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end md:justify-between">
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium text-gray-300 transition-colors hover:text-lime-400">
              Home
            </Link>
            <Link href="/flow" className="text-sm font-medium text-gray-300 transition-colors hover:text-lime-400">
              Feature Flow
            </Link>
            <Link
              href="/features/document-processing"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
            >
              Document Processing
            </Link>
            <Link
              href="/features/computer-vision"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
            >
              Computer Vision
            </Link>
            <Link
              href="/features/speech-recognition"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
            >
              Speech Recognition
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden md:flex border-lime-500 text-lime-400 hover:bg-lime-950"
            >
              <Link href="/setup">Setup Guide</Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-b border-gray-800 bg-black">
          <div className="container py-4 px-4 space-y-3">
            <Link
              href="/"
              className="block text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/flow"
              className="block text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Feature Flow
            </Link>
            <Link
              href="/features/document-processing"
              className="block text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Document Processing
            </Link>
            <Link
              href="/features/computer-vision"
              className="block text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Computer Vision
            </Link>
            <Link
              href="/features/speech-recognition"
              className="block text-sm font-medium text-gray-300 transition-colors hover:text-lime-400"
              onClick={() => setIsMenuOpen(false)}
            >
              Speech Recognition
            </Link>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full border-lime-500 text-lime-400 hover:bg-lime-950"
            >
              <Link href="/setup" onClick={() => setIsMenuOpen(false)}>
                Setup Guide
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

