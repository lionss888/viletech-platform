"""Main FastAPI application - AI и аналитика только."""

import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.utils.logging import setup_logging, get_request_id, set_request_id
from app.utils.errors import APIError, handle_http_exception, handle_api_error
from app.api.v1.ai_only_routes import router as v1_router
from app.ollama_client import ollama_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    setup_logging()
    yield
    # Shutdown
    await ollama_client.close()


# Create FastAPI app
app = FastAPI(
    title="AMG Flow AI & Analytics API",
    description="AI обработка и аналитика для AMG Flow (без бизнес-логики)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.enable_cors.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Add request ID to all requests."""
    # Get or generate request ID
    request_id = request.headers.get(settings.request_id_header)
    if not request_id:
        request_id = str(uuid.uuid4())
    
    # Set in context
    set_request_id(request_id)
    
    # Add to request state
    request.state.request_id = request_id
    
    # Process request
    response = await call_next(request)
    
    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id
    
    return response


# Add error handlers
app.add_exception_handler(HTTPException, handle_http_exception)
app.add_exception_handler(APIError, handle_api_error)


# Include routers
app.include_router(v1_router, prefix="/v1")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AMG Flow AI & Analytics API",
        "description": "AI обработка и аналитика (без бизнес-логики)",
        "version": "1.0.0",
        "status": "running",
        "capabilities": [
            "AI Chat Processing",
            "RAG System", 
            "Smart Prompts",
            "Analytics Tracking",
            "Performance Monitoring"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.app_env == "dev"
    )
