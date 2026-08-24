"""Retry utilities for external service calls"""

import asyncio
import functools
import logging
from typing import Any, Callable, Optional, Type, Tuple, Union

logger = logging.getLogger(__name__)


# ============================================
# Retry Configuration
# ============================================

class RetryConfig:
    """Configuration for retry behavior."""
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    ):
        """
        Initialize retry configuration.
        
        Args:
            max_attempts: Maximum number of retry attempts
            initial_delay: Initial delay between retries in seconds
            max_delay: Maximum delay between retries in seconds
            exponential_base: Base for exponential backoff
            jitter: Whether to add random jitter to delays
            retryable_exceptions: Tuple of exception types to retry on
        """
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_exceptions = retryable_exceptions


# Default configurations for different services
LLM_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=2.0,
    max_delay=30.0,
    exponential_base=2.0,
)

DATABASE_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=0.5,
    max_delay=10.0,
    exponential_base=2.0,
)

HTTP_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=15.0,
    exponential_base=2.0,
)


# ============================================
# Retry Decorator
# ============================================

def retry_async(
    config: Optional[RetryConfig] = None,
    max_attempts: Optional[int] = None,
    initial_delay: Optional[float] = None,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
    on_retry: Optional[Callable[[int, Exception], None]] = None,
) -> Callable:
    """
    Decorator for retrying async functions with exponential backoff.
    
    Args:
        config: RetryConfig object (optional, uses defaults if not provided)
        max_attempts: Override max attempts from config
        initial_delay: Override initial delay from config
        retryable_exceptions: Override retryable exceptions from config
        on_retry: Callback function called on each retry (attempt, exception)
    
    Usage:
        @retry_async(config=LLM_RETRY_CONFIG)
        async def call_llm():
            ...
            
        @retry_async(max_attempts=5, initial_delay=2.0)
        async def call_api():
            ...
    """
    if config is None:
        config = RetryConfig()
    
    # Override config values if provided
    _max_attempts = max_attempts or config.max_attempts
    _initial_delay = initial_delay or config.initial_delay
    _max_delay = config.max_delay
    _exponential_base = config.exponential_base
    _jitter = config.jitter
    _retryable_exceptions = retryable_exceptions or config.retryable_exceptions
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception: Optional[Exception] = None
            
            for attempt in range(1, _max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except _retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt == _max_attempts:
                        logger.error(
                            f"Function {func.__name__} failed after {_max_attempts} attempts: {e}"
                        )
                        raise
                    
                    # Calculate delay with exponential backoff
                    delay = min(
                        _initial_delay * (_exponential_base ** (attempt - 1)),
                        _max_delay
                    )
                    
                    # Add jitter if enabled
                    if _jitter:
                        import random
                        delay = delay * (0.5 + random.random())
                    
                    logger.warning(
                        f"Function {func.__name__} attempt {attempt} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    
                    # Call on_retry callback if provided
                    if on_retry:
                        on_retry(attempt, e)
                    
                    await asyncio.sleep(delay)
            
            # Should not reach here, but just in case
            if last_exception:
                raise last_exception
            raise RuntimeError(f"Unexpected retry loop exit in {func.__name__}")
        
        return wrapper
    return decorator


def retry_sync(
    config: Optional[RetryConfig] = None,
    max_attempts: Optional[int] = None,
    initial_delay: Optional[float] = None,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
    on_retry: Optional[Callable[[int, Exception], None]] = None,
) -> Callable:
    """
    Decorator for retrying sync functions with exponential backoff.
    
    Same as retry_async but for synchronous functions.
    """
    if config is None:
        config = RetryConfig()
    
    _max_attempts = max_attempts or config.max_attempts
    _initial_delay = initial_delay or config.initial_delay
    _max_delay = config.max_delay
    _exponential_base = config.exponential_base
    _jitter = config.jitter
    _retryable_exceptions = retryable_exceptions or config.retryable_exceptions
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            import time
            last_exception: Optional[Exception] = None
            
            for attempt in range(1, _max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except _retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt == _max_attempts:
                        logger.error(
                            f"Function {func.__name__} failed after {_max_attempts} attempts: {e}"
                        )
                        raise
                    
                    delay = min(
                        _initial_delay * (_exponential_base ** (attempt - 1)),
                        _max_delay
                    )
                    
                    if _jitter:
                        import random
                        delay = delay * (0.5 + random.random())
                    
                    logger.warning(
                        f"Function {func.__name__} attempt {attempt} failed: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    
                    if on_retry:
                        on_retry(attempt, e)
                    
                    time.sleep(delay)
            
            if last_exception:
                raise last_exception
            raise RuntimeError(f"Unexpected retry loop exit in {func.__name__}")
        
        return wrapper
    return decorator


# ============================================
# Context Manager for Retry
# ============================================

class RetryContext:
    """Context manager for retry logic."""
    
    def __init__(
        self,
        config: Optional[RetryConfig] = None,
        on_retry: Optional[Callable[[int, Exception], None]] = None,
    ):
        self.config = config or RetryConfig()
        self.on_retry = on_retry
        self.attempt = 0
        self.last_exception: Optional[Exception] = None
    
    def __enter__(self) -> "RetryContext":
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        if exc_type is None:
            return False
        
        if not isinstance(exc_val, self.config.retryable_exceptions):
            return False
        
        self.last_exception = exc_val
        self.attempt += 1
        
        if self.attempt >= self.config.max_attempts:
            return False
        
        return True
    
    @property
    def should_retry(self) -> bool:
        """Check if we should retry."""
        return self.attempt < self.config.max_attempts
    
    def get_delay(self) -> float:
        """Calculate delay for current attempt."""
        delay = min(
            self.config.initial_delay * (self.config.exponential_base ** (self.attempt - 1)),
            self.config.max_delay
        )
        
        if self.config.jitter:
            import random
            delay = delay * (0.5 + random.random())
        
        return delay
