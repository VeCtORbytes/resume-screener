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
        Score a single resume against job description using a deterministic rubric.
        
        Returns: {"score": 85, "reasoning": "..."}
        """
        
        system_prompt = """You are an advanced, objective, and data-driven recruiting AI system designed to screen candidate resumes against a job description. 
Your goal is to perform a strict, factual, and standardized evaluation of the candidate's fit based ONLY on the provided resume content.
Do NOT reward formatting, length, wordiness, or self-promotional language. Focus strictly on verifiable evidence in the resume text.

Evaluate the candidate's resume using the following strictly mathematical scoring rubric (Total 100 points):

1. Skills Match (Weight: 40% - Max 40 points)
   Assess how closely the technical stack and soft skills match the requirements.
   - Exact or strong match of primary required technologies: 30-40 points
   - Partial match of technologies, or missing key stack requirements: 15-29 points
   - Minimal or no relevant skills: 0-14 points

2. Experience Relevance (Weight: 25% - Max 25 points)
   Evaluate actual professional roles, job titles, and duties compared to the role seniority and expectations in the job description.
   Normalize seniority fairly: if a junior role is requested, assess suitability for a junior level; if a senior role is requested, check for leadership.
   - Highly aligned roles, correct seniority, relevant tasks: 20-25 points
   - Moderately aligned roles, slightly mismatched seniority or responsibilities: 10-19 points
   - Unrelated work history or highly mismatched seniority: 0-9 points

3. Project Relevance (Weight: 20% - Max 20 points)
   Evaluate listed personal/professional projects or case studies mentioned in the resume.
   - Projects show direct practical application of the required stack: 15-20 points
   - Projects are generic, or only partially apply required stack: 8-14 points
   - No projects mentioned or completely irrelevant topics: 0-7 points

4. Education & Certifications (Weight: 10% - Max 10 points)
   Verify standard degrees (BS, MS, PhD) or highly specific professional certifications (AWS, Kubernetes, Cisco, etc.).
   - Meets or exceeds required degree/certs: 8-10 points
   - Partially meets requirements, or degree in a related technical field: 5-7 points
   - Does not meet education/certification guidelines: 0-4 points

5. Domain & Keyword Fit (Weight: 5% - Max 5 points)
   Familiarity with industry domain concepts, terminology, methodologies (SaaS, FinTech, DevOps, Agile, etc.).
   - High domain alignment and keyword usage: 4-5 points
   - Moderate domain familiarity: 2-3 points
   - No domain context: 0-1 points

Ensure your scores are strictly factual and sum up mathematically to the final overall "score".

You MUST return your response as a valid, single JSON object with no markdown fences, no leading/trailing conversational filler, and no notes. Use the following exact JSON schema:
{
  "score": <integer, sum of the breakdown points>,
  "breakdown": {
    "skills_match": <integer, 0 to 40>,
    "experience_relevance": <integer, 0 to 25>,
    "project_relevance": <integer, 0 to 20>,
    "education": <integer, 0 to 10>,
    "domain_fit": <integer, 0 to 5>
  },
  "strengths": [<list of strings, 2-3 specific factual strengths based strictly on resume content>],
  "gaps": [<list of strings, 2-3 factual missing requirements or gaps relative to the job description>],
  "recommendation": "<'Excellent Match' (score >= 80) | 'Strong Match' (score 60-79) | 'Moderate Match' (score 40-59) | 'Weak Match' (score < 40)>"
}"""

        user_prompt = f"""JOB DESCRIPTION:
{job_description}

RESUME:
{resume_text}

