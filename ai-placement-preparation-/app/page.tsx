import Link from "next/link"
import { ArrowRight, Github, Code, FileText, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Github className="h-20 w-20 text-lime-400 mb-6" />
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-6">
          AI <span className="text-lime-400">Placement Preparation</span>
        </h1>
        <p className="max-w-2xl text-lg text-gray-400 mb-10">
          A centralized dashboard for your Python applications with a sleek GitHub-inspired interface.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild className="bg-lime-500 hover:bg-lime-600 text-black font-medium">
            <Link href="/flow">
              Explore Features <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
            <Link href="/setup">Setup Guide</Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white mb-10 text-center">Available Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900 border-gray-800 hover:border-lime-500 transition-all">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-lime-400" />
                Document Processing
              </CardTitle>
              <CardDescription className="text-gray-400">PDF processing with Google Generative AI</CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>Process documents, extract text from PDFs, and analyze content using Google's AI models.</p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-lime-500 text-lime-400 hover:bg-lime-950">
                <Link href="/features/document-processing">View Feature</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-lime-500 transition-all">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Code className="h-5 w-5 text-lime-400" />
                Computer Vision
              </CardTitle>
              <CardDescription className="text-gray-400">OpenCV and MediaPipe integration</CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>Process images and video with facial recognition, object detection, and more using OpenCV.</p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-lime-500 text-lime-400 hover:bg-lime-950">
                <Link href="/features/computer-vision">View Feature</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-lime-500 transition-all">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mic className="h-5 w-5 text-lime-400" />
                Speech Recognition
              </CardTitle>
              <CardDescription className="text-gray-400">Transformers and audio processing</CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p>Convert speech to text and process audio data using advanced transformer models.</p>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full border-lime-500 text-lime-400 hover:bg-lime-950">
                <Link href="/features/speech-recognition">View Feature</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}

