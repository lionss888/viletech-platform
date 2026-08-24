"""VILI Configuration"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "VILI Payment Assistant"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://vili:vili_password@postgres:5432/vili"
    )
    
    # Redis
    REDIS_URL: str = os.getenv(
        "REDIS_URL",
        "redis://redis:6379/0"
    )
    
    # RabbitMQ
    RABBITMQ_URL: str = os.getenv(
        "RABBITMQ_URL",
        "amqp://vili:vili_password@rabbitmq:5672//"
    )
    
    # LiteLLM
    LITELLM_URL: str = os.getenv(
        "LITELLM_URL",
        "http://litellm:4000"
    )
    
    # Ollama
    OLLAMA_URL: str = os.getenv(
        "OLLAMA_URL",
        "http://nginx:11434"
    )
    
    # TGI (FinGPT)
    TGI_URL: str = os.getenv(
        "TGI_URL",
        "http://tgi-fingpt:80"
    )
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
    ]
    
    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-in-production"
    )
    
    # API Keys (опционально для облачных сервисов)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
