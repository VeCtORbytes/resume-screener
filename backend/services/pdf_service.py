import io
import logging

logger = logging.getLogger(__name__)

class PDFExtractor:
    """Extract text from PDF files using pdfplumber with a robust pypdf fallback"""
    
    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        """
        Extract all text from a PDF file with strict cybersecurity validations.
        
        Args:
            file_bytes: PDF file contents as bytes
            filename: Original filename (for error messages)
        
        Returns:
            Extracted text as string
        """
        # 1. Enforce strict file size limits (5MB Max)
        max_bytes = 5 * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise ValueError(f"File '{filename}' exceeds the maximum allowed size of 5MB.")
            
        # 2. Enforce strict PDF signature magic bytes validation
        if not file_bytes.startswith(b"%PDF"):
            logger.warning(f"Security Alert: MIME spoofing attempt detected. File '{filename}' does not start with %PDF signature.")
            raise ValueError(f"File '{filename}' is corrupted or is not a valid PDF document.")

        extracted_text = ""
        
        # 3. Attempt high-fidelity pdfplumber parsing
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                # Check for password-protection/encryption
                if getattr(pdf, "is_encrypted", False):
                    raise ValueError(f"File '{filename}' is password-protected or encrypted. Please upload an unencrypted document.")
                
                # Check for huge page count abuse (Limit to max 25 pages per resume for sanity/DoS protection)
                if len(pdf.pages) > 25:
                    raise ValueError(f"File '{filename}' exceeds the maximum evaluation limit of 25 pages.")

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
            if "password-protected" in str(plumber_err).lower() or "encrypted" in str(plumber_err).lower():
                raise ValueError(f"File '{filename}' is password-protected. Please remove password protection.")
            logger.warning(f"pdfplumber extraction failed for {filename}, falling back to pypdf: {str(plumber_err)}")
            extracted_text = ""
            
        # 4. Fallback to standard pypdf if pdfplumber is empty or failed
        if not extracted_text:
            try:
                from pypdf import PdfReader
                pdf_reader = PdfReader(io.BytesIO(file_bytes))
                
                if pdf_reader.is_encrypted:
                    raise ValueError(f"File '{filename}' is password-protected or encrypted. Please remove password protection.")
                
                if len(pdf_reader.pages) > 25:
                    raise ValueError(f"File '{filename}' exceeds the maximum evaluation limit of 25 pages.")

                pages_text = []
                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    if text:
                        pages_text.append(f"\n--- Page {page_num + 1} ---\n{text}")
                
                extracted_text = "".join(pages_text).strip()
                if extracted_text:
                    logger.info(f"Successfully extracted text from {filename} using fallback pypdf")
            except Exception as pypdf_err:
                if "password" in str(pypdf_err).lower() or "encrypted" in str(pypdf_err).lower() or "decrypt" in str(pypdf_err).lower():
                    raise ValueError(f"File '{filename}' is password-protected or encrypted.")
                raise ValueError(f"Error extracting text from {filename}: {str(pypdf_err)}")
                
        if not extracted_text.strip():
            raise ValueError(f"No text content could be extracted from PDF: {filename}")
            
        return extracted_text.strip()

    @staticmethod
    def calculate_extraction_confidence(text: str, filename: str) -> dict:
        """
        Evaluate extracted text metrics to compute an objective extraction confidence level.
        """
        if not text:
            return {"score": 0, "label": "Low", "reasons": ["Empty document detected."]}
            
        score = 100
        reasons = []
        
        # 1. Page count vs character density check
        char_count = len(text)
        page_count = max(1, text.count("--- Page "))
        density = char_count / page_count
        
        if density < 150:
            score -= 35
            reasons.append("Extremely low text density (likely scanned image or low-quality OCR).")
        elif density < 400:
            score -= 15
            reasons.append("Low text density detected.")
            
        # 2. Section completeness check (Standard HR Sections)
        sections = {
            "experience": ["experience", "employment", "work history", "career", "history"],
            "education": ["education", "university", "college", "degree", "academic"],
            "skills": ["skills", "technologies", "languages", "tools", "competencies"]
        }
        
        text_lower = text.lower()
        for section_name, keywords in sections.items():
            if not any(keyword in text_lower for keyword in keywords):
                score -= 10
                reasons.append(f"Missing distinct '{section_name.title()}' section markers.")
                
        # 3. OCR conversion corruption patterns
        letters = sum(c.isalpha() for c in text)
        if char_count > 0:
            letter_ratio = letters / char_count
            if letter_ratio < 0.65:
                score -= 15
                reasons.append("High ratio of non-alphabet characters (possible OCR conversion corruption).")
                
        score = max(10, min(100, score))
        
        label = "High"
        if score < 50:
            label = "Low"
        elif score < 80:
            label = "Medium"
            
        return {
            "score": score,
            "label": label,
            "reasons": reasons
        }


# Create global instance
pdf_extractor = PDFExtractor()