from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from services.db_connection import init_db
from routes.screening import router as screening_router

# Initialize FastAPI app
app = FastAPI(
    title="Resume Screener API",
    description="AI-powered resume screening with Groq",
    version="1.0.0"
)

# Configure CORS (allow frontend to call backend)
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

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

# Initialize database tables
@app.on_event("startup")
def startup_event():
    """Run on app startup"""
    print("Initializing database...")
    init_db()
    print("Database ready!")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "resume-screener-api"}

# Include screening routes
app.include_router(screening_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)