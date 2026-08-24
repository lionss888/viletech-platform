"""Counterparty Handler for Chat Requests.

Handles requests related to fea-stage counterparties.
Uses FeaStageClient for real API integration.
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.schemas.intent import IntentResult, IntentType, EntityType
from app.integrations import (
    get_fea_stage_client,
    FeaStageError,
    FeaStageConnectionError,
    FeaStageNotConfiguredError,
    FeaStageAuthError,
    CounterpartyApprovalStatus,
)
from .base_handler import BaseHandler, ChatResponseData


class CounterpartyHandler(BaseHandler):
    """Обработчик запросов по контрагентам (fea-stage).
    
    Использует FeaStageClient для интеграции с fea-stage API.
    """
    
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
        
        if intent == IntentType.LIST_COUNTERPARTIES:
            return await self.handle_list(intent_result)
        elif intent == IntentType.GET_COUNTERPARTY:
            return await self.handle_get(intent_result)
        elif intent == IntentType.GET_COUNTERPARTY_REQUESTS:
            return await self.handle_requests(intent_result)
        else:
            return await self.handle_list(intent_result)
    
    async def handle_list(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса списка контрагентов."""
        
        # Проверяем конфигурацию
        if not self.is_configured:
            return self._get_not_configured_response()
        
        # Извлекаем фильтры
        name_filter = self.get_entity(intent_result, EntityType.COUNTERPARTY_NAME)
        country_filter = self.get_entity(intent_result, EntityType.COUNTERPARTY_COUNTRY)
        
        try:
            result = await self._client.get_counterparties(
                name=name_filter,
                country=country_filter,
                page=1,
                page_size=10
            )
            
            if not result.counterparties:
                filter_info = ""
                if name_filter:
                    filter_info += f" по имени '{name_filter}'"
                if country_filter:
                    filter_info += f" из страны '{country_filter}'"
                
                return ChatResponseData(
                    answer=f"📋 Контрагенты{filter_info} не найдены.\n\nВозможно, нужно добавить нового контрагента в системе fea-stage.",
                    context_used=True,
                    model="vili-fea-stage",
                    links={"Добавить контрагента": "/counterparty/create"}
                )
            
            # Формируем ответ
            answer = self._format_counterparty_list(result.counterparties, result.total, name_filter, country_filter)
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={
                    "Все контрагенты": "/counterparty/list",
                    "Добавить контрагента": "/counterparty/create"
                },
                embedded_data={
                    "type": "counterparty_list",
                    "total": result.total,
                    "displayed": len(result.counterparties),
                    "has_next": result.has_next
                }
            )
            
        except FeaStageAuthError as e:
            return self._get_auth_error_response(str(e))
        except FeaStageConnectionError:
            return self._get_connection_error_response()
        except FeaStageError as e:
            return self._get_error_response(str(e))
    
    async def handle_get(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса деталей контрагента."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        # Извлекаем ID контрагента
        counterparty_id = self.get_entity(intent_result, EntityType.COUNTERPARTY_ID)
        counterparty_name = self.get_entity(intent_result, EntityType.COUNTERPARTY_NAME)
        
        if not counterparty_id and not counterparty_name:
            return ChatResponseData(
                answer="❓ Укажите ID или название контрагента для получения информации.\n\nПример: `информация о контрагенте ABC Trading`",
                context_used=False,
                model="vili-fea-stage"
            )
        
        try:
            # Если есть ID, получаем напрямую
            if counterparty_id:
                counterparty = await self._client.get_counterparty(counterparty_id)
                
                if not counterparty:
                    return ChatResponseData(
                        answer=f"❌ Контрагент с ID `{counterparty_id}` не найден.",
                        context_used=False,
                        model="vili-fea-stage"
                    )
                
                answer = self._format_counterparty_details(counterparty)
                
                return ChatResponseData(
                    answer=answer,
                    context_used=True,
                    model="vili-fea-stage",
                    links={
                        "Карточка контрагента": f"/counterparty/{counterparty_id}",
                        "История запросов": f"/counterparty/{counterparty_id}/requests"
                    },
                    embedded_data={
                        "type": "counterparty_details",
                        "counterparty_id": counterparty_id
                    }
                )
            
            # Если есть имя, ищем в списке
            result = await self._client.get_counterparties(name=counterparty_name, page_size=5)
            
            if not result.counterparties:
                return ChatResponseData(
                    answer=f"❌ Контрагент с именем '{counterparty_name}' не найден.",
                    context_used=False,
                    model="vili-fea-stage"
                )
            
            if len(result.counterparties) == 1:
                cp = result.counterparties[0]
                answer = self._format_counterparty_details(cp)
                
                return ChatResponseData(
                    answer=answer,
                    context_used=True,
                    model="vili-fea-stage",
                    links={
                        "Карточка контрагента": f"/counterparty/{cp.id}",
                        "История запросов": f"/counterparty/{cp.id}/requests"
                    }
                )
            
            # Несколько совпадений - показываем список
            answer = f"🔍 Найдено несколько контрагентов по запросу '{counterparty_name}':\n\n"
            answer += self._format_counterparty_list(result.counterparties, result.total)
            answer += "\n\nУточните название или используйте ID контрагента."
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage"
            )
            
        except FeaStageAuthError as e:
            return self._get_auth_error_response(str(e))
        except FeaStageConnectionError:
            return self._get_connection_error_response()
        except FeaStageError as e:
            return self._get_error_response(str(e))
    
    async def handle_requests(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса истории запросов контрагента."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        counterparty_id = self.get_entity(intent_result, EntityType.COUNTERPARTY_ID)
        counterparty_name = self.get_entity(intent_result, EntityType.COUNTERPARTY_NAME)
        
        if not counterparty_id and not counterparty_name:
            return ChatResponseData(
                answer="❓ Укажите контрагента для просмотра истории запросов.\n\nПример: `история запросов контрагента ABC Trading`",
                context_used=False,
                model="vili-fea-stage"
            )
        
        try:
            # Находим контрагента
            if not counterparty_id and counterparty_name:
                result = await self._client.get_counterparties(name=counterparty_name, page_size=1)
                if result.counterparties:
                    counterparty_id = result.counterparties[0].id
                else:
                    return ChatResponseData(
                        answer=f"❌ Контрагент '{counterparty_name}' не найден.",
                        context_used=False,
                        model="vili-fea-stage"
                    )
            
            requests_result = await self._client.get_counterparty_requests(
                counterparty_id=counterparty_id,
                page=1,
                page_size=10
            )
            
            if not requests_result.requests:
                return ChatResponseData(
                    answer=f"📋 У контрагента пока нет запросов (заявок).",
                    context_used=True,
                    model="vili-fea-stage",
                    links={"Контрагент": f"/counterparty/{counterparty_id}"}
                )
            
            answer = self._format_counterparty_requests(requests_result.requests, requests_result.total)
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={
                    "Контрагент": f"/counterparty/{counterparty_id}",
                    "Все запросы": f"/counterparty/{counterparty_id}/requests"
                },
                embedded_data={
                    "type": "counterparty_requests",
                    "counterparty_id": counterparty_id,
                    "total": requests_result.total
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
    
    def _format_counterparty_list(self, counterparties, total: int, 
                                   name_filter: str = None, country_filter: str = None) -> str:
        """Форматирование списка контрагентов."""
        filter_info = ""
        if name_filter:
            filter_info += f" (фильтр: '{name_filter}')"
        if country_filter:
            filter_info += f" (страна: {country_filter})"
        
        answer = f"📋 **Контрагенты{filter_info}** (всего: {total})\n\n"
        answer += "| Название | Страна | Тип | Статус |\n"
        answer += "|----------|--------|-----|--------|\n"
        
        for cp in counterparties:
            status_emoji = self._get_approval_status_emoji(cp.last_approval_status)
            cp_type = "🌍 Иностранный" if cp.type.value == "foreign" else "🇷🇺 Российский"
            answer += f"| {cp.name[:30]} | {cp.country or '-'} | {cp_type} | {status_emoji} |\n"
        
        if total > len(counterparties):
            answer += f"\n*Показано {len(counterparties)} из {total}*"
        
        return answer
    
    def _format_counterparty_details(self, cp) -> str:
        """Форматирование деталей контрагента."""
        status_emoji = self._get_approval_status_emoji(cp.last_approval_status)
        cp_type = "🌍 Иностранный" if cp.type.value == "foreign" else "🇷🇺 Российский"
        
        answer = f"## 🏢 Контрагент: {cp.name}\n\n"
        answer += f"**ID:** `{cp.id}`\n"
        answer += f"**Тип:** {cp_type}\n"
        answer += f"**Страна:** {cp.country or 'Не указана'}\n"
        
        if cp.inn:
            answer += f"**ИНН:** {cp.inn}\n"
        if cp.legal_address:
            answer += f"**Юридический адрес:** {cp.legal_address}\n"
        
        answer += f"\n**Статус одобрения:** {status_emoji} {cp.last_approval_status.value}\n"
        
        if cp.last_approval_date:
            answer += f"**Дата одобрения:** {cp.last_approval_date}\n"
        
        # Банки
        if cp.banks:
            answer += f"\n### 🏦 Банковские реквизиты ({len(cp.banks)})\n\n"
            for bank in cp.banks[:3]:  # Показываем первые 3 банка
                answer += f"- **{bank.bank_name or 'Банк'}**"
                if bank.swift_code:
                    answer += f" (SWIFT: {bank.swift_code})"
                if bank.bank_country:
                    answer += f", {bank.bank_country}"
                answer += "\n"
            
            if len(cp.banks) > 3:
                answer += f"  *...и ещё {len(cp.banks) - 3} банков*\n"
        
        return answer
    
    def _format_counterparty_requests(self, requests, total: int) -> str:
        """Форматирование истории запросов контрагента."""
        answer = f"📋 **История запросов** (всего: {total})\n\n"
        answer += "| № | Статус | Сумма | Дата |\n"
        answer += "|---|--------|-------|------|\n"
        
        for req in requests:
            amount_str = self.format_currency(req.amount, req.currency)
            date_str = req.created_at[:10] if req.created_at else "-"
            answer += f"| {req.number or req.id[:8]} | {req.status} | {amount_str} | {date_str} |\n"
        
        if total > len(requests):
            answer += f"\n*Показано {len(requests)} из {total}*"
        
        return answer
    
    def _get_approval_status_emoji(self, status: CounterpartyApprovalStatus) -> str:
        """Эмодзи для статуса одобрения."""
        status_emojis = {
            CounterpartyApprovalStatus.APPROVED: "✅",
            CounterpartyApprovalStatus.REJECTED: "❌",
            CounterpartyApprovalStatus.PENDING: "⏳",
            CounterpartyApprovalStatus.NOT_REVIEWED: "⚪",
            CounterpartyApprovalStatus.UNKNOWN: "❓",
        }
        return status_emojis.get(status, "❓")
    
    # ============================================
    # Error Response Methods
    # ============================================
    
    def _get_not_configured_response(self) -> ChatResponseData:
        """Ответ при отсутствии конфигурации."""
        answer = """⚠️ Интеграция с fea-stage не настроена.

Для работы с контрагентами необходимо:
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
            answer=f"❌ Ошибка при работе с контрагентами: {error_message}",
            context_used=False,
            model="vili-fea-stage"
        )
