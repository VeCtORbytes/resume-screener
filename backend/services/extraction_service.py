from groq import Groq
from config.settings import settings
import json
import logging
from typing import Optional
from schemas.schemas import CandidateProfile, SkillExperience

logger = logging.getLogger(__name__)

class CandidateExtractor:
    """Extract structured candidate profile from resume text"""
    
    def __init__(self):
        self._client = None
        self.model = "llama-3.3-70b-versatile"
    
    @property
    def client(self) -> Groq:
        if self._client is None:
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client
    
    def extract(self, resume_text: str, filename: str = "Unknown") -> tuple[CandidateProfile, dict]:
        """
        Extract structured candidate profile from resume.
        
        Returns: (CandidateProfile, extraction_confidence_dict)
        """
        
        prompt = """Extract structured candidate profile from resume.

SCHEMA:
{
  "name": "string or null",
  "total_experience_years": integer or null,
  "skills": [
    {
      "name": "skill name",
      "proficiency_level": "beginner|intermediate|advanced|expert",
      "years_of_experience": float or null,
      "evidence": ["exact quote from resume"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "what was built",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": ["degree", "field"],
  "certifications": ["cert1"],
  "red_flags": ["any concerns"]
}

RULES:
1. Extract EVERY skill mentioned (explicit or implicit from projects)
2. Proficiency level: infer from context (years, achievements, project usage)
3. Evidence: Include EXACT resume quotes
4. Red flags: job hopping, skill gaps, inconsistencies
5. Be factual, never invent

Respond ONLY with valid JSON."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": f"RESUME:\n{resume_text}\n\n{prompt}"}
                ],
                temperature=0.1,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Clean markdown
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            data = json.loads(response_text)
            
            # Parse into CandidateProfile
            profile = CandidateProfile(
                name=data.get("name"),
                total_experience_years=data.get("total_experience_years"),
                skills=[
                    SkillExperience(**s) for s in data.get("skills", [])
                ],
                projects=data.get("projects", []),
                education=data.get("education", []),
                certifications=data.get("certifications", []),
                red_flags=data.get("red_flags", [])
            )
            
            # Confidence assessment
            confidence = {
                "score": 90,
                "label": "High",
                "reasons": []
            }
            
            if not profile.skills:
                confidence["score"] = 40
                confidence["label"] = "Low"
                confidence["reasons"].append("No skills extracted")
            elif len(profile.red_flags) > 2:
                confidence["score"] = 70
                confidence["label"] = "Medium"
                confidence["reasons"].append("Multiple red flags detected")
            
            logger.info(f"Extracted profile for {filename}: {len(profile.skills)} skills")
            return profile, confidence
        
        except Exception as e:
            logger.error(f"Extraction failed for {filename}: {str(e)}")
            return CandidateProfile(name="Unknown", total_experience_years=0, skills=[], projects=[], education=[], certifications=[], red_flags=[]), {"score": 0, "label": "Failed", "reasons": [str(e)]}


# Global instance
candidate_extractor = CandidateExtractor()