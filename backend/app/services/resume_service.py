import PyPDF2
import re
import tempfile
from fastapi import UploadFile
import os
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

async def extract_resume_text(resume_file: UploadFile) -> str:
    """
    Extract text from a PDF resume.
    """
    # Check file size
    content = await resume_file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size: {MAX_FILE_SIZE/1024/1024}MB")
    
    # Save the uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file_path = temp_file.name
        temp_file.write(content)
    
    try:
        # Extract text from PDF
        text = ""
        with open(temp_file_path, 'rb') as file:
            try:
                pdf_reader = PyPDF2.PdfReader(file)
                logger.info(f"PDF has {len(pdf_reader.pages)} pages")
                
                for page_num in range(len(pdf_reader.pages)):
                    page_text = pdf_reader.pages[page_num].extract_text()
                    text += page_text + "\n"
                    logger.info(f"Extracted {len(page_text)} characters from page {page_num+1}")
                
                if not text.strip():
                    logger.warning("Extracted text is empty. The PDF might be scanned or have restricted permissions.")
                    # Try a different extraction approach for scanned PDFs - simplified for now
                    logger.info("PDF might contain images instead of text")
            except Exception as e:
                logger.error(f"Error extracting text from PDF: {str(e)}")
                raise ValueError(f"Could not read PDF file: {str(e)}")
        
        logger.info(f"Total extracted text length: {len(text)}")
        return text
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
            logger.debug(f"Temporary file removed: {temp_file_path}")

def remove_personal_info(text: str) -> str:
    """
    Remove personal identifiable information (PII) from resume text.
    """
    # Patterns for common PII
    patterns = [
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
        r'\b(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b',  # Phone number
        r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',  # SSN
        r'\b\d{1,5}\s[A-Z][a-z]+(\s[A-Z][a-z]+)*\s(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b',  # Address
    ]
    
    # Replace matches with placeholder
    cleaned_text = text
    for pattern in patterns:
        cleaned_text = re.sub(pattern, '[REDACTED]', cleaned_text)
    
    # Log number of redactions
    original_length = len(text)
    cleaned_length = len(cleaned_text)
    if original_length != cleaned_length:
        logger.info(f"Removed personal information. Character difference: {abs(original_length - cleaned_length)}")
    
    return cleaned_text