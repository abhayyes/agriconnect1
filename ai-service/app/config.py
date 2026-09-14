import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: Optional[str] = "postgresql://postgres:abhayyess@localhost:3006/agriconnect"
    MAPS_API_KEY: Optional[str] = None
    AI_SERVICE_URL: Optional[str] = "http://localhost:8000"

    # Groq (free) LLM for the Kisan Assistant chatbot.
    # Create a free key at https://console.groq.com and paste it into .env
    GROQ_API_KEY: Optional[str] = None
    LLM_MODEL: str = "openai/gpt-oss-20b"
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
