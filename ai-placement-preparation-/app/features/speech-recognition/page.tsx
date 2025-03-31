import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, Pause, Volume2, FileAudio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SpeechRecognitionPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center mb-12">
        <Mic className="h-16 w-16 text-lime-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-4">Speech Recognition</h1>
        <p className="text-gray-400 max-w-2xl">
          Convert speech to text and process audio data using advanced transformer models. This feature uses Gradio,
          Transformers, and PyAudio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mic className="h-5 w-5 text-lime-400" />
              Audio Input
            </CardTitle>
            <CardDescription className="text-gray-400">
              Record audio or upload audio files for processing
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-300">
            <Tabs defaultValue="record" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="record" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Record Audio
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Upload Audio
                </TabsTrigger>
              </TabsList>
              <TabsContent value="record" className="p-4 bg-gray-800 rounded-md mt-2">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full h-24 bg-black rounded-md flex items-center justify-center">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-lime-400 rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 40 + 10}px`,
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="bg-lime-500 hover:bg-lime-600 text-black font-medium">
                      <Mic className="h-4 w-4 mr-2" /> Start Recording
                    </Button>
                    <Button variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
                      <Pause className="h-4 w-4 mr-2" /> Stop
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="upload" className="p-4 bg-gray-800 rounded-md mt-2">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <FileAudio className="h-10 w-10 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Drag and drop audio files here, or click to browse</p>
                  <Button className="bg-lime-500 hover:bg-lime-600 text-black font-medium">Select Files</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-lime-400" />
              Speech Processing
            </CardTitle>
            <CardDescription className="text-gray-400">
              Convert speech to text and analyze audio content
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-md p-4">
                <h3 className="text-white font-medium mb-2">Model Selection</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-lime-500 hover:bg-lime-600 text-black font-medium">Whisper</Button>
                  <Button variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
                    Wav2Vec
                  </Button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-md p-4">
                <h3 className="text-white font-medium mb-2">Processing Options</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-medium">
                    Transcribe
                  </Button>
                  <Button size="sm" variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
                    Translate
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-12">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-lime-400" />
            Transcription Results
          </CardTitle>
          <CardDescription className="text-gray-400">View and edit speech recognition results</CardDescription>
        </CardHeader>
        <CardContent className="text-gray-300">
          <div className="bg-gray-800 rounded-md p-6 min-h-32">
            <p className="text-gray-400 italic">Transcription will appear here after processing audio...</p>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
              Copy Text
            </Button>
            <Button className="bg-lime-500 hover:bg-lime-600 text-black font-medium">Download Results</Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">How to Use</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Record audio using the microphone or upload an audio file.</li>
          <li>Select the speech recognition model you want to use (Whisper or Wav2Vec).</li>
          <li>Choose the processing option (Transcribe or Translate).</li>
          <li>View the transcription results in the Transcription Results section.</li>
          <li>Copy or download the results as needed.</li>
        </ol>
        <div className="mt-6 p-4 bg-gray-800 rounded-md">
          <p className="text-gray-400 text-sm">
            <strong className="text-lime-400">Note:</strong> This UI connects to the Python backend running on Gradio.
            Make sure the backend is running according to the setup instructions.
          </p>
        </div>
      </div>
    </div>
  )
}

