from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "StealthPilot API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./stealthpilot.db"
    
    SECRET_KEY: str = "stealthpilot-secret-key-change-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"]
    
    ADMIN_EMAIL: str = "admin@stealthpilot.ai"
    ADMIN_PASSWORD: str = "admin123"
    
    ANTHROPIC_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    AI_PROVIDER: str = "gemini"  # gemini, groq, anthropic, or openai
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
