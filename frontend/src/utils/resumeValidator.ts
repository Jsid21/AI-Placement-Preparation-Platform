export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export async function validateResume(file: File): Promise<ValidationResult> {
  // Check file size (minimum 1KB, maximum 5MB)
  const minSize = 1024; // 1KB
  const maxSize = 15 * 1024 * 1024; // 5MB
  
  if (file.size < minSize) {
    return {
      isValid: false,
      error: "The uploaded file appears to be empty. Please upload a valid resume."
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File size too large. Maximum size is 5MB."
    };
  }

  // Check if it's a PDF
  if (file.type !== "application/pdf") {
    return {
      isValid: false,
      error: "Only PDF files are accepted."
    };
  }

  try {
    // First check: Verify PDF header
    const firstBytes = await readFileHeader(file, 5);
    const header = new Uint8Array(firstBytes);
    const pdfHeader = '%PDF-';
    
    const isPDF = header.every((byte, i) => byte === pdfHeader.charCodeAt(i));
    if (!isPDF) {
      return {
        isValid: false,
        error: "Invalid PDF file. Please upload a valid PDF resume."
      };
    }

    // Second check: Read file content to verify it's not empty
    const text = await readFileContent(file);
    if (!text || text.trim().length < 100) { // Minimum 100 characters
      return {
        isValid: false,
        error: "The PDF appears to be empty or contains too little content. Please upload a valid resume."
      };
    }

    // Third check: Look for common resume keywords
    const resumeKeywords = ['experience', 'education', 'skills', 'work', 'project'];
    const hasResumeContent = resumeKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );
    
    if (!hasResumeContent) {
      return {
        isValid: false,
        error: "The uploaded file doesn't appear to be a resume. Please upload a valid resume."
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: "Error validating file. Please try again."
    };
  }
}

async function readFileHeader(file: File, bytes: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}