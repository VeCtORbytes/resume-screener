from groq import Groq
from config.settings import settings
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class GroqScreener:
    """Handle resume screening via Groq API"""
    
    def __init__(self):
        self._client = None
        self.model = "llama-3.3-70b-versatile"  # Fast, free Groq model
        
    @property
    def client(self) -> Groq:
        """Lazy initialize the Groq client on demand to avoid import-time side-effects"""
        if self._client is None:
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client
    
    def screen_resume(self, resume_text: str, job_description: str) -> dict:
        """
        Score a single resume against job description.
        
        Returns: {"score": 85, "reasoning": "..."}
        """
        
        prompt = f"""You are an expert recruiter. Analyze this resume against the job description and provide:
1. A match score from 0-100
2. A 2-3 line reasoning for the score

Format your response as JSON with keys: "score" (integer) and "reasoning" (string).

JOB DESCRIPTION:
{job_description}

RESUME:
{resume_text}

Respond ONLY with valid JSON, no markdown or extra text."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Lower = more consistent, less creative
                max_tokens=200
            )
            
            # Extract response text
            response_text = response.choices[0].message.content.strip()
            
            # Sanitize malformed JSON fenced responses from LLM markdown blocks
            cleaned_text = response_text
            if "```" in cleaned_text:
                if "```json" in cleaned_text:
                    start_idx = cleaned_text.find("```json") + 7
                else:
                    start_idx = cleaned_text.find("```") + 3
                end_idx = cleaned_text.find("```", start_idx)
                if end_idx != -1:
                    cleaned_text = cleaned_text[start_idx:end_idx].strip()
                else:
                    cleaned_text = cleaned_text[start_idx:].strip()
            
            # Parse JSON response
            result = json.loads(cleaned_text)
            
            # Validate response
            score = int(result.get("score", 0))
            score = max(0, min(100, score))  # Clamp between 0-100
            reasoning = str(result.get("reasoning", "Unable to provide reasoning"))
            
            return {
                "score": score,
                "reasoning": reasoning
            }
        
        except json.JSONDecodeError:
            logger.error(f"Failed to parse Groq response: {response_text}")
            return {
                "score": 0,
                "reasoning": "Failed to parse the screening evaluation from the AI model."
            }
        
        except Exception as e:
            logger.exception("Groq API error occurred")
            return {
                "score": 0,
                "reasoning": "An unexpected error occurred during resume screening. Please try again later."
            }
    
    async def screen_resumes_parallel(self, resumes: list[dict], job_description: str) -> list[dict]:
        """
        Screen multiple resumes in parallel.
        
        Args:
            resumes: List of {"text": "...", "filename": "..."}
            job_description: Job posting text
        
        Returns: List of {"score": 85, "reasoning": "...", "filename": "..."}
        """
        
        # Create tasks for all resumes (parallel execution)
        tasks = []
        for resume in resumes:
            task = asyncio.create_task(
                self._screen_resume_async(resume["text"], job_description, resume["filename"])
            )
            tasks.append(task)
        
        # Wait for all to complete
        results = await asyncio.gather(*tasks)
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return results
    
    async def _screen_resume_async(self, resume_text: str, job_description: str, filename: str) -> dict:
        """Wrapper for async execution"""
        # Run blocking Groq call in thread pool (doesn't block event loop)
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            self.screen_resume,
            resume_text,
            job_description
        )
        result["filename"] = filename
        return result


# Create global instance
groq_screener = GroqScreener()