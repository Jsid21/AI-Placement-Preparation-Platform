import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal, FileText, Code, Mic } from "lucide-react"

export default function SetupPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-white mb-8">Setup Guide</h1>
      <p className="text-gray-400 max-w-3xl mb-10">
        Follow these instructions to set up and run the AI Placement Preparation locally. Each feature has its own
        requirements and setup process.
      </p>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900">
          <TabsTrigger value="general" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
            General Setup
          </TabsTrigger>
          <TabsTrigger value="feature1" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
            Document Processing
          </TabsTrigger>
          <TabsTrigger value="feature2" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
            Computer Vision
          </TabsTrigger>
          <TabsTrigger value="feature3" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
            Speech Recognition
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Terminal className="h-5 w-5 text-lime-400" />
                General Setup Instructions
              </CardTitle>
              <CardDescription className="text-gray-400">
                Setting up the Next.js frontend and Python backend
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Frontend Setup (Next.js)</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Clone the repository</p>
                  <p className="text-lime-400">git clone https://github.com/your-username/python-project-hub.git</p>
                  <p className="text-gray-400"># Navigate to the project directory</p>
                  <p className="text-lime-400">cd python-project-hub</p>
                  <p className="text-gray-400"># Install dependencies</p>
                  <p className="text-lime-400">npm install</p>
                  <p className="text-gray-400"># Start the development server</p>
                  <p className="text-lime-400">npm run dev</p>
                </div>
                <p className="mt-3">
                  The frontend will be available at <span className="text-lime-400">http://localhost:3000</span>
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Backend Setup</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Create a virtual environment</p>
                  <p className="text-lime-400">python -m venv venv</p>
                  <p className="text-gray-400"># Activate the virtual environment (Windows)</p>
                  <p className="text-lime-400">venv\Scripts\activate</p>
                  <p className="text-gray-400"># Activate the virtual environment (macOS/Linux)</p>
                  <p className="text-lime-400">source venv/bin/activate</p>
                  <p className="text-gray-400"># Install common requirements</p>
                  <p className="text-lime-400">pip install -r requirements.txt</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Environment Variables</h3>
                <p className="mb-2">
                  Create a <span className="text-lime-400">.env</span> file in the root directory with the following
                  variables:
                </p>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-lime-400">NEXT_PUBLIC_API_URL=http://localhost:8000</p>
                  <p className="text-lime-400"># Add other environment variables as needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature1">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-lime-400" />
                Document Processing Setup
              </CardTitle>
              <CardDescription className="text-gray-400">
                Setting up the document processing feature with Streamlit and Google AI
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Requirements</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-lime-400">streamlit</p>
                  <p className="text-lime-400">google-generativeai</p>
                  <p className="text-lime-400">PyPDF2</p>
                  <p className="text-lime-400">streamlit-webrtc</p>
                  <p className="text-lime-400">openai-whisper</p>
                  <p className="text-lime-400">python-dotenv</p>
                  <p className="text-lime-400">aioice</p>
                  <p className="text-lime-400">aiortc</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Installation</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Navigate to Feature 1 directory</p>
                  <p className="text-lime-400">cd "Feature 1"</p>
                  <p className="text-gray-400"># Install requirements</p>
                  <p className="text-lime-400">pip install -r requirements.txt</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Running the Application</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Start the Streamlit app</p>
                  <p className="text-lime-400">streamlit run app.py</p>
                </div>
                <p className="mt-3">
                  The application will be available at <span className="text-lime-400">http://localhost:8501</span>
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Environment Variables</h3>
                <p className="mb-2">
                  Create a <span className="text-lime-400">.env</span> file in the Feature 1 directory with:
                </p>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-lime-400">GOOGLE_API_KEY=your_google_api_key</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature2">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Code className="h-5 w-5 text-lime-400" />
                Computer Vision Setup
              </CardTitle>
              <CardDescription className="text-gray-400">
                Setting up the computer vision feature with OpenCV and MediaPipe
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Requirements</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-lime-400">opencv-python</p>
                  <p className="text-lime-400">mediapipe</p>
                  <p className="text-lime-400">numpy</p>
                  <p className="text-lime-400">deepface</p>
                  <p className="text-lime-400">tf-keras</p>
                  <p className="text-lime-400">fastapi</p>
                  <p className="text-lime-400">uvicorn</p>
                  <p className="text-lime-400">ollama</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Installation</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Navigate to Feature 2 directory</p>
                  <p className="text-lime-400">cd "Feature 2"</p>
                  <p className="text-gray-400"># Install requirements</p>
                  <p className="text-lime-400">pip install -r requirements.txt</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Running the Application</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Start the FastAPI server</p>
                  <p className="text-lime-400">uvicorn app:app --reload</p>
                </div>
                <p className="mt-3">
                  The API will be available at <span className="text-lime-400">http://localhost:8000</span>
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Additional Setup</h3>
                <p>For facial recognition features, you may need to download pre-trained models:</p>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Download pre-trained models</p>
                  <p className="text-lime-400">python download_models.py</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature3">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mic className="h-5 w-5 text-lime-400" />
                Speech Recognition Setup
              </CardTitle>
              <CardDescription className="text-gray-400">
                Setting up the speech recognition feature with Transformers
              </CardDescription>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-3">Requirements</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-lime-400">gradio==3.50.2</p>
                  <p className="text-lime-400">transformers==4.30.2</p>
                  <p className="text-lime-400">torch==2.0.1</p>
                  <p className="text-lime-400">SpeechRecognition==3.10.0</p>
                  <p className="text-lime-400">numpy==1.24.3</p>
                  <p className="text-lime-400">pyaudio==0.2.13</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Installation</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Navigate to Feature 3 directory</p>
                  <p className="text-lime-400">cd "Feature 3"</p>
                  <p className="text-gray-400"># Install requirements</p>
                  <p className="text-lime-400">pip install -r requirements.txt</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Running the Application</h3>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Start the Gradio app</p>
                  <p className="text-lime-400">python app.py</p>
                </div>
                <p className="mt-3">
                  The application will be available at <span className="text-lime-400">http://localhost:7860</span>
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-3">Troubleshooting</h3>
                <p className="mb-2">If you encounter issues with PyAudio:</p>
                <div className="bg-black rounded-md p-4 font-mono text-sm">
                  <p className="text-gray-400"># Windows</p>
                  <p className="text-lime-400">pip install pipwin</p>
                  <p className="text-lime-400">pipwin install pyaudio</p>
                  <p className="text-gray-400"># Linux</p>
                  <p className="text-lime-400">sudo apt-get install python3-pyaudio</p>
                  <p className="text-gray-400"># macOS</p>
                  <p className="text-lime-400">brew install portaudio</p>
                  <p className="text-lime-400">pip install pyaudio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

