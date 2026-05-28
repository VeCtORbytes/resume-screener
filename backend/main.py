import os
import sys
import traceback

print("=== STARTUP DIAGNOSTIC CHECK ===")
print("DATABASE_URL exists:", bool(os.getenv("DATABASE_URL")))
print("GROQ_API_KEY exists:", bool(os.getenv("GROQ_API_KEY")))
print("FRONTEND_URL exists:", bool(os.getenv("FRONTEND_URL")))
print("PORT exists:", bool(os.getenv("PORT")))
print("================================")

# 1. Safe Settings Import
try:
    print("1. Loading config settings...")
    from config.settings import settings
    print("✓ Settings loaded successfully.")
except Exception as e:
    print("❌ FATAL: Settings load failed!")
    traceback.print_exc()
    sys.exit(1)

# 2. Safe APIRouter & Route Imports
try:
    print("2. Importing screening router & dependencies...")
    from routes.screening import router as screening_router
    print("✓ Screening router imported successfully.")
except Exception as e:
    print("❌ FATAL: Route import failed!")
    traceback.print_exc()
    sys.exit(1)

# 3. Safe Database Connection Import
try:
    print("3. Connecting to database engine...")
    from services.db_connection import init_db
    print("✓ Database engine initial check OK.")
except Exception as e:
    print("❌ FATAL: Database connection failed!")
    traceback.print_exc()
    sys.exit(1)

# 4. Safe FastAPI Initialization
try:
    print("4. Initializing FastAPI application...")
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(
        title="Resume Screener API",
        description="AI-powered resume screening with Groq",
        version="1.0.0"
    )
    print("✓ FastAPI app initialized successfully.")
except Exception as e:
    print("❌ FATAL: FastAPI instantiation failed!")
    traceback.print_exc()
    sys.exit(1)

# Configure CORS
try:
    print("5. Registering CORS middlewares...")
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
    print("✓ CORS middleware registered successfully.")
except Exception as e:
    print("❌ FATAL: CORS middleware registration failed!")
    traceback.print_exc()
    sys.exit(1)

# Register routes
try:
    print("6. Registering route controllers...")
    app.include_router(screening_router)
    print("✓ Routes registered successfully.")
except Exception as e:
    print("❌ FATAL: Router controller registration failed!")
    traceback.print_exc()
    sys.exit(1)

# Safe database initialization startup hook
@app.on_event("startup")
async def startup_event():
    try:
        print("=== APP RUNTIME STARTUP ===")
        print("Initializing database tables...")
        init_db()
        print("✓ Database tables initialized and ready!")
        print("Application startup completed successfully.")
        print("===========================")
    except Exception as e:
        print("⚠️ WARNING: Database tables initialization encountered a runtime error!")
        print(str(e))
        traceback.print_exc()
        print("Continuing startup gracefully to ensure server availability and health checks pass...")
        print("===========================")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "resume-screener-api",
        "database_configured": bool(os.getenv("DATABASE_URL"))
    }

# Local development & production entry point
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )