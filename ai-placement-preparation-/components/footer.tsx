import Link from "next/link"
import { Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black py-6">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-lime-400" />
            <p className="text-sm text-gray-400">AI Placement Preparation © {new Date().getFullYear()}</p>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="/setup" className="text-xs text-gray-400 hover:text-lime-400">
              Setup Guide
            </Link>
            <Link href="/flow" className="text-xs text-gray-400 hover:text-lime-400">
              Feature Flow
            </Link>
            <Link
              href="https://github.com"
              className="text-xs text-gray-400 hover:text-lime-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

