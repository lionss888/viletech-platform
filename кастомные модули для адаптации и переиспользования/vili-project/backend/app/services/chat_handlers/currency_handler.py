"""Currency Handler for Chat Requests.

Handles requests related to fea-stage currency rates.
Uses FeaStageClient for real API integration.
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.database.schemas.intent import IntentResult, IntentType, EntityType
from app.integrations import (
    get_fea_stage_client,
    FeaStageError,
    FeaStageConnectionError,
    FeaStageNotConfiguredError,
    FeaStageAuthError,
    CurrencySource,
)
from .base_handler import BaseHandler, ChatResponseData


class CurrencyHandler(BaseHandler):
    """Обработчик запросов по курсам валют (fea-stage).
    
    Использует FeaStageClient для интеграции с fea-stage API.
    """
    
    # Маппинг символов валют на названия
    CURRENCY_NAMES = {
        "USD": "Доллар США",
        "EUR": "Евро",
        "CNY": "Юань",
        "GBP": "Фунт стерлингов",
        "JPY": "Японская йена",
        "CHF": "Швейцарский франк",
        "RUB": "Российский рубль",
        "TRY": "Турецкая лира",
        "AED": "Дирхам ОАЭ",
        "KZT": "Казахстанский тенге",
    }
    
    # Флаги для валют
    CURRENCY_FLAGS = {
        "USD": "🇺🇸",
        "EUR": "🇪🇺",
        "CNY": "🇨🇳",
        "GBP": "🇬🇧",
        "JPY": "🇯🇵",
        "CHF": "🇨🇭",
        "RUB": "🇷🇺",
        "TRY": "🇹🇷",
        "AED": "🇦🇪",
        "KZT": "🇰🇿",
    }
    
    def __init__(self, db: Session):
        super().__init__(db)
        self._client = get_fea_stage_client()
    
    @property
    def is_configured(self) -> bool:
        """Проверка, настроена ли интеграция."""
        return self._client.is_configured
    
    async def handle(self, intent_result: IntentResult) -> ChatResponseData:
        """Маршрутизация по типу запроса."""
        intent = intent_result.intent
        
        if intent == IntentType.GET_CURRENCY_RATES:
            return await self.handle_rates(intent_result)
        elif intent == IntentType.GET_CURRENCY_BY_SYMBOL:
            return await self.handle_get_by_symbol(intent_result)
        else:
            return await self.handle_rates(intent_result)
    
    async def handle_rates(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса курсов валют."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        try:
            # Получаем курсы для дашборда
            result = await self._client.get_currency_rates(
                base_currency="RUB",
                symbols=["USD", "EUR", "CNY", "GBP", "TRY"]
            )
            
            if not result.rates:
                return ChatResponseData(
                    answer="📊 Курсы валют временно недоступны.\n\nПопробуйте позже или проверьте настройки источников курсов.",
                    context_used=True,
                    model="vili-fea-stage"
                )
            
            answer = self._format_rates_dashboard(result.rates, result.base_currency, result.updated_at)
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={
                    "Все курсы": "/currency",
                    "Настройки валют": "/admin/currency"
                },
                embedded_data={
                    "type": "currency_rates",
                    "base_currency": result.base_currency,
                    "rates_count": len(result.rates)
                }
            )
            
        except FeaStageAuthError as e:
            return self._get_auth_error_response(str(e))
        except FeaStageConnectionError:
            return self._get_connection_error_response()
        except FeaStageError as e:
            return self._get_error_response(str(e))
    
    async def handle_get_by_symbol(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса курса конкретной валюты."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        currency_symbol = self.get_entity(intent_result, EntityType.CURRENCY_SYMBOL)
        currency_source = self.get_entity(intent_result, EntityType.CURRENCY_SOURCE, "cbr")
        
        if not currency_symbol:
            return ChatResponseData(
                answer="❓ Укажите валюту для получения курса.\n\nПример: `какой курс доллара?` или `курс евро`",
                context_used=False,
                model="vili-fea-stage"
            )
        
        try:
            rate = await self._client.get_currency_by_symbol(
                symbol=currency_symbol,
                source=currency_source
            )
            
            if not rate:
                return ChatResponseData(
                    answer=f"❌ Курс валюты {currency_symbol} не найден.\n\nПопробуйте другой источник или проверьте правильность символа.",
                    context_used=False,
                    model="vili-fea-stage"
                )
            
            answer = self._format_single_rate(rate)
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={
                    "Все курсы": "/currency",
                    f"История курса {currency_symbol}": f"/currency/{currency_symbol}/history"
                },
                embedded_data={
                    "type": "currency_rate",
                    "symbol": currency_symbol,
                    "rate": rate.rate,
                    "source": rate.source.value
                }
            )
            
        except FeaStageAuthError as e:
            return self._get_auth_error_response(str(e))
        except FeaStageConnectionError:
            return self._get_connection_error_response()
        except FeaStageError as e:
            return self._get_error_response(str(e))
    
    # ============================================
    # Formatting Methods
    # ============================================
    
    def _format_rates_dashboard(self, rates, base_currency: str, updated_at: str = None) -> str:
        """Форматирование курсов валют для дашборда."""
        answer = f"## 💱 Курсы валют к {base_currency}\n\n"
        
        if updated_at:
            answer += f"*Обновлено: {updated_at[:16]}*\n\n"
        
        answer += "| Валюта | Курс | Изменение |\n"
        answer += "|--------|------|----------|\n"
        
        for rate in rates:
            flag = self.CURRENCY_FLAGS.get(rate.symbol, "💰")
            name = self.CURRENCY_NAMES.get(rate.symbol, rate.symbol)
            
            # Форматируем курс
            if rate.rate >= 100:
                rate_str = f"{rate.rate:,.2f}"
            else:
                rate_str = f"{rate.rate:.4f}"
            
            # Изменение
            if rate.change_percent is not None:
                if rate.change_percent > 0:
                    change_str = f"📈 +{rate.change_percent:.2f}%"
                elif rate.change_percent < 0:
                    change_str = f"📉 {rate.change_percent:.2f}%"
                else:
                    change_str = "➖ 0%"
            else:
                change_str = "➖"
            
            answer += f"| {flag} {rate.symbol} ({name}) | {rate_str} | {change_str} |\n"
        
        answer += f"\n*Базовая валюта: {base_currency}*"
        
        return answer
    
    def _format_single_rate(self, rate) -> str:
        """Форматирование одного курса валюты."""
        flag = self.CURRENCY_FLAGS.get(rate.symbol, "💰")
        name = self.CURRENCY_NAMES.get(rate.symbol, rate.symbol)
        source_name = self._get_source_name(rate.source)
        
        answer = f"## {flag} Курс {name} ({rate.symbol})\n\n"
        
        # Основной курс
        if rate.rate >= 100:
            rate_str = f"{rate.rate:,.2f}"
        else:
            rate_str = f"{rate.rate:.4f}"
        
        answer += f"**1 {rate.symbol} = {rate_str} {rate.base_currency}**\n\n"
        
        # Обратный курс
        if rate.inverse_rate:
            if rate.inverse_rate >= 100:
                inverse_str = f"{rate.inverse_rate:,.2f}"
            else:
                inverse_str = f"{rate.inverse_rate:.4f}"
            answer += f"*1 {rate.base_currency} = {inverse_str} {rate.symbol}*\n\n"
        
        # Источник и дата
        answer += f"**Источник:** {source_name}\n"
        
        if rate.date:
            answer += f"**Дата:** {rate.date[:10]}\n"
        
        if rate.updated_at:
            answer += f"**Обновлено:** {rate.updated_at[:16]}\n"
        
        return answer
    
    def _get_source_name(self, source: CurrencySource) -> str:
        """Получение названия источника курса."""
        source_names = {
            CurrencySource.CBR: "🏦 Центральный банк России",
            CurrencySource.OPENEXCHANGE: "📊 Open Exchange Rates",
            CurrencySource.MANUAL: "✏️ Ручной ввод",
            CurrencySource.UNKNOWN: "❓ Неизвестный",
        }
        return source_names.get(source, "❓ Неизвестный")
    
    # ============================================
    # Error Response Methods
    # ============================================
    
    def _get_not_configured_response(self) -> ChatResponseData:
        """Ответ при отсутствии конфигурации."""
        answer = """⚠️ Интеграция с fea-stage не настроена.

