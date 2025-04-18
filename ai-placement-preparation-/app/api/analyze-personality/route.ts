import { NextRequest } from 'next/server';

const BACKEND_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const response = await fetch(`${BACKEND_URL}/analyze-personality/`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { detail: errorData.detail || 'Error from backend service' }, 
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error connecting to backend:', error);
    return Response.json(
      { detail: 'Failed to connect to backend service' },
      { status: 500 }
    );
  }
}