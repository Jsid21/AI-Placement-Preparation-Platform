import { NextRequest } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  try {
    const response = await fetch(`${BACKEND_URL}/analyze-answer/`, {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    return Response.json(data, {
      status: response.status,
    })
  } catch (error) {
    return Response.json(
      { detail: 'Failed to connect to backend service' },
      { status: 500 }
    )
  }
}