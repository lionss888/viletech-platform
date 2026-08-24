"""Security and utility middleware for VILI API"""

import time
import hashlib
from typing import Callable, Dict, Optional
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


# ============================================
# Rate Limiting Middleware
# ============================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.
    
    Limits requests per IP address within a time window.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
        exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.exclude_paths = exclude_paths or ["/api/v1/health", "/api/docs", "/api/redoc"]
        
        # In-memory storage (use Redis in production for distributed systems)
        self.minute_requests: Dict[str, list] = defaultdict(list)
        self.hour_requests: Dict[str, list] = defaultdict(list)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _clean_old_requests(self, requests: list, window_seconds: int) -> list:
        """Remove requests older than the time window"""
        cutoff = time.time() - window_seconds
        return [r for r in requests if r > cutoff]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Clean old requests and check limits
        self.minute_requests[client_ip] = self._clean_old_requests(
            self.minute_requests[client_ip], 60
        )
        self.hour_requests[client_ip] = self._clean_old_requests(
            self.hour_requests[client_ip], 3600
        )
        
        # Check minute limit
        if len(self.minute_requests[client_ip]) >= self.requests_per_minute:
            logger.warning(
                f"Rate limit exceeded (minute) for IP: {client_ip}",
                extra={"client_ip": client_ip, "limit": "minute"}
            )
            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=429,
                headers={
                    "Content-Type": "application/json",
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time) + 60)
                }
            )
        
        # Check hour limit
        if len(self.hour_requests[client_ip]) >= self.requests_per_hour:
            logger.warning(
                f"Rate limit exceeded (hour) for IP: {client_ip}",
                extra={"client_ip": client_ip, "limit": "hour"}
            )
            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=429,
                headers={
                    "Content-Type": "application/json",
                    "Retry-After": "3600",
                    "X-RateLimit-Limit": str(self.requests_per_hour),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time) + 3600)
                }
            )
        
        # Record request
        self.minute_requests[client_ip].append(current_time)
        self.hour_requests[client_ip].append(current_time)
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(self.minute_requests[client_ip])
        )
        response.headers["X-RateLimit-Reset"] = str(int(current_time) + 60)
        
        return response


# ============================================
# Security Headers Middleware
# ============================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    
    Implements OWASP security best practices.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Убеждаемся, что статические файлы имеют правильный Content-Type
        path = request.url.path
        if path.endswith(".js"):
            if "application/javascript" not in response.headers.get("Content-Type", ""):
                response.headers["Content-Type"] = "application/javascript; charset=utf-8"
        elif path.endswith(".css"):
            if "text/css" not in response.headers.get("Content-Type", ""):
                response.headers["Content-Type"] = "text/css; charset=utf-8"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://fonts.gstatic.com; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing (только если Content-Type правильно установлен)
        # Для статических файлов это безопасно, так как мы явно устанавливаем Content-Type
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS Protection (legacy but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature Policy)
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), "
            "camera=(), "
            "geolocation=(), "
            "gyroscope=(), "
            "magnetometer=(), "
            "microphone=(), "
            "payment=(), "
            "usb=()"
        )
        
        # HSTS (only in production with HTTPS)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # Cache Control for API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
        
        return response


# ============================================
# Request ID Middleware
# ============================================

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add unique request ID for tracing.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            import uuid
            request_id = str(uuid.uuid4())
        
        # Store in request state for logging
        request.state.request_id = request_id
        
        # Add timing
        start_time = time.time()
        
        response = await call_next(request)
        
        # Add headers
        process_time = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        
        # Log request
        logger.info(
            f"{request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
                "client_ip": request.client.host if request.client else "unknown"
            }
        )
        
        return response


# ============================================
# API Key Authentication Middleware
# ============================================

class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware for API key authentication.
    
    Checks for valid API key in header or query parameter.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        api_key_header: str = "X-API-Key",
        exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.api_key_header = api_key_header
        self.exclude_paths = exclude_paths or [
            "/api/v1/health",
            "/api/docs",
            "/api/redoc",
            "/openapi.json",
            "/"
        ]
        
        # Load valid API keys (in production, load from secure storage)
        self.valid_api_keys = self._load_api_keys()
    
    def _load_api_keys(self) -> set:
        """Load valid API keys from configuration"""
        keys = set()
        
        # Add configured API key
        if hasattr(settings, 'API_KEY') and settings.API_KEY:
            keys.add(settings.API_KEY)
        
        # Add admin API key
        if hasattr(settings, 'ADMIN_API_KEY') and settings.ADMIN_API_KEY:
            keys.add(settings.ADMIN_API_KEY)
        
        return keys
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip authentication for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Skip if no API keys configured (development mode)
        if not self.valid_api_keys:
            return await call_next(request)
        
        # Check header
        api_key = request.headers.get(self.api_key_header)
        
        # Check query parameter as fallback
        if not api_key:
            api_key = request.query_params.get("api_key")
        
        if not api_key or api_key not in self.valid_api_keys:
            logger.warning(
                f"Invalid API key attempt from {request.client.host if request.client else 'unknown'}",
                extra={"path": request.url.path}
            )
            return Response(
                content='{"detail": "Invalid or missing API key"}',
                status_code=401,
                headers={"Content-Type": "application/json"}
            )
        
        return await call_next(request)
