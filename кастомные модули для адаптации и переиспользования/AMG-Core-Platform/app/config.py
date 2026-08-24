"""Application configuration using pydantic-settings."""

import os
from typing import Optional
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    app_env: str = Field(default="dev", description="Application environment")
    host: str = Field(default="0.0.0.0", description="Host to bind to")
    port: int = Field(default=8000, description="Port to bind to")
    
    # Ollama
    ollama_host: str = Field(default="http://localhost:11434", description="Ollama server URL")
    ollama_model: str = Field(default="llama3.1", description="Default Ollama model")
    
    # Database - Primary connection string (takes precedence)
    pg_dsn: Optional[str] = Field(default=None, description="PostgreSQL connection string")
    
    # Database - Individual connection parameters (used if pg_dsn not set)
    pg_host: Optional[str] = Field(default=None, description="PostgreSQL host")
    pg_port: int = Field(default=5432, description="PostgreSQL port")
    pg_user: Optional[str] = Field(default=None, description="PostgreSQL user")
    pg_password: Optional[str] = Field(default=None, description="PostgreSQL password")
    pg_database: Optional[str] = Field(default=None, description="PostgreSQL database name")
    pg_ssl: str = Field(default="require", description="PostgreSQL SSL mode")
    
    # Database pool settings
    db_pool_size: int = Field(default=10, description="Database pool size")
    db_pool_timeout: int = Field(default=30, description="Database pool timeout")
    
    # CORS
    enable_cors: Optional[str] = Field(default=None, description="CORS origins")
    
    # Logging
    log_level: str = Field(default="INFO", description="Log level")
    request_id_header: str = Field(default="X-Request-ID", description="Request ID header name")
    
    @computed_field
    @property
    def database_url(self) -> str:
        """Get the final database URL, preferring pg_dsn over individual parameters."""
        if self.pg_dsn:
            return self.pg_dsn
        
        # Build DSN from individual parameters
        if not all([self.pg_host, self.pg_user, self.pg_database]):
            # Fallback to default local database
            return "postgresql+psycopg2://user:pass@db:5432/appdb"
        
        # Build connection string with SSL parameters
        ssl_params = f"sslmode={self.pg_ssl}&application_name=ollama-bp-api&connect_timeout=5"
        return f"postgresql+psycopg2://{self.pg_user}:{self.pg_password}@{self.pg_host}:{self.pg_port}/{self.pg_database}?{ssl_params}"
    
    class Config:
        env_file = [".env.customer", ".env"]  # Try customer env first, then default
        case_sensitive = False


settings = Settings()