Respond ONLY with the requested JSON object."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                temperature=0.1,  # Highly deterministic scoring
                max_tokens=800,   # Sufficient space for detailed JSON breakdown
                response_format={"type": "json_object"}  # Restrict to strictly valid JSON object
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
            
            # Extract and validate score
            score = int(result.get("score", 0))
            score = max(0, min(100, score))  # Clamp between 0-100
            
            # Extract breakdown details
            breakdown = result.get("breakdown", {})
            strengths = result.get("strengths", [])
            gaps = result.get("gaps", [])
            recommendation = result.get("recommendation", "Moderate Match")
            
            # Format structured summary report to render beautifully in reasoning column
            breakdown_str = (
                f"Recommendation: {recommendation}\n\n"
                f"📊 Breakdown:\n"
                f"• Skills Match: {breakdown.get('skills_match', 0)}/40\n"
                f"• Experience Relevance: {breakdown.get('experience_relevance', 0)}/25\n"
                f"• Project Relevance: {breakdown.get('project_relevance', 0)}/20\n"
                f"• Education/Certifications: {breakdown.get('education', 0)}/10\n"
                f"• Domain/Keyword Fit: {breakdown.get('domain_fit', 0)}/5\n\n"
            )
            
            strengths_str = "✅ Strengths:\n" + "\n".join([f"• {s}" for s in strengths]) if strengths else "✅ Strengths:\n• General stack alignment."
            gaps_str = "⚠️ Gaps:\n" + "\n".join([f"• {g}" for g in gaps]) if gaps else "⚠️ Gaps:\n• No critical gaps identified."
            
            reasoning_summary = f"{breakdown_str}{strengths_str}\n\n{gaps_str}"
            
            return {
                "score": score,
                "reasoning": reasoning_summary
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

    def generate_interview_questions(self, resume_text: str, job_description: str, screening_context: str) -> dict:
        """
        Generate tailored technical, project deep-dive, behavioral, and risk-probing questions on-demand.
        
        Returns: {"technical": [...], "project_deep_dive": [...], "behavioral": [...], "risk_probing": [...]}
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an elite, highly experienced technical recruiter and interviewing coordinator.
Your objective is to generate tailored, highly specific, and diagnostic interview questions for a candidate based on:
1. The candidate's extracted RESUME text.
2. The target JOB DESCRIPTION requirements.
3. The AI SCREENING EVALUATION context (which details strengths, score, and gaps).

You must generate exactly 5 deep, highly relevant questions for each of the following four categories:
1. "technical": Questions probing their listed technologies, frameworks, and architectural choices.
2. "project_deep_dive": Specific questions digging into their named portfolio projects, responsibilities, or company impact achievements listed on their resume.
3. "behavioral": Questions testing soft skills, culture fit, leadership, teamwork, or conflict resolution tailored to their career stage.
4. "risk_probing": Questions specifically targeting gaps, missing skills, technology switches, short tenures, or areas where they might lack experience relative to the job requirements.

You MUST return your response as a valid, single JSON object with no markdown fences, no conversational filler, and no notes. Use the following exact JSON schema:
{
  "technical": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "project_deep_dive": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "behavioral": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "risk_probing": ["question 1", "question 2", "question 3", "question 4", "question 5"]
}"""
                    },
                    {
                        "role": "user",
                        "content": f"""JOB DESCRIPTION:
{job_description}

CANDIDATE EVALUATION CONTEXT:
{screening_context}

CANDIDATE RESUME TEXT:
{resume_text}

Respond ONLY with the requested JSON object containing tailored questions."""
                    }
                ],
                temperature=0.3,
                max_tokens=1000,
                response_format={"type": "json_object"},
                timeout=30.0
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Clean markdown JSON block wrappers if present
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
                    
            return json.loads(cleaned_text)
            
        except Exception as e:
            logger.exception("Error during interview question generation")
            return {
                "technical": [
                    "Can you explain the architecture of a recent key system you designed using Python/SQL?",
                    "How do you approach database schema migrations and concurrency challenges in technical stacks?",
                    "How do you handle connection pooling, query optimization, and memory limits in backend frameworks?",
                    "Can you detail your experience deploying containerized REST APIs in modern cloud environments?",
                    "What strategies do you adopt for handling complex asynchronous workloads or thread pools in production?"
                ],
                "project_deep_dive": [
                    "Could you walk us through the most technically challenging project listed on your resume?",
                    "What were the core scale or latency challenges you hit in that specific project, and how did you resolve them?",
                    "How did you validate the business impact or performance metrics of your completed system?",
                    "What architectural trade-offs did you make during the design phase of your portfolio projects?",
                    "If you had to rebuild your primary work system from scratch today, what would you design differently?"
                ],
                "behavioral": [
                    "Tell us about a technical disagreement with a colleague. How was it resolved?",
                    "How do you prioritize codebase quality over strict shipping speed constraints under pressure?",
                    "Describe a situation where a production system broke. What actions did you take, and what were the key learnings?",
                    "How do you mentor junior developers or communicate technical tradeoffs to non-technical stakeholders?",
                    "What practices do you follow to stay updated with modern architectural patterns and design standards?"
                ],
                "risk_probing": [
                    "How do you plan to quickly gain production-level fluency with advanced LLM integration paradigms?",
                    "Are there specific stack items in our description that you haven't operated extensively in production settings?",
                    "We noticed certain technology changes in your career history. What motivated those switches?",
                    "How do you ensure rapid onboarding when joining a team with a highly complex codebase?",
                    "What strategies do you use to overcome gaps in understanding legacy components or undocumented systems?"
                ]
            }


# Create global instance
groq_screener = GroqScreener()