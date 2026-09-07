import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: Optional[str] = "postgresql://postgres:abhayyess@localhost:3006/agriconnect"
    MAPS_API_KEY: Optional[str] = None
    AI_SERVICE_URL: Optional[str] = "http://localhost:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
