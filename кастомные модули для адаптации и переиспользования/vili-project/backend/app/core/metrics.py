"""Prometheus metrics for VILI application"""

from prometheus_client import Counter, Histogram, Gauge, Info
from functools import wraps
import time
from typing import Callable, Any


# ============================================
# Application Info
# ============================================

app_info = Info(
    "vili_app",
    "VILI Application Information"
)
app_info.info({
    "version": "1.0.0",
    "name": "VILI Payment Assistant"
})


# ============================================
# Request Metrics
# ============================================

http_requests_total = Counter(
    "vili_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

http_request_duration_seconds = Histogram(
    "vili_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)


# ============================================
# Document Processing Metrics
# ============================================

documents_processed_total = Counter(
    "vili_documents_processed_total",
    "Total documents processed",
    ["document_type", "format", "status"]
)

document_processing_duration_seconds = Histogram(
    "vili_document_processing_duration_seconds",
    "Document processing duration in seconds",
    ["document_type"],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

documents_pending = Gauge(
    "vili_documents_pending",
    "Number of documents pending processing"
)


# ============================================
# Compliance Metrics
# ============================================

compliance_checks_total = Counter(
    "vili_compliance_checks_total",
    "Total compliance checks performed",
    ["check_type", "status", "risk_level"]
)

compliance_check_duration_seconds = Histogram(
    "vili_compliance_check_duration_seconds",
    "Compliance check duration in seconds",
    ["check_type"],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
)


# ============================================
# Risk Assessment Metrics
# ============================================

risk_assessments_total = Counter(
    "vili_risk_assessments_total",
    "Total risk assessments performed",
    ["risk_level", "recommendation"]
)

risk_assessment_duration_seconds = Histogram(
    "vili_risk_assessment_duration_seconds",
    "Risk assessment duration in seconds",
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0]
)


# ============================================
# LLM Metrics
# ============================================

llm_requests_total = Counter(
    "vili_llm_requests_total",
    "Total LLM API requests",
    ["model", "status"]
)

llm_request_duration_seconds = Histogram(
    "vili_llm_request_duration_seconds",
    "LLM API request duration in seconds",
    ["model"],
    buckets=[1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0]
)

llm_tokens_used = Counter(
    "vili_llm_tokens_used_total",
    "Total LLM tokens used",
    ["model", "token_type"]
)


# ============================================
# RAG Metrics
# ============================================

rag_searches_total = Counter(
    "vili_rag_searches_total",
    "Total RAG searches performed",
    ["status"]
)

rag_search_duration_seconds = Histogram(
    "vili_rag_search_duration_seconds",
    "RAG search duration in seconds",
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

rag_chunks_retrieved = Histogram(
    "vili_rag_chunks_retrieved",
    "Number of RAG chunks retrieved per search",
    buckets=[1, 2, 3, 5, 10, 20]
)


# ============================================
# Embedding Metrics
# ============================================

embeddings_generated_total = Counter(
    "vili_embeddings_generated_total",
    "Total embeddings generated",
    ["model", "status"]
)

embedding_generation_duration_seconds = Histogram(
    "vili_embedding_generation_duration_seconds",
    "Embedding generation duration in seconds",
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)


# ============================================
# Database Metrics
# ============================================

db_queries_total = Counter(
    "vili_db_queries_total",
    "Total database queries",
    ["operation", "table"]
)

db_query_duration_seconds = Histogram(
    "vili_db_query_duration_seconds",
    "Database query duration in seconds",
    ["operation"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

db_connections_active = Gauge(
    "vili_db_connections_active",
    "Number of active database connections"
)


# ============================================
# Intent Recognition Metrics
# ============================================

intent_recognition_total = Counter(
    "vili_intent_recognition_total",
    "Total intent recognition attempts",
    ["intent_type", "response_type"]
)

intent_recognition_confidence = Histogram(
    "vili_intent_recognition_confidence",
    "Intent recognition confidence distribution",
    ["intent_type"],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

intent_recognition_duration_seconds = Histogram(
    "vili_intent_recognition_duration_seconds",
    "Intent recognition duration in seconds",
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25]
)

intent_low_confidence_total = Counter(
    "vili_intent_low_confidence_total",
    "Total low confidence intent recognitions",
    ["intent_type"]
)

pattern_optimization_total = Counter(
    "vili_pattern_optimization_total",
    "Total pattern optimization cycles",
    ["result"]
)

pattern_improvements_applied = Counter(
    "vili_pattern_improvements_applied_total",
    "Total pattern improvements applied",
    ["apply_type"]  # 'auto' or 'manual'
)

active_patterns = Gauge(
    "vili_active_patterns",
    "Number of active intent patterns"
)


# ============================================
# Error Metrics
# ============================================

errors_total = Counter(
    "vili_errors_total",
    "Total errors",
    ["error_type", "component"]
)


# ============================================
# Helper Decorators
# ============================================

def track_request_metrics(endpoint: str) -> Callable:
    """Decorator to track HTTP request metrics."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            status = "success"
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "error"
                errors_total.labels(
                    error_type=type(e).__name__,
                    component="api"
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                http_request_duration_seconds.labels(
                    method="POST",
                    endpoint=endpoint
                ).observe(duration)
                http_requests_total.labels(
                    method="POST",
                    endpoint=endpoint,
                    status=status
                ).inc()
        
        return wrapper
    return decorator


def track_llm_metrics(model: str) -> Callable:
    """Decorator to track LLM request metrics."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            status = "success"
            
            try:
                result = await func(*args, **kwargs)
                
                # Track token usage if available
                if isinstance(result, dict) and "usage" in result:
                    usage = result["usage"]
                    if "prompt_tokens" in usage:
                        llm_tokens_used.labels(
                            model=model,
                            token_type="prompt"
                        ).inc(usage["prompt_tokens"])
                    if "completion_tokens" in usage:
                        llm_tokens_used.labels(
                            model=model,
                            token_type="completion"
                        ).inc(usage["completion_tokens"])
                
                return result
            except Exception as e:
                status = "error"
                raise
            finally:
                duration = time.time() - start_time
                llm_request_duration_seconds.labels(model=model).observe(duration)
                llm_requests_total.labels(model=model, status=status).inc()
        
        return wrapper
    return decorator


def track_document_processing(document_type: str) -> Callable:
    """Decorator to track document processing metrics."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                documents_processed_total.labels(
                    document_type=document_type,
                    format="unknown",
                    status="success"
                ).inc()
                return result
            except Exception as e:
                documents_processed_total.labels(
                    document_type=document_type,
                    format="unknown",
                    status="error"
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                document_processing_duration_seconds.labels(
                    document_type=document_type
                ).observe(duration)
        
        return wrapper
    return decorator


# ============================================
# Intent Recognition Metrics Functions
# ============================================

def record_intent_recognition(
    intent_type: str,
    confidence: float,
    response_type: str,
    duration_seconds: float,
    is_low_confidence: bool = False,
) -> None:
    """Record intent recognition metrics.
    
    Args:
        intent_type: Type of detected intent
        confidence: Recognition confidence (0-1)
        response_type: Type of response (handler/llm/rag)
        duration_seconds: Processing duration
        is_low_confidence: Whether this was a low confidence recognition
    """
    intent_recognition_total.labels(
        intent_type=intent_type,
        response_type=response_type
    ).inc()
    
    intent_recognition_confidence.labels(
        intent_type=intent_type
    ).observe(confidence)
    
    intent_recognition_duration_seconds.observe(duration_seconds)
    
    if is_low_confidence:
        intent_low_confidence_total.labels(
            intent_type=intent_type
        ).inc()


def record_pattern_optimization(result: str) -> None:
    """Record pattern optimization cycle result.
    
    Args:
        result: 'success', 'partial', 'failed', or 'skipped'
    """
    pattern_optimization_total.labels(result=result).inc()


def record_pattern_improvement(apply_type: str) -> None:
    """Record pattern improvement application.
    
    Args:
        apply_type: 'auto' or 'manual'
    """
    pattern_improvements_applied.labels(apply_type=apply_type).inc()


def update_active_patterns_count(count: int) -> None:
    """Update the active patterns gauge.
    
    Args:
        count: Number of active patterns
    """
    active_patterns.set(count)
