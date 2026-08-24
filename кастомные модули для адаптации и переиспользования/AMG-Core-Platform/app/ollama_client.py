"""Ollama client for API communication."""

import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Any, Optional
import httpx
from app.config import settings
from app.utils.errors import OllamaError
from app.utils.logging import get_request_id


class OllamaClient:
    """Async client for Ollama API."""
    
    def __init__(self):
        self.base_url = settings.ollama_host.rstrip('/')
        self.timeout = httpx.Timeout(120.0, connect=10.0)
        self.client = httpx.AsyncClient(timeout=self.timeout)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def ping(self) -> Dict[str, Any]:
        """Ping Ollama server and return health status."""
        start_time = time.time()
        request_id = get_request_id()
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/tags",
                headers={"X-Request-ID": request_id}
            )
            response.raise_for_status()
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                "ok": True,
                "host": self.base_url,
                "latency_ms": latency_ms
            }
            
        except httpx.TimeoutException:
            raise OllamaError(
                "Ollama server timeout",
                {"host": self.base_url, "timeout": str(self.timeout)}
            )
        except httpx.ConnectError:
            raise OllamaError(
                "Cannot connect to Ollama server",
                {"host": self.base_url}
            )
        except httpx.HTTPStatusError as e:
            raise OllamaError(
                f"Ollama server error: {e.response.status_code}",
                {"host": self.base_url, "status_code": e.response.status_code}
            )
        except Exception as e:
            raise OllamaError(
                f"Unexpected error: {str(e)}",
                {"host": self.base_url, "error": str(e)}
            )
    
    async def get_models(self) -> Dict[str, Any]:
        """Get available models from Ollama."""
        request_id = get_request_id()
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/tags",
                headers={"X-Request-ID": request_id}
            )
            response.raise_for_status()
            return response.json()
            
        except httpx.TimeoutException:
            raise OllamaError("Ollama server timeout")
        except httpx.ConnectError:
            raise OllamaError("Cannot connect to Ollama server")
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama server error: {e.response.status_code}")
        except Exception as e:
            raise OllamaError(f"Unexpected error: {str(e)}")
    
    async def chat(
        self,
        model: str,
        messages: list[Dict[str, str]],
        stream: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Chat with Ollama model."""
        request_id = get_request_id()
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream
        }
        
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json=payload,
                headers={"X-Request-ID": request_id}
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            yield data
                        except json.JSONDecodeError:
                            # Skip invalid JSON lines
                            continue
                            
        except httpx.TimeoutException:
            raise OllamaError("Ollama chat timeout")
        except httpx.ConnectError:
            raise OllamaError("Cannot connect to Ollama server")
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama server error: {e.response.status_code}")
        except Exception as e:
            raise OllamaError(f"Unexpected error: {str(e)}")
    
    async def generate(
        self,
        model: str,
        prompt: str,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate response from Ollama model."""
        request_id = get_request_id()
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload,
                headers={"X-Request-ID": request_id}
            )
            response.raise_for_status()
            return response.json()
            
        except httpx.TimeoutException:
            raise OllamaError("Ollama generation timeout")
        except httpx.ConnectError:
            raise OllamaError("Cannot connect to Ollama server")
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama server error: {e.response.status_code}")
        except Exception as e:
            raise OllamaError(f"Unexpected error: {str(e)}")
    
    async def generate_stream(
        self,
        model: str,
        prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generate streaming response from Ollama model."""
        request_id = get_request_id()
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": True
        }
        
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload,
                headers={"X-Request-ID": request_id}
            ) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            yield data
                            
                            # Ollama sends 'done: true' when finished
                            if data.get('done', False):
                                break
                                
                        except json.JSONDecodeError:
                            # Skip invalid JSON lines
                            continue
                            
        except httpx.TimeoutException:
            raise OllamaError("Ollama streaming timeout")
        except httpx.ConnectError:
            raise OllamaError("Cannot connect to Ollama server")
        except httpx.HTTPStatusError as e:
            raise OllamaError(f"Ollama server error: {e.response.status_code}")
        except Exception as e:
            raise OllamaError(f"Unexpected streaming error: {str(e)}")


# Global client instance
ollama_client = OllamaClient()
