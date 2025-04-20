import { NextRequest } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const response = await fetch(`${BACKEND_URL}/generate-questions/`, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    return Response.json(data)
  } catch (error) {
    return Response.json(
      { detail: 'Failed to connect to backend service' },
      { status: 500 }
    )
  }
}