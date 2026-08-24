"""VILI Configuration"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "VILI Payment Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
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
    LITELLM_API_KEY: str = os.getenv(
        "LITELLM_API_KEY",
        "sk-vili-2024"
    )
    
    # Ollama (через Nginx LB)
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
        "your-secret-key-change-in-production-use-openssl-rand-hex-32"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # API Keys (optional for cloud services)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    
    # Embedding settings
    EMBEDDING_MODEL: str = "local-embedding"  # Используем через LiteLLM
    EMBEDDING_DIMENSION: int = 768  # Размер для nomic-embed-text
    
    # RAG settings
    RAG_TOP_K: int = 5
    RAG_MIN_SIMILARITY: float = 0.7
    
    # File upload settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".xml", ".json", ".txt", ".csv", ".doc", ".docx"]
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # fea-stage Integration
    FEA_STAGE_API_URL: str = os.getenv("FEA_STAGE_API_URL", "")
    FEA_STAGE_API_KEY: str = os.getenv("FEA_STAGE_API_KEY", "")
    FEA_STAGE_TIMEOUT: int = int(os.getenv("FEA_STAGE_TIMEOUT", "30"))
    # fea-stage Auth (для динамического получения токена)
    FEA_STAGE_EMAIL: str = os.getenv("FEA_STAGE_EMAIL", "admin@vili.local")
    FEA_STAGE_PASSWORD: str = os.getenv("FEA_STAGE_PASSWORD", "")
    
    # Intent Pattern Optimization
    INTENT_AUTO_OPTIMIZATION_ENABLED: bool = os.getenv("INTENT_AUTO_OPTIMIZATION_ENABLED", "true").lower() == "true"
    INTENT_ANALYSIS_PERIOD_HOURS: int = int(os.getenv("INTENT_ANALYSIS_PERIOD_HOURS", "24"))
    INTENT_MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("INTENT_MIN_CONFIDENCE_THRESHOLD", "0.7"))
    INTENT_AUTO_APPLY_THRESHOLD: float = float(os.getenv("INTENT_AUTO_APPLY_THRESHOLD", "0.85"))
    INTENT_LLM_MODEL: str = os.getenv("INTENT_LLM_MODEL", "local-llama")
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
