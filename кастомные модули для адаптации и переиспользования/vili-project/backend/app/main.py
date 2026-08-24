"""VILI Payment Assistant - Main FastAPI Application"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.core.config import settings
from app.core.middleware import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    RequestIDMiddleware,
)
from app.core.exceptions import VILIException
from app.api.v1 import documents, compliance, risk, feedback, knowledge_sources, health, chat, operators, intent_patterns

# Создаем FastAPI приложение
app = FastAPI(
    title="VILI Payment Assistant API",
    description="AI-powered payment document processing and compliance checking",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Монтируем статические файлы для админ-панели и чата
static_path = Path(__file__).parent / "static"
if static_path.exists():
    # Монтируем общие статические файлы (css, js)
    if (static_path / "css").exists():
        app.mount("/static/css", StaticFiles(directory=str(static_path / "css")), name="static-css")
    if (static_path / "js").exists():
        app.mount("/static/js", StaticFiles(directory=str(static_path / "js")), name="static-js")
    # Монтируем админ-панель, чат и операторов
    app.mount("/admin", StaticFiles(directory=str(static_path / "admin"), html=True), name="admin")
    app.mount("/chat", StaticFiles(directory=str(static_path / "chat"), html=True), name="chat")
    if (static_path / "operators").exists():
        app.mount("/operators", StaticFiles(directory=str(static_path / "operators"), html=True), name="operators")

# ============================================
# Middleware (order matters - last added = first executed)
# ============================================

# CORS middleware (must be first for preflight requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting middleware (отключено при тестировании)
if not os.getenv("TESTING"):
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=60,
        requests_per_hour=1000,
        exclude_paths=["/api/v1/health", "/api/docs", "/api/redoc", "/openapi.json"]
    )

# Request ID middleware for tracing
app.add_middleware(RequestIDMiddleware)


# ============================================
# Exception Handlers
# ============================================

@app.exception_handler(VILIException)
async def vili_exception_handler(request: Request, exc: VILIException):
    """Handle custom VILI exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )

# Подключаем роутеры
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["compliance"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["risk"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["feedback"])
app.include_router(knowledge_sources.router, prefix="/api/v1/knowledge-sources", tags=["knowledge-sources"])
app.include_router(operators.router, prefix="/api/v1/operators", tags=["operators"])
app.include_router(intent_patterns.router, prefix="/api/v1/intent-patterns", tags=["intent-patterns"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "VILI Payment Assistant API",
        "version": "0.1.0",
        "status": "operational",
        "docs": "/api/docs",
    }


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "services": {
            "database": "connected",
            "redis": "connected",
            "litellm": "connected",
        }
    }


@app.get("/api/v1/stats")
async def get_stats():
    """Get system statistics"""
    # TODO: Implement real statistics from database
    return {
        "total_documents": 0,
        "completed_documents": 0,
        "pending_documents": 0,
        "compliance_checks": 0,
        "risk_assessments": 0,
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
