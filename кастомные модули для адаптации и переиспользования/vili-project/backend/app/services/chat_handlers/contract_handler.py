"""Contract Handler for Chat Requests.

Handles requests related to fea-stage contracts.
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
    ContractStatus,
    DiadocDocumentStatus,
)
from .base_handler import BaseHandler, ChatResponseData


class ContractHandler(BaseHandler):
    """Обработчик запросов по контрактам (fea-stage).
    
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
        
        if intent == IntentType.LIST_CONTRACTS:
            return await self.handle_list(intent_result)
        elif intent == IntentType.GET_CONTRACT:
            return await self.handle_get(intent_result)
        elif intent == IntentType.GET_CONTRACT_DIADOC_STATUS:
            return await self.handle_diadoc_status(intent_result)
        else:
            return await self.handle_list(intent_result)
    
    async def handle_list(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса списка контрактов."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        try:
            result = await self._client.get_contracts(
                page=1,
                page_size=10,
                is_template=False  # Исключаем шаблоны
            )
            
            if not result.contracts:
                return ChatResponseData(
                    answer="📋 Контракты не найдены.\n\nВозможно, нужно создать новый контракт в системе fea-stage.",
                    context_used=True,
                    model="vili-fea-stage",
                    links={"Создать контракт": "/contract/create"}
                )
            
            answer = self._format_contract_list(result.contracts, result.total)
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={
                    "Все контракты": "/contract",
                    "Создать контракт": "/contract/create"
                },
                embedded_data={
                    "type": "contract_list",
                    "total": result.total,
                    "displayed": len(result.contracts),
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
        """Обработка запроса деталей контракта."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        contract_id = self.get_entity(intent_result, EntityType.CONTRACT_ID)
        contract_number = self.get_entity(intent_result, EntityType.CONTRACT_NUMBER)
        
        if not contract_id and not contract_number:
            return ChatResponseData(
                answer="❓ Укажите ID или номер контракта для получения информации.\n\nПример: `информация о контракте АГ-123`",
                context_used=False,
                model="vili-fea-stage"
            )
        
        try:
            if contract_id:
                contract = await self._client.get_contract(contract_id)
                
                if not contract:
                    return ChatResponseData(
                        answer=f"❌ Контракт с ID `{contract_id}` не найден.",
                        context_used=False,
                        model="vili-fea-stage"
                    )
                
                answer = self._format_contract_details(contract)
                
                return ChatResponseData(
                    answer=answer,
                    context_used=True,
                    model="vili-fea-stage",
                    links={
                        "Карточка контракта": f"/contract/{contract_id}",
                        "Статус Diadoc": f"/contract/{contract_id}/diadoc-status"
                    },
                    embedded_data={
                        "type": "contract_details",
                        "contract_id": contract_id
                    }
                )
            
            # Поиск по номеру - получаем список и ищем
            result = await self._client.get_contracts(page_size=20)
            
            matching = [c for c in result.contracts 
                       if c.number and contract_number.lower() in c.number.lower()]
            
            if not matching:
                return ChatResponseData(
                    answer=f"❌ Контракт с номером '{contract_number}' не найден.",
                    context_used=False,
                    model="vili-fea-stage"
                )
            
            if len(matching) == 1:
                contract = matching[0]
                answer = self._format_contract_details(contract)
                
                return ChatResponseData(
                    answer=answer,
                    context_used=True,
                    model="vili-fea-stage",
                    links={
                        "Карточка контракта": f"/contract/{contract.id}",
                        "Статус Diadoc": f"/contract/{contract.id}/diadoc-status"
                    }
                )
            
            # Несколько совпадений
            answer = f"🔍 Найдено несколько контрактов по запросу '{contract_number}':\n\n"
            answer += self._format_contract_list(matching, len(matching))
            answer += "\n\nУточните номер или используйте ID контракта."
            
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
    
    async def handle_diadoc_status(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса статуса контракта в Diadoc."""
        
        if not self.is_configured:
            return self._get_not_configured_response()
        
        contract_id = self.get_entity(intent_result, EntityType.CONTRACT_ID)
        contract_number = self.get_entity(intent_result, EntityType.CONTRACT_NUMBER)
        
        if not contract_id and not contract_number:
            return ChatResponseData(
                answer="❓ Укажите контракт для проверки статуса в Diadoc.\n\nПример: `статус контракта АГ-123 в Diadoc`",
                context_used=False,
                model="vili-fea-stage"
            )
        
        try:
            # Получаем ID контракта если указан номер
            if not contract_id and contract_number:
                result = await self._client.get_contracts(page_size=20)
                matching = [c for c in result.contracts 
                           if c.number and contract_number.lower() in c.number.lower()]
                if matching:
                    contract_id = matching[0].id
                else:
                    return ChatResponseData(
                        answer=f"❌ Контракт '{contract_number}' не найден.",
                        context_used=False,
                        model="vili-fea-stage"
                    )
            
            # Получаем статус в Diadoc
            diadoc_status = await self._client.get_contract_diadoc_status(contract_id)
            
            if not diadoc_status:
                return ChatResponseData(
                    answer=f"📄 Контракт ещё не отправлен в Diadoc.\n\nДля отправки на подписание используйте функцию в карточке контракта.",
                    context_used=True,
                    model="vili-fea-stage",
                    links={"Карточка контракта": f"/contract/{contract_id}"}
                )
            
            answer = self._format_diadoc_status(contract_id, diadoc_status)
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={
                    "Карточка контракта": f"/contract/{contract_id}",
                    "Обновить статус": f"/contract/{contract_id}/diadoc-status"
                },
                embedded_data={
                    "type": "contract_diadoc_status",
                    "contract_id": contract_id,
                    "diadoc_status": diadoc_status.status.value
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
    
    def _format_contract_list(self, contracts, total: int) -> str:
        """Форматирование списка контрактов."""
        answer = f"📋 **Контракты** (всего: {total})\n\n"
        answer += "| Номер | Название | Статус | Diadoc |\n"
        answer += "|-------|----------|--------|--------|\n"
        
        for c in contracts:
            status_emoji = self._get_status_emoji(c.status)
            diadoc_emoji = self._get_diadoc_status_emoji(c.diadoc_status) if c.diadoc_status else "➖"
            name = (c.name or c.contract_type or "-")[:25]
            number = c.number or c.id[:8]
            answer += f"| {number} | {name} | {status_emoji} | {diadoc_emoji} |\n"
        
        if total > len(contracts):
            answer += f"\n*Показано {len(contracts)} из {total}*"
        
        return answer
    
    def _format_contract_details(self, contract) -> str:
        """Форматирование деталей контракта."""
        status_emoji = self._get_status_emoji(contract.status)
        
        answer = f"## 📄 Контракт: {contract.number or contract.id[:8]}\n\n"
        answer += f"**ID:** `{contract.id}`\n"
        
        if contract.name:
            answer += f"**Название:** {contract.name}\n"
        if contract.contract_type:
            answer += f"**Тип:** {contract.contract_type}\n"
        
        answer += f"**Статус:** {status_emoji} {contract.status.value}\n"
        
        if contract.is_template:
            answer += f"**Шаблон:** Да\n"
        
        # Diadoc статус
        if contract.diadoc_status:
            diadoc_emoji = self._get_diadoc_status_emoji(contract.diadoc_status)
            answer += f"\n### 📨 Статус в Diadoc\n"
            answer += f"**Статус:** {diadoc_emoji} {contract.diadoc_status.value}\n"
            
            if contract.diadoc_document_id:
                answer += f"**Document ID:** `{contract.diadoc_document_id}`\n"
        else:
            answer += f"\n*Контракт не отправлен в Diadoc*\n"
        
        if contract.created_at:
            answer += f"\n**Создан:** {contract.created_at[:10]}\n"
        
        return answer
    
    def _format_diadoc_status(self, contract_id: str, diadoc_status) -> str:
        """Форматирование статуса Diadoc."""
        status_emoji = self._get_diadoc_status_emoji(diadoc_status.status)
        
        answer = f"## 📨 Статус контракта в Diadoc\n\n"
        answer += f"**Статус:** {status_emoji} {diadoc_status.status.value}\n"
        
        status_descriptions = {
            DiadocDocumentStatus.DRAFT: "Документ создан, но ещё не отправлен",
            DiadocDocumentStatus.SENT: "Документ отправлен на подписание",
            DiadocDocumentStatus.DELIVERED: "Документ доставлен получателю",
            DiadocDocumentStatus.SIGNED: "✅ Документ подписан всеми сторонами",
            DiadocDocumentStatus.REJECTED: "❌ Документ отклонён",
            DiadocDocumentStatus.REVOKED: "Документ отозван",
        }
        
        description = status_descriptions.get(diadoc_status.status, "")
        if description:
            answer += f"\n{description}\n"
        
        if diadoc_status.document_id:
            answer += f"\n**Document ID:** `{diadoc_status.document_id}`\n"
        if diadoc_status.message_id:
            answer += f"**Message ID:** `{diadoc_status.message_id}`\n"
        
        return answer
    
    def _get_status_emoji(self, status: ContractStatus) -> str:
        """Эмодзи для статуса контракта."""
        status_emojis = {
            ContractStatus.DRAFT: "📝",
            ContractStatus.ACTIVE: "✅",
            ContractStatus.SIGNED: "✍️",
            ContractStatus.EXPIRED: "⏰",
            ContractStatus.CANCELLED: "❌",
            ContractStatus.UNKNOWN: "❓",
        }
        return status_emojis.get(status, "❓")
    
    def _get_diadoc_status_emoji(self, status: DiadocDocumentStatus) -> str:
        """Эмодзи для статуса Diadoc."""
        status_emojis = {
            DiadocDocumentStatus.DRAFT: "📝",
            DiadocDocumentStatus.SENT: "📤",
            DiadocDocumentStatus.DELIVERED: "📬",
            DiadocDocumentStatus.SIGNED: "✅",
            DiadocDocumentStatus.REJECTED: "❌",
            DiadocDocumentStatus.REVOKED: "🔙",
            DiadocDocumentStatus.UNKNOWN: "❓",
        }
        return status_emojis.get(status, "❓")
    
    # ============================================
    # Error Response Methods
    # ============================================
    
    def _get_not_configured_response(self) -> ChatResponseData:
        """Ответ при отсутствии конфигурации."""
        answer = """⚠️ Интеграция с fea-stage не настроена.

Для работы с контрактами необходимо:
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
            answer=f"❌ Ошибка при работе с контрактами: {error_message}",
            context_used=False,
            model="vili-fea-stage"
        )
