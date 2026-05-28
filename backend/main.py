import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Safe startup diagnostics
print("=== STARTUP DEBUG ===")
print("DATABASE_URL exists:", bool(os.getenv("DATABASE_URL")))
print("GROQ_API_KEY exists:", bool(os.getenv("GROQ_API_KEY")))
print("FRONTEND_URL exists:", bool(os.getenv("FRONTEND_URL")))
print("=====================")

# Local imports
from config.settings import settings
from routes.screening import router as screening_router

# Initialize FastAPI app
app = FastAPI(
    title="Resume Screener API",
    description="AI-powered resume screening with Groq",
    version="1.0.0"
)

# Environment-aware frontend URL
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe startup hook
@app.on_event("startup")
async def startup_event():
    try:
        print("Starting Resume Screener API...")
        print("Application startup completed successfully.")

    except Exception as e:
        print("STARTUP ERROR:", str(e))

        import traceback
        traceback.print_exc()

        raise e

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "resume-screener-api"
    }

# Register routes
app.include_router(screening_router)

# Local development & production entry point
if __name__ == "__main__":
    import uvicorn

    # Render sets the PORT environment variable dynamically
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )