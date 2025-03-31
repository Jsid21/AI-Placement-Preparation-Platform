import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Code, Camera, Eye, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ComputerVisionPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center mb-12">
        <Code className="h-16 w-16 text-lime-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-4">Computer Vision</h1>
        <p className="text-gray-400 max-w-2xl">
          Process images and video with facial recognition, object detection, and more using OpenCV and MediaPipe. This
          feature uses FastAPI as a backend service.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-lime-400" />
              Camera Feed
            </CardTitle>
            <CardDescription className="text-gray-400">Live camera processing with computer vision</CardDescription>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="bg-black aspect-video rounded-md flex items-center justify-center mb-4">
              <Camera className="h-16 w-16 text-gray-700" />
            </div>
            <div className="flex justify-between">
              <Button className="bg-lime-500 hover:bg-lime-600 text-black font-medium">Start Camera</Button>
              <Button variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
                Capture Frame
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-lime-400" />
              Vision Models
            </CardTitle>
            <CardDescription className="text-gray-400">
              Select computer vision models and processing options
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-300">
            <Tabs defaultValue="face" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="face" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Face Detection
                </TabsTrigger>
                <TabsTrigger value="object" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Object Detection
                </TabsTrigger>
                <TabsTrigger value="pose" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Pose Estimation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="face" className="p-4 bg-gray-800 rounded-md mt-2">
                <p className="mb-4">Detect and analyze faces in images or video streams.</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-medium">
                    Detect Faces
                  </Button>
                  <Button size="sm" variant="outline" className="border-lime-500 text-lime-400 hover:bg-lime-950">
                    Recognize Faces
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="object" className="p-4 bg-gray-800 rounded-md mt-2">
                <p className="mb-4">Detect and classify objects in images or video streams.</p>
                <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-medium">
                  Detect Objects
                </Button>
              </TabsContent>
              <TabsContent value="pose" className="p-4 bg-gray-800 rounded-md mt-2">
                <p className="mb-4">Estimate human poses in images or video streams.</p>
                <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-medium">
                  Estimate Pose
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-12">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-lime-400" />
            Processing Results
          </CardTitle>
          <CardDescription className="text-gray-400">
            View and analyze computer vision processing results
          </CardDescription>
        </CardHeader>
        <CardContent className="text-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black aspect-video rounded-md flex items-center justify-center">
              <p className="text-gray-700">Processed Output</p>
            </div>
            <div className="bg-gray-800 rounded-md p-4">
              <h3 className="text-white font-medium mb-2">Detection Results</h3>
              <div className="font-mono text-sm text-gray-400">
                <p>No detection results available.</p>
                <p>Select a model and process an image to see results.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">How to Use</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Start the camera feed or upload an image for processing.</li>
          <li>
            Select the computer vision model you want to use (Face Detection, Object Detection, or Pose Estimation).
          </li>
          <li>Click the corresponding action button to process the image or video stream.</li>
          <li>View the results in the Processing Results section.</li>
        </ol>
        <div className="mt-6 p-4 bg-gray-800 rounded-md">
          <p className="text-gray-400 text-sm">
            <strong className="text-lime-400">Note:</strong> This UI connects to the Python backend running on FastAPI.
            Make sure the backend is running according to the setup instructions.
          </p>
        </div>
      </div>
    </div>
  )
}

