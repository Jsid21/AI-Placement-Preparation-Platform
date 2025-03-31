"use client"

import { useCallback } from "react"
import ReactFlow, {
  type Node,
  type Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel,
} from "reactflow"
import "reactflow/dist/style.css"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Code, Mic, Home } from "lucide-react"

// Custom node components
const CustomNode = ({ data }: { data: any }) => {
  return (
    <Card className="w-64 bg-gray-900 border-gray-800 hover:border-lime-500 transition-all">
      <CardHeader className="p-4">
        <div className="flex items-center gap-2">
          {data.icon}
          <CardTitle className="text-lg text-white">{data.label}</CardTitle>
        </div>
        <CardDescription className="text-gray-400">{data.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Button className="w-full bg-lime-500 hover:bg-lime-600 text-black font-medium" onClick={data.onClick}>
          View Feature
        </Button>
      </CardContent>
    </Card>
  )
}

// Node types
const nodeTypes = {
  custom: CustomNode,
}

export default function FlowPage() {
  const router = useRouter()

  // Initial nodes
  const initialNodes: Node[] = [
    {
      id: "home",
      type: "custom",
      position: { x: 250, y: 5 },
      data: {
        label: "Home",
        description: "Main dashboard",
        icon: <Home className="h-5 w-5 text-lime-400" />,
        onClick: () => router.push("/"),
      },
    },
    {
      id: "document-processing",
      type: "custom",
      position: { x: 50, y: 200 },
      data: {
        label: "Document Processing",
        description: "PDF processing with Google AI",
        icon: <FileText className="h-5 w-5 text-lime-400" />,
        onClick: () => router.push("/features/document-processing"),
      },
    },
    {
      id: "computer-vision",
      type: "custom",
      position: { x: 250, y: 350 },
      data: {
        label: "Computer Vision",
        description: "OpenCV and MediaPipe",
        icon: <Code className="h-5 w-5 text-lime-400" />,
        onClick: () => router.push("/features/computer-vision"),
      },
    },
    {
      id: "speech-recognition",
      type: "custom",
      position: { x: 450, y: 200 },
      data: {
        label: "Speech Recognition",
        description: "Transformers and audio processing",
        icon: <Mic className="h-5 w-5 text-lime-400" />,
        onClick: () => router.push("/features/speech-recognition"),
      },
    },
  ]

  // Initial edges
  const initialEdges: Edge[] = [
    {
      id: "home-to-document",
      source: "home",
      target: "document-processing",
      animated: true,
      style: { stroke: "#84cc16", strokeWidth: 2 },
    },
    {
      id: "home-to-computer",
      source: "home",
      target: "computer-vision",
      animated: true,
      style: { stroke: "#84cc16", strokeWidth: 2 },
    },
    {
      id: "home-to-speech",
      source: "home",
      target: "speech-recognition",
      animated: true,
      style: { stroke: "#84cc16", strokeWidth: 2 },
    },
    {
      id: "document-to-computer",
      source: "document-processing",
      target: "computer-vision",
      animated: true,
      style: { stroke: "#84cc16", strokeWidth: 2 },
    },
    {
      id: "computer-to-speech",
      source: "computer-vision",
      target: "speech-recognition",
      animated: true,
      style: { stroke: "#84cc16", strokeWidth: 2 },
    },
    {
      id: "speech-to-document",
      source: "speech-recognition",
      target: "document-processing",
      animated: true,
      style: { stroke: "#84cc16", strokeWidth: 2 },
    },
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#84cc16", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  )

  return (
    <div className="w-full h-[calc(100vh-8rem)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
      >
        <Background color="#333" gap={16} />
        <Controls className="bg-gray-900 border-gray-800 text-white" />
        <MiniMap nodeColor="#84cc16" maskColor="rgba(0, 0, 0, 0.7)" className="bg-gray-900 border-gray-800" />
        <Panel position="top-left" className="bg-gray-900 p-4 rounded-md border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-2">Feature Flow</h2>
          <p className="text-gray-400 text-sm">Interactive map of available features. Click on a node to navigate.</p>
        </Panel>
      </ReactFlow>
    </div>
  )
}

