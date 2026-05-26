from pypdf import PdfReader
import io

class PDFExtractor:
    """Extract text from PDF files"""
    
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
        try:
            # Create PDF reader from bytes
            pdf_reader = PdfReader(io.BytesIO(file_bytes))
            
            # Extract text from all pages
            extracted_text = ""
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text:
                    extracted_text += f"\n--- Page {page_num + 1} ---\n{text}"
            
            if not extracted_text.strip():
                raise ValueError("No text found in PDF")
            
            return extracted_text.strip()
        
        except Exception as e:
            raise ValueError(f"Error extracting text from {filename}: {str(e)}")


# Create global instance
pdf_extractor = PDFExtractor()