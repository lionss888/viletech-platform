"""Form Payment Handler for Chat Requests.

Handles requests related to fea-stage form payments.
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
    FormPaymentStatus,
)
from .base_handler import BaseHandler, ChatResponseData


class FormPaymentHandler(BaseHandler):
    """Обработчик запросов по заявкам на платежи (fea-stage).
    
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
        
        if intent == IntentType.LIST_FORM_PAYMENTS:
            return await self.handle_list(intent_result)
        elif intent == IntentType.GET_FORM_PAYMENT_STATUS:
            return await self.handle_status(intent_result)
        elif intent == IntentType.CREATE_FORM_PAYMENT:
            return await self.handle_create(intent_result)
        else:
            return await self.handle_list(intent_result)
    
    async def handle_list(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса списка заявок."""
        status_filter = self.get_entity(intent_result, EntityType.FORM_PAYMENT_STATUS)
        
        if not self.is_configured:
            return self._get_not_configured_response(
                action="список заявок",
                requested_filter=status_filter
            )
        
        try:
            # Преобразуем фильтр статуса
            status_enum = None
            if status_filter:
                try:
                    status_enum = FormPaymentStatus(status_filter.lower())
                except ValueError:
                    pass
            
            result = await self._client.get_form_payments(status=status_enum, page=1, page_size=20)
            
            if not result.payments:
                answer = f"""📋 **Заявки на платежи**

Заявок не найдено.

**Фильтр:** {status_filter or "все"}
**Всего записей:** 0
"""
            else:
                payments_text = "\n".join([
                    f"• **#{p.id}** — {p.amount} {p.currency} — статус: `{p.status.value}`"
                    for p in result.payments[:10]
                ])
                
                answer = f"""📋 **Заявки на платежи**

**Фильтр:** {status_filter or "все"}
**Найдено:** {result.total} заявок

{payments_text}
{"..." if result.total > 10 else ""}
"""
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={"Все заявки": "/form-payments"},
                embedded_data={
                    "type": "form_payments_list",
                    "integration_status": "connected",
                    "total": result.total,
                    "payments": [p.model_dump() for p in result.payments[:10]]
                }
            )
            
        except FeaStageAuthError as e:
            return self._get_auth_error_response(str(e), status_filter)
        except FeaStageConnectionError:
            return self._get_error_response("Не удалось подключиться к fea-stage", status_filter)
        except FeaStageError as e:
            return self._get_error_response(str(e), status_filter)
    
    async def handle_status(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса статуса заявки."""
        payment_id = self.get_entity(intent_result, EntityType.FORM_PAYMENT_ID)
        
        if not self.is_configured:
            return self._get_not_configured_response(
                action="статус заявки",
                payment_id=payment_id
            )
        
        if not payment_id:
            return ChatResponseData(
                answer="""📋 **Статус заявки**

⚠️ ID заявки не указан. Пожалуйста, уточните номер заявки.

Пример: "Какой статус у заявки #12345?"
""",
                context_used=False,
                model="vili-fea-stage"
            )
        
        try:
            payment = await self._client.get_form_payment(payment_id)
            
            if not payment:
                return ChatResponseData(
                    answer=f"""📋 **Статус заявки**

❌ Заявка #{payment_id} не найдена.
""",
                    context_used=False,
                    model="vili-fea-stage",
                    embedded_data={"type": "form_payment_status", "payment_id": payment_id, "found": False}
                )
            
            answer = f"""📋 **Статус заявки #{payment.id}**

**Статус:** `{payment.status.value}`
**Сумма:** {payment.amount} {payment.currency}
**Контрагент:** {payment.counterparty or "не указан"}
**Назначение:** {payment.purpose or "не указано"}
**Создана:** {payment.created_at or "н/д"}
"""
            
            return ChatResponseData(
                answer=answer,
                context_used=True,
                model="vili-fea-stage",
                links={"Открыть заявку": f"/form-payments/{payment.id}"},
                embedded_data={
                    "type": "form_payment_status",
                    "payment": payment.model_dump(),
                    "found": True
                }
            )
            
        except FeaStageAuthError as e:
            return self._get_auth_error_response(str(e), payment_id=payment_id)
        except FeaStageConnectionError:
            return self._get_error_response("Не удалось подключиться к fea-stage", payment_id=payment_id)
        except FeaStageError as e:
            return self._get_error_response(str(e), payment_id=payment_id)
    
    async def handle_create(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса создания заявки."""
        if not self.is_configured:
            return self._get_not_configured_response(action="создание заявки")
        
        # Для создания заявки через чат нужны дополнительные данные
        answer = """💳 **Создание заявки на платёж**

✅ Интеграция с fea-stage настроена.

Для создания заявки через чат укажите:
- Сумму (например: "создай заявку на 1000 USD")
- Контрагента
- Назначение платежа

Или используйте форму создания заявки в системе fea-stage.
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=True,
            model="vili-fea-stage",
            links={"Создать заявку": "/form-payments/new"},
            actions=[
                self.create_action(
                    "create", 
                    "Открыть форму создания",
                    data={"entity": "form_payment"}
                )
            ],
            embedded_data={"type": "form_payment_create", "integration_status": "connected"}
        )
    
    def _get_not_configured_response(
        self,
        action: str,
        payment_id: Optional[str] = None,
        requested_filter: Optional[str] = None
    ) -> ChatResponseData:
        """Формирование ответа при отсутствии интеграции."""
        
        details = ""
        if payment_id:
            details = f"\n**Запрошенная заявка:** #{payment_id}"
        elif requested_filter:
            details = f"\n**Запрошенный фильтр:** {requested_filter}"
        
        answer = f"""📋 **{action.title()}**

⚠️ Интеграция с fea-stage не настроена.
{details}

**Для настройки интеграции необходимо:**

1. Указать `FEA_STAGE_API_URL` в конфигурации
2. Указать `FEA_STAGE_API_KEY` для аутентификации
3. Перезапустить VILI
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            links={"Документация API": "/api/docs"},
            embedded_data={
                "type": "form_payments",
                "integration_status": "pending_configuration",
                "requested_action": action,
                "payment_id": payment_id,
                "requested_filter": requested_filter
            }
        )
    
    def _get_auth_error_response(
        self,
        error_detail: str = None,
        requested_filter: Optional[str] = None,
        payment_id: Optional[str] = None
    ) -> ChatResponseData:
        """Ответ при ошибке аутентификации."""
        from app.core.config import settings
        
        details = ""
        if payment_id:
            details = f"\n**Запрошенная заявка:** #{payment_id}"
        elif requested_filter:
            details = f"\n**Запрошенный фильтр:** {requested_filter}"
        
        answer = f"""📋 **Заявки на платежи**

❌ Ошибка аутентификации в fea-stage.
{details}

"""
        
        # Проверяем, установлен ли API ключ
        has_api_key = bool(settings.FEA_STAGE_API_KEY and settings.FEA_STAGE_API_KEY.strip())
        has_credentials = bool(
            getattr(settings, 'FEA_STAGE_EMAIL', '') and 
            getattr(settings, 'FEA_STAGE_PASSWORD', '')
        )
        
        # Проверяем, является ли это ошибкой "Account not found"
        is_account_not_found = error_detail and (
            "account not found" in error_detail.lower() or 
            ("404" in error_detail and "not found" in error_detail.lower())
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
        elif is_account_not_found:
            email = getattr(settings, 'FEA_STAGE_EMAIL', '')
            answer += f"⚠️ **Проблема:** Учетная запись не найдена в fea-stage.\n\n"
            answer += f"**Используемый email:** `{email}`\n\n"
            answer += "**Возможные причины:**\n"
            answer += "1. Пользователь с таким email не существует в системе fea-stage\n"
            answer += "2. Email указан неверно\n"
            answer += "3. Пользователь был удален из системы\n\n"
            answer += "**Решение:**\n"
            answer += "1. Проверьте правильность email в настройках\n"
            answer += f"2. Создайте пользователя в системе fea-stage с email `{email}`\n"
            answer += "3. Или используйте существующий email пользователя\n"
            answer += "4. Альтернатива: используйте `FEA_STAGE_API_KEY` вместо email/password\n\n"
        else:
            answer += "**Проблема:** API ключ или учетные данные неверны.\n\n"
            answer += "**Проверьте:**\n"
            if has_api_key:
                answer += f"- `FEA_STAGE_API_KEY` установлен (длина: {len(settings.FEA_STAGE_API_KEY)} символов)\n"
            if has_credentials:
                answer += f"- `FEA_STAGE_EMAIL` установлен: {getattr(settings, 'FEA_STAGE_EMAIL', '')}\n"
            answer += "- Правильность значения API ключа\n"
            answer += "- Правильность email и пароля\n"
            answer += "- Доступность сервера fea-stage\n\n"
        
        if error_detail:
            answer += f"**Детали ошибки:** {error_detail}\n"
        
        answer += "\nОбратитесь к администратору для проверки настроек интеграции."
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payments", "integration_status": "auth_error"}
        )
    
    def _get_error_response(
        self,
        error_message: str,
        requested_filter: Optional[str] = None,
        payment_id: Optional[str] = None
    ) -> ChatResponseData:
        """Формирование ответа при ошибке."""
        
        details = ""
        if payment_id:
            details = f"\n**Запрошенная заявка:** #{payment_id}"
        elif requested_filter:
            details = f"\n**Запрошенный фильтр:** {requested_filter}"
        
        answer = f"""📋 **Заявки на платежи**

❌ {error_message}
{details}
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payments", "integration_status": "error", "error": error_message}
        )