Для получения курсов валют необходимо:
1. Указать `FEA_STAGE_API_URL` в конфигурации
2. Указать `FEA_STAGE_API_KEY` для аутентификации

Обратитесь к администратору для настройки интеграции."""
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-fea-stage"
        )
    
    def _get_auth_error_response(self, error_detail: str = None) -> ChatResponseData:
        """Ответ при ошибке аутентификации."""
        from app.core.config import settings
        
        answer = "❌ Ошибка аутентификации в fea-stage.\n\n"
        
        # Проверяем, установлен ли API ключ
        has_api_key = bool(settings.FEA_STAGE_API_KEY and settings.FEA_STAGE_API_KEY.strip())
        has_credentials = bool(
            getattr(settings, 'FEA_STAGE_EMAIL', '') and 
            getattr(settings, 'FEA_STAGE_PASSWORD', '')
        )
        
        if not has_api_key and not has_credentials:
            answer += "⚠️ **Проблема:** Не настроена аутентификация.\n\n"
            answer += "**Решение:**\n"
            answer += "1. Установите `FEA_STAGE_API_KEY` в переменных окружения\n"
            answer += "2. Или установите `FEA_STAGE_EMAIL` и `FEA_STAGE_PASSWORD`\n\n"
            answer += "**Пример:**\n"
            answer += "```bash\n"
            answer += "export FEA_STAGE_API_KEY=your-api-key-here\n"
            answer += "```\n"
        else:
            answer += "**Проблема:** API ключ или учетные данные неверны.\n\n"
            answer += "**Проверьте:**\n"
            if has_api_key:
                answer += f"- `FEA_STAGE_API_KEY` установлен (длина: {len(settings.FEA_STAGE_API_KEY)} символов)\n"
            if has_credentials:
                answer += f"- `FEA_STAGE_EMAIL` установлен: {getattr(settings, 'FEA_STAGE_EMAIL', '')}\n"
            answer += "- Правильность значения API ключа\n"
            answer += "- Доступность сервера fea-stage\n\n"
        
        if error_detail:
            answer += f"**Детали ошибки:** {error_detail}\n"
        
        answer += "\nОбратитесь к администратору для проверки настроек интеграции."
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-fea-stage"
        )
    
    def _get_connection_error_response(self) -> ChatResponseData:
        """Ответ при ошибке соединения."""
        from app.core.config import settings
        api_url = settings.FEA_STAGE_API_URL or "(не установлен)"
        
        answer = f"""❌ Не удалось подключиться к fea-stage.

**Текущий адрес:** `{api_url}`

**Возможные причины:**
1. Сервер fea-stage не запущен
2. Неверный адрес в `FEA_STAGE_API_URL`
3. Проблемы с сетью или файрволом
4. Если используете Docker, проверьте доступность через `host.docker.internal`

**Проверьте:**
- Запущен ли сервер fea-stage на порту 30000
- Доступность: `curl {api_url}/health` или `curl http://localhost:30000/api/1.0/health`
- Настройки в `docker-compose.yml` или переменные окружения"""
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-fea-stage"
        )
    
    def _get_error_response(self, error_message: str) -> ChatResponseData:
        """Общий ответ об ошибке."""
        return ChatResponseData(
            answer=f"❌ Ошибка при получении курсов валют: {error_message}",
            context_used=False,
            model="vili-fea-stage"
        )
