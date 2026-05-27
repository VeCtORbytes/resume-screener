import io
import logging

logger = logging.getLogger(__name__)

class PDFExtractor:
    """Extract text from PDF files using pdfplumber with a robust pypdf fallback"""
    
    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        """
        Extract all text from a PDF file.
        
        Args:
            file_bytes: PDF file contents as bytes
            filename: Original filename (for error messages)
        
        Returns:
            Extracted text as string
        """
        extracted_text = ""
        
        # 1. Attempt high-fidelity pdfplumber parsing
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_text = []
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text(layout=True)  # layout=True preserves whitespace alignment nicely
                    if not text:
                        text = page.extract_text()  # Fallback to standard
                    if text:
                        pages_text.append(f"\n--- Page {page_num + 1} ---\n{text}")
                
                extracted_text = "".join(pages_text).strip()
                if extracted_text:
                    logger.info(f"Successfully extracted text from {filename} using pdfplumber")
                    
        except Exception as plumber_err:
            logger.warning(f"pdfplumber extraction failed for {filename}, falling back to pypdf: {str(plumber_err)}")
            extracted_text = ""
            
        # 2. Fallback to standard pypdf if pdfplumber is empty or failed
        if not extracted_text:
            try:
                from pypdf import PdfReader
                pdf_reader = PdfReader(io.BytesIO(file_bytes))
                
                pages_text = []
                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    if text:
                        pages_text.append(f"\n--- Page {page_num + 1} ---\n{text}")
                
                extracted_text = "".join(pages_text).strip()
                if extracted_text:
                    logger.info(f"Successfully extracted text from {filename} using fallback pypdf")
            except Exception as pypdf_err:
                raise ValueError(f"Error extracting text from {filename}: {str(pypdf_err)}")
                
        if not extracted_text.strip():
            raise ValueError(f"No text found in PDF: {filename}")
            
        return extracted_text.strip()


# Create global instance
pdf_extractor = PDFExtractor()