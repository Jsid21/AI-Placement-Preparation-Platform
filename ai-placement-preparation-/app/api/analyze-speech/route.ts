import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio_file') as File;
    
    // Log file information for debugging
    console.log(`Analyze Speech - File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
    
    // Create a new form to send to the backend
    const backendForm = new FormData();
    backendForm.append('audio_file', file);
    
    // Send request to backend
    const response = await fetch(`${BACKEND_URL}/analyze-speech/`, {
      method: 'POST',
      body: backendForm,
    });
    
    // Get response as text first to debug any issues
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      
      // If there was an error, return it with the appropriate status code
      if (!response.ok) {
        return Response.json(
          { detail: data.detail || 'Error from backend service' },
          { status: response.status }
        );
      }
      
      // Return the successful response
      return Response.json(data);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      return Response.json(
        { detail: 'Invalid response from backend' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in analyze-speech API route:', error);
    return Response.json(
      { detail: 'Failed to process request' },
      { status: 500 }
    );
  }
}