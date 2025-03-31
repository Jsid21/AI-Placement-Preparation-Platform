import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Upload, Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DocumentProcessingPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center mb-12">
        <FileText className="h-16 w-16 text-lime-400 mb-4" />
        <h1 className="text-4xl font-bold text-white mb-4">Document Processing</h1>
        <p className="text-gray-400 max-w-2xl">
          Process documents, extract text from PDFs, and analyze content using Google's AI models. This feature uses
          Streamlit, Google Generative AI, and PyPDF2.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-lime-400" />
              Upload Documents
            </CardTitle>
            <CardDescription className="text-gray-400">Upload PDF files for processing and analysis</CardDescription>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Drag and drop PDF files here, or click to browse</p>
              <Button className="bg-lime-500 hover:bg-lime-600 text-black font-medium">Select Files</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-lime-400" />
              Document Analysis
            </CardTitle>
            <CardDescription className="text-gray-400">Extract insights and analyze document content</CardDescription>
          </CardHeader>
          <CardContent className="text-gray-300">
            <Tabs defaultValue="extract" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="extract" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Extract Text
                </TabsTrigger>
                <TabsTrigger
                  value="summarize"
                  className="data-[state=active]:bg-lime-500 data-[state=active]:text-black"
                >
                  Summarize
                </TabsTrigger>
                <TabsTrigger value="analyze" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                  Analyze
                </TabsTrigger>
              </TabsList>
              <TabsContent value="extract" className="p-4 bg-gray-800 rounded-md mt-2">
                <p>Extract text from PDF documents and process the content.</p>
              </TabsContent>
              <TabsContent value="summarize" className="p-4 bg-gray-800 rounded-md mt-2">
                <p>Generate concise summaries of document content using AI.</p>
              </TabsContent>
              <TabsContent value="analyze" className="p-4 bg-gray-800 rounded-md mt-2">
                <p>Perform in-depth analysis of document structure and content.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800 mb-12">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-lime-400" />
            Results
          </CardTitle>
          <CardDescription className="text-gray-400">View and download processing results</CardDescription>
        </CardHeader>
        <CardContent className="text-gray-300">
          <div className="bg-gray-800 rounded-md p-6 text-center">
            <p className="text-gray-400 mb-4">No documents have been processed yet.</p>
            <p className="text-gray-400">Upload a document to see results here.</p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">How to Use</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Upload a PDF document using the upload section.</li>
          <li>Select the type of processing you want to perform (Extract, Summarize, or Analyze).</li>
          <li>View the results in the Results section.</li>
          <li>Download or export the processed data as needed.</li>
        </ol>
        <div className="mt-6 p-4 bg-gray-800 rounded-md">
          <p className="text-gray-400 text-sm">
            <strong className="text-lime-400">Note:</strong> This UI connects to the Python backend running on
            Streamlit. Make sure the backend is running according to the setup instructions.
          </p>
        </div>
      </div>
    </div>
  )
}

