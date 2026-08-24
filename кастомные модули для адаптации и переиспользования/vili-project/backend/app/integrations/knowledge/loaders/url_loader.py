"""URL loader for knowledge sources"""

import httpx
import logging
from typing import Optional
from bs4 import BeautifulSoup

from app.integrations.knowledge.loaders.base_loader import BaseLoader
from app.core.exceptions import KnowledgeSourceException

logger = logging.getLogger(__name__)

# Попытка импортировать Playwright для рендеринга JavaScript
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.info("Playwright not available. JavaScript-rendered pages will not be fully supported.")


class URLLoader(BaseLoader):
    """Загрузчик контента по URL"""
    
    def __init__(self):
        super().__init__()
        self.html_content = None
    
    async def load(self, source: str, timeout: int = 30, use_playwright: bool = False, **kwargs) -> str:
        """
        Загрузить контент по URL
        
        Args:
            source: URL источника
            timeout: Timeout в секундах
            use_playwright: Использовать Playwright для рендеринга JavaScript (если доступен)
            **kwargs: Дополнительные параметры
        
        Returns:
            str: HTML контент
        """
        if not self.validate_source(source):
            raise KnowledgeSourceException("Invalid URL", details={"url": source})
        
        # Если запрошен Playwright и он доступен, используем его
        if use_playwright and PLAYWRIGHT_AVAILABLE:
            return await self._load_with_playwright(source, timeout)
        
        # Обычная загрузка через httpx
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.get(source)
                response.raise_for_status()
                
                self.html_content = response.text
                self.metadata = {
                    "url": source,
                    "status_code": response.status_code,
                    "content_type": response.headers.get("content-type"),
                    "content_length": len(response.text),
                }
                
                return self.html_content
        except httpx.HTTPError as e:
            raise KnowledgeSourceException(
                f"Failed to load URL: {str(e)}",
                details={"url": source, "error": str(e)}
            )
    
    async def _load_with_playwright(self, source: str, timeout: int = 30) -> str:
        """
        Загрузить контент с использованием Playwright для рендеринга JavaScript
        
        Args:
            source: URL источника
            timeout: Timeout в секундах
        
        Returns:
            str: HTML контент после рендеринга JavaScript
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Устанавливаем timeout
                page.set_default_timeout(timeout * 1000)
                
                # Загружаем страницу и ждем загрузки контента
                await page.goto(source, wait_until="networkidle", timeout=timeout * 1000)
                
                # Ждем немного для полной загрузки динамического контента
                await page.wait_for_timeout(2000)
                
                # Получаем HTML после рендеринга
                self.html_content = await page.content()
                
                # Закрываем браузер
                await browser.close()
                
                self.metadata = {
                    "url": source,
                    "status_code": 200,
                    "content_type": "text/html",
                    "content_length": len(self.html_content),
                    "rendered_with_playwright": True,
                }
                
                logger.info(f"Successfully loaded and rendered {source} with Playwright")
                
                return self.html_content
        except Exception as e:
            logger.error(f"Failed to load {source} with Playwright: {str(e)}")
            # Fallback на обычную загрузку через httpx
            try:
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    response = await client.get(source)
                    response.raise_for_status()
                    self.html_content = response.text
                    self.metadata = {
                        "url": source,
                        "status_code": response.status_code,
                        "content_type": response.headers.get("content-type"),
                        "content_length": len(response.text),
                        "playwright_failed": True,
                    }
                    return self.html_content
            except httpx.HTTPError as http_error:
                raise KnowledgeSourceException(
                    f"Failed to load URL with both Playwright and httpx: {str(e)}",
                    details={"url": source, "playwright_error": str(e), "http_error": str(http_error)}
                )
    
    def extract_text(self) -> str:
        """
        Извлечь текст из HTML
        
        Returns:
            str: Извлеченный текст
        """
        if not self.html_content:
            return ""
        
        try:
            soup = BeautifulSoup(self.html_content, 'html.parser')
            
            # Проверяем, не является ли страница SPA с пустым body
            body = soup.find('body')
            requires_js = False
            if body:
                body_text = body.get_text(strip=True)
                # Если body почти пустой (меньше 50 символов), возможно это SPA
                if len(body_text) < 50 and len(self.html_content) > 1000:
                    requires_js = True
                    logger.warning(
                        f"Possible SPA detected: body text is very short ({len(body_text)} chars) "
                        f"but HTML is large ({len(self.html_content)} chars). "
                        f"Content may require JavaScript rendering."
                    )
                    # Сохраняем информацию в метаданные
                    if self.metadata:
                        self.metadata["requires_javascript"] = True
                        self.metadata["spa_detected"] = True
                    # Пытаемся извлечь данные из JSON-LD или других структурированных данных
                    json_ld = soup.find_all('script', type='application/ld+json')
                    if json_ld:
                        logger.info(f"Found {len(json_ld)} JSON-LD scripts, attempting to extract structured data")
                        # Можно добавить парсинг JSON-LD здесь если нужно
            
            # Удаляем script и style теги
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Извлекаем текст
            text = soup.get_text()
            
            # Очистка: удаление лишних пробелов и переносов
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Логируем результат
            if len(text.strip()) < 50 and len(self.html_content) > 1000:
                requires_js = True
                logger.warning(
                    f"Extracted text is very short ({len(text)} chars) from large HTML "
                    f"({len(self.html_content)} chars). Page may require JavaScript rendering."
                )
                # Сохраняем информацию в метаданные
                if self.metadata:
                    self.metadata["requires_javascript"] = True
                    self.metadata["extraction_warning"] = "Text extraction may require JavaScript rendering"
            
            return text
        except Exception as e:
            raise KnowledgeSourceException(
                f"Failed to extract text from HTML: {str(e)}",
                details={"error": str(e)}
            )
    
    def validate_source(self, source: str) -> bool:
        """Валидация URL"""
        if not source:
            return False
        return source.startswith(("http://", "https://"))
