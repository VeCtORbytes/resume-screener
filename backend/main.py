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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
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
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=settings.DEBUG)