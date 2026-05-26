import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """App configuration from environment variables"""
    
    # Groq API
    GROQ_API_KEY: str
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    DATABASE_URL: str
    
    # App
    DEBUG: bool = False
    API_URL: str = "http://localhost:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()