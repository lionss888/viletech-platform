"""Chat API endpoints for interacting with the AI assistant.

This module provides a universal chat interface with intent detection,
enabling routing to appropriate handlers (analytics, reports, fea-stage).
"""

import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.core.dependencies import get_db, get_current_user
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.core.exceptions import LLMException, RAGException
from app.services.intent_detector import get_intent_detector, IntentDetector
from app.services.intent_log_service import IntentLogService
from app.database.schemas.intent import IntentType, IntentResult, EntityType
from app.database.schemas.intent_log import ResponseType
from app.integrations import (
    get_fea_stage_client,
    FeaStageError,
    FeaStageConnectionError,
    FeaStageNotConfiguredError,
    FeaStageAuthError,
    FormPaymentStatus,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================

class ChatMessage(BaseModel):
    """Chat message from user"""
    message: str
    model: str = "local-llama"
    use_rag: bool = True
    temperature: float = 0.7
    max_tokens: int = 2000


class ChatResponse(BaseModel):
    """Response from assistant (extended with links and actions)"""
    answer: str
    context_used: bool
    model: str
    sources: Optional[List[str]] = None
    # Extended fields
    links: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    embedded_data: Optional[Dict[str, Any]] = None
    intent_type: Optional[str] = None
    processing_time_ms: Optional[int] = None


# ============================================
# Chat Endpoint with Intent Detection
# ============================================

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    chat_message: ChatMessage,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Отправить сообщение AI-ассистенту (универсальный интерфейс).
    
    Автоматически распознаёт тип запроса:
    - Аналитика операторов → возвращает данные с ссылками на дашборд
    - Создание отчётов → генерирует отчёт со ссылкой на скачивание
    - Заявки (fea-stage) → возвращает данные о заявках
    - Обычные вопросы → использует LLM с RAG
    
    Args:
        message: Текст сообщения
        model: Модель LLM для использования
        use_rag: Использовать ли базу знаний
        temperature: Температура генерации (0-1)
        max_tokens: Максимальное количество токенов
    """
    start_time = time.time()
    
    try:
        # Распознаём намерение
        intent_detector = get_intent_detector()
        intent_result = intent_detector.detect_intent(chat_message.message)
        all_matches = intent_detector.get_last_matches()
        
        # Определяем тип ответа
        is_handler = intent_result.intent != IntentType.CHAT
        response_type = ResponseType.HANDLER if is_handler else ResponseType.LLM
        handler_name = f"_handle_{intent_result.intent.value}" if is_handler else "_handle_chat"
        
        # Маршрутизируем запрос
        response = await _route_request(
            intent_result=intent_result,
            chat_message=chat_message,
            db=db
        )
        
        # Добавляем время обработки
        processing_time_ms = int((time.time() - start_time) * 1000)
        response.processing_time_ms = processing_time_ms
        response.intent_type = intent_result.intent.value
        
        # Логируем распознавание (асинхронно, не блокируем ответ)
        try:
            log_service = IntentLogService(db)
            await log_service.log_detection(
                intent_result=intent_result,
                all_matches=all_matches,
                response_type=response_type,
                handler_name=handler_name,
                processing_time_ms=processing_time_ms,
                user_id=current_user.get("id") if isinstance(current_user, dict) else None,
                metadata={
                    "model": chat_message.model,
                    "use_rag": chat_message.use_rag,
                    "context_used": response.context_used
                }
            )
        except Exception as log_error:
            # Ошибка логирования не должна влиять на ответ
            logger.warning(f"Failed to log intent detection: {log_error}")
        
        return response
        
    except LLMException as e:
        raise HTTPException(
            status_code=500,
            detail=f"LLM error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Chat error: {str(e)}"
        )


async def _route_request(
    intent_result: IntentResult,
    chat_message: ChatMessage,
    db: Session
) -> ChatResponse:
    """Маршрутизирует запрос в соответствующий обработчик."""
    
    intent = intent_result.intent
    
    # Обработчики для разных типов запросов
    if intent == IntentType.OPERATOR_ANALYTICS:
        return await _handle_operator_analytics(intent_result, db)
    
    elif intent == IntentType.OPERATOR_LIST:
        return await _handle_operator_list(intent_result, db)
    
    elif intent == IntentType.OPERATOR_COMPARE:
        return await _handle_operator_compare(intent_result, db)
    
    elif intent == IntentType.OPERATOR_STATISTICS:
        return await _handle_operator_statistics(intent_result, db)
    
    elif intent == IntentType.CREATE_REPORT:
        return await _handle_create_report(intent_result, db)
    
    elif intent == IntentType.LIST_FORM_PAYMENTS:
        return await _handle_list_form_payments(intent_result, db)
    
    elif intent == IntentType.GET_FORM_PAYMENT_STATUS:
        return await _handle_form_payment_status(intent_result, db)
    
    elif intent == IntentType.CREATE_FORM_PAYMENT:
        return await _handle_create_form_payment(intent_result, db)
    
    # Контрагенты (fea-stage)
    elif intent in [IntentType.LIST_COUNTERPARTIES, IntentType.GET_COUNTERPARTY, 
                    IntentType.GET_COUNTERPARTY_REQUESTS]:
        return await _handle_counterparty(intent_result, db)
    
    # Контракты (fea-stage)
    elif intent in [IntentType.LIST_CONTRACTS, IntentType.GET_CONTRACT,
                    IntentType.GET_CONTRACT_DIADOC_STATUS]:
        return await _handle_contract(intent_result, db)
    
    # Валюты (fea-stage)
    elif intent in [IntentType.GET_CURRENCY_RATES, IntentType.GET_CURRENCY_BY_SYMBOL]:
        return await _handle_currency(intent_result, db)
    
    # Управление проектами (бизнес-методология)
    elif intent == IntentType.PROJECT_MANAGEMENT:
        return await _handle_project_management(intent_result, chat_message, db)
    
    else:
        # Fallback: обычный чат с LLM
        return await _handle_chat(chat_message, db)


# ============================================
# Intent Handlers
# ============================================

async def _handle_operator_analytics(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов аналитики оператора."""
    from app.services.operator_service import OperatorService, OperatorServiceException
    from app.database.schemas.operator import OperatorAnalyticsRequest
    from uuid import UUID
    
    # Извлекаем ID или имя оператора
    operator_id = intent_result.get_entity(EntityType.OPERATOR_ID)
    operator_name = intent_result.get_entity(EntityType.OPERATOR_NAME)
    period_days = intent_result.get_entity(EntityType.PERIOD_DAYS) or 30
    
    service = OperatorService(db)
    
    # Если указано имя, ищем оператора
    if operator_name and not operator_id:
        operators_list = await service.get_operators_list()
        for op in operators_list.operators:
            if operator_name.lower() in op.full_name.lower():
                operator_id = str(op.id)
                break
    
    # Если ID найден, получаем аналитику
    if operator_id:
        try:
            request = OperatorAnalyticsRequest(
                operator_id=UUID(operator_id),
                period_days=period_days,
                include_forecast=True,
                include_recommendations=True,
                use_rag=True
            )
            analytics = await service.get_operator_analytics(request)
            
            # Формируем ответ
            answer = f"""📊 **Аналитика оператора: {analytics.profile.full_name}**

**Основные метрики (за {period_days} дней):**
- Обработано заявок: {analytics.metrics.applications_processed}
- Success Rate: {analytics.metrics.success_rate:.1%}
- Compliance Score: {analytics.compliance_score.overall_score:.1%}
- Среднее время обработки: {analytics.metrics.avg_processing_time_min:.1f} мин

**Compliance (115-ФЗ):**
- Detection Rate: {analytics.compliance_score.detection_rate:.1%}
- False Negative Rate: {analytics.compliance_score.false_negative_rate:.1%}
- Red Flags выявлено: {analytics.metrics.red_flags_detected}

**Прогноз:** {analytics.forecast.trend if analytics.forecast else "N/A"}

**Рекомендации:**
{chr(10).join(f"- {r.title}" for r in analytics.recommendations[:3]) if analytics.recommendations else "- Нет рекомендаций"}
"""
            
            return ChatResponse(
                answer=answer,
                context_used=True,
                model="vili-analytics",
                links={
                    "Детальная аналитика": f"/operators/#operator-{operator_id}",
                    "Дашборд операторов": "/operators/"
                },
                embedded_data={
                    "type": "operator_analytics",
                    "operator_id": operator_id,
                    "operator_name": analytics.profile.full_name,
                    "compliance_score": analytics.compliance_score.overall_score,
                    "success_rate": analytics.metrics.success_rate
                }
            )
        except OperatorServiceException as e:
            return ChatResponse(
                answer=f"❌ Оператор не найден: {str(e)}",
                context_used=False,
                model="vili-analytics",
                links={"Список операторов": "/operators/"}
            )
    else:
        # Если оператор не указан, предлагаем выбрать
        return await _handle_operator_list(intent_result, db)


async def _handle_operator_list(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов списка операторов."""
    from app.services.operator_service import OperatorService
    
    service = OperatorService(db)
    operators_list = await service.get_operators_list()
    
    # Формируем ответ
    operators_text = "\n".join([
        f"- **{op.full_name}** ({op.level.value}): "
        f"Compliance {op.compliance_score:.1%}, "
        f"Success {op.success_rate:.1%}"
        for op in operators_list.operators[:10]
    ])
    
    answer = f"""👥 **Список операторов отдела ВЭД**

Всего операторов: {operators_list.total}

**Статистика команды:**
- Средний Success Rate: {operators_list.team_stats.get('avg_success_rate', 0):.1%}
- Средний Compliance Score: {operators_list.team_stats.get('avg_compliance_score', 0):.1%}

**Операторы:**
{operators_text}
"""
    
    return ChatResponse(
        answer=answer,
        context_used=True,
        model="vili-analytics",
        links={"Дашборд операторов": "/operators/"},
        actions=[
            {"type": "link", "label": "Открыть дашборд", "url": "/operators/"}
        ],
        embedded_data={
            "type": "operator_list",
            "total": operators_list.total,
            "operators": [
                {"id": str(op.id), "name": op.full_name, "level": op.level.value}
                for op in operators_list.operators[:10]
            ]
        }
    )


async def _handle_operator_compare(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов сравнения операторов."""
    from app.services.operator_service import OperatorService
    
    service = OperatorService(db)
    operators_list = await service.get_operators_list()
    
    # Сортируем по compliance score
    sorted_ops = sorted(
        operators_list.operators, 
        key=lambda x: x.compliance_score, 
        reverse=True
    )
    
    answer = """📊 **Сравнение операторов по Compliance Score**

**Топ операторов:**
"""
    for i, op in enumerate(sorted_ops[:5], 1):
        answer += f"{i}. **{op.full_name}** ({op.level.value}): {op.compliance_score:.1%}\n"
    
    answer += """
Для детального сравнения укажите ID операторов или используйте дашборд.
"""
    
    return ChatResponse(
        answer=answer,
        context_used=True,
        model="vili-analytics",
        links={"Дашборд операторов": "/operators/"},
        actions=[
            {"type": "compare", "label": "Сравнить в дашборде", "url": "/operators/"}
        ]
    )


async def _handle_operator_statistics(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов статистики команды."""
    from app.services.operator_service import OperatorService
    
    service = OperatorService(db)
    operators_list = await service.get_operators_list()
    
    # Подсчёт по уровням
    by_level = {}
    for op in operators_list.operators:
        level = op.level.value
        by_level[level] = by_level.get(level, 0) + 1
    
    answer = f"""📈 **Статистика команды операторов ВЭД**

**Общие показатели:**
- Всего операторов: {operators_list.total}
- Средний Success Rate: {operators_list.team_stats.get('avg_success_rate', 0):.1%}
- Средний Compliance Score: {operators_list.team_stats.get('avg_compliance_score', 0):.1%}

**Распределение по уровням:**
{chr(10).join(f"- {level}: {count}" for level, count in by_level.items())}

**Требуют внимания (Compliance < 85%):**
{chr(10).join(f"- {op.full_name}: {op.compliance_score:.1%}" for op in operators_list.operators if op.compliance_score < 0.85) or "- Нет"}
"""
    
    return ChatResponse(
        answer=answer,
        context_used=True,
        model="vili-analytics",
        links={"Дашборд операторов": "/operators/"}
    )


async def _handle_create_report(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов создания отчётов."""
    from app.services.operator_service import OperatorService
    
    report_type = intent_result.get_entity(EntityType.REPORT_TYPE) or "operators"
    
    service = OperatorService(db)
    operators_list = await service.get_operators_list()
    
    # Генерируем отчёт (упрощённая версия)
    answer = f"""📄 **Отчёт по операторам создан**

**Тип отчёта:** {report_type}
**Дата:** {time.strftime('%Y-%m-%d %H:%M')}

**Сводка:**
- Всего операторов: {operators_list.total}
- Средний Compliance: {operators_list.team_stats.get('avg_compliance_score', 0):.1%}
- Средний Success Rate: {operators_list.team_stats.get('avg_success_rate', 0):.1%}

Полный отчёт доступен в дашборде.
"""
    
    return ChatResponse(
        answer=answer,
        context_used=True,
        model="vili-reports",
        links={
            "Дашборд операторов": "/operators/",
            "API документация": "/api/docs"
        },
        actions=[
            {"type": "download", "label": "Скачать JSON", "url": "/api/v1/operators"}
        ]
    )


async def _handle_list_form_payments(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов списка заявок (fea-stage)."""
    status_filter = intent_result.get_entity(EntityType.FORM_PAYMENT_STATUS)
    
    client = get_fea_stage_client()
    
    # Проверяем конфигурацию
    if not client.is_configured:
        answer = f"""📋 **Заявки на платежи**

⚠️ Интеграция с fea-stage не настроена.

Для работы с заявками необходимо:
1. Указать `FEA_STAGE_API_URL` в конфигурации
2. Указать `FEA_STAGE_API_KEY` для аутентификации
3. Перезапустить VILI

**Запрошенный фильтр:** {status_filter or "все"}
"""
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            links={"Документация интеграции": "/api/docs"},
            embedded_data={
                "type": "form_payments_list",
                "integration_status": "not_configured",
                "requested_filter": status_filter
            }
        )
    
    # Пытаемся получить данные из fea-stage
    try:
        # Преобразуем фильтр статуса
        status_enum = None
        if status_filter:
            try:
                status_enum = FormPaymentStatus(status_filter.lower())
            except ValueError:
                pass
        
        result = await client.get_form_payments(status=status_enum, page=1, page_size=20)
        
        if not result.payments:
            answer = f"""📋 **Заявки на платежи**

Заявок не найдено.

**Фильтр:** {status_filter or "все"}
**Всего записей:** 0
"""
        else:
            # Формируем список заявок
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
        
        return ChatResponse(
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
        from app.core.config import settings
        
        has_api_key = bool(settings.FEA_STAGE_API_KEY and settings.FEA_STAGE_API_KEY.strip())
        has_credentials = bool(
            getattr(settings, 'FEA_STAGE_EMAIL', '') and 
            getattr(settings, 'FEA_STAGE_PASSWORD', '')
        )
        
        error_msg = str(e)
        is_account_not_found = "account not found" in error_msg.lower() or ("404" in error_msg and "not found" in error_msg.lower())
        is_incorrect_password = "incorrect password" in error_msg.lower() or ("400" in error_msg and "password" in error_msg.lower())
        
        answer = f"""📋 **Заявки на платежи**

❌ Ошибка аутентификации в fea-stage.

**Запрошенный фильтр:** {status_filter or "все"}

"""
        if not has_api_key and not has_credentials:
            answer += "⚠️ **Проблема:** Не настроена аутентификация.\n\n"
            answer += "**Решение:**\n"
            answer += "1. Установите `FEA_STAGE_API_KEY` в переменных окружения\n"
            answer += "2. Или установите `FEA_STAGE_EMAIL` и `FEA_STAGE_PASSWORD`\n"
        elif is_incorrect_password:
            email = getattr(settings, 'FEA_STAGE_EMAIL', '')
            answer += f"⚠️ **Проблема:** Неверный пароль для пользователя.\n\n"
            answer += f"**Используемый email:** `{email}`\n\n"
            answer += "**Возможные причины:**\n"
            answer += "1. Пароль указан неверно в настройках `FEA_STAGE_PASSWORD`\n"
            answer += "2. Пароль был изменен в системе fea-stage\n"
            answer += "3. Пароль содержит специальные символы, которые требуют экранирования\n\n"
            answer += "**Решение:**\n"
            answer += "1. Проверьте правильность пароля в переменной окружения `FEA_STAGE_PASSWORD`\n"
            answer += "2. Убедитесь, что пароль соответствует паролю пользователя в fea-stage\n"
            answer += "3. Если пароль был изменен в fea-stage, обновите `FEA_STAGE_PASSWORD`\n"
            answer += "4. Альтернатива: используйте `FEA_STAGE_API_KEY` вместо email/password\n\n"
            answer += "**Примечание:** Это не проблема с ролью пользователя. Если бы проблема была в роли, "
            answer += "вы получили бы ошибку 403 (Forbidden) после успешной аутентификации.\n"
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
            answer += "4. Альтернатива: используйте `FEA_STAGE_API_KEY` вместо email/password\n"
        else:
            answer += "**Проблема:** API ключ или учетные данные неверны.\n\n"
            answer += "**Проверьте:**\n"
            if has_api_key:
                answer += f"- `FEA_STAGE_API_KEY` установлен (длина: {len(settings.FEA_STAGE_API_KEY)} символов)\n"
            if has_credentials:
                answer += f"- `FEA_STAGE_EMAIL` установлен: {getattr(settings, 'FEA_STAGE_EMAIL', '')}\n"
            answer += "- Правильность значения API ключа\n"
            answer += "- Правильность email и пароля\n"
            answer += "- Доступность сервера fea-stage\n"
        
        if error_msg:
            answer += f"\n**Детали ошибки:** {error_msg}\n"
        
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payments_list", "integration_status": "auth_error"}
        )
        
    except FeaStageConnectionError as e:
        from app.core.config import settings
        api_url = settings.FEA_STAGE_API_URL or "(не установлен)"
        
        answer = f"""📋 **Заявки на платежи**

❌ Не удалось подключиться к fea-stage.

**Текущий адрес:** `{api_url}`

**Возможные причины:**
1. Сервер fea-stage не запущен
2. Неверный адрес в `FEA_STAGE_API_URL`
3. Проблемы с сетью или файрволом
4. Если используете Docker, проверьте доступность через `host.docker.internal`

**Проверьте:**
- Запущен ли сервер fea-stage на порту 30000
- Доступность: `curl {api_url}/health` или `curl http://localhost:30000/api/1.0/health`
- Настройки в `docker-compose.yml` или переменные окружения

**Запрошенный фильтр:** {status_filter or "все"}
"""
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payments_list", "integration_status": "connection_error"}
        )
        
    except FeaStageError as e:
        from app.core.config import settings
        error_msg = str(e)
        api_url = settings.FEA_STAGE_API_URL or "(не установлен)"
        
        # Проверяем, является ли это серверной ошибкой
        is_server_error = "server error" in error_msg.lower() or "500" in error_msg
        
        answer = f"""📋 **Заявки на платежи**

❌ Ошибка при получении данных из fea-stage: {error_msg}

**Запрошенный фильтр:** {status_filter or "все"}
"""
        
        if is_server_error:
            answer += f"""
⚠️ **Это серверная ошибка на стороне fea-stage, а не проблема аутентификации.**

**Возможные причины:**
1. Временная недоступность сервера fea-stage
2. Проблемы с базой данных на стороне fea-stage
3. Внутренняя ошибка в API fea-stage

**Проверьте:**
- Доступность сервера: `curl {api_url}/health`
- Логи сервера fea-stage
- Статус сервиса fea-stage
"""
        else:
            answer += f"""
**Проверьте:**
- Доступность сервера fea-stage: `{api_url}`
- Правильность конфигурации
"""
        
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payments_list", "integration_status": "error"}
        )


async def _handle_form_payment_status(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов статуса заявки."""
    payment_id = intent_result.get_entity(EntityType.FORM_PAYMENT_ID)
    
    client = get_fea_stage_client()
    
    if not client.is_configured:
        answer = f"""📋 **Статус заявки**

⚠️ Интеграция с fea-stage не настроена.

**Запрошенная заявка:** #{payment_id or "не указано"}
"""
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payment_status", "integration_status": "not_configured"}
        )
    
    if not payment_id:
        answer = """📋 **Статус заявки**

⚠️ ID заявки не указан. Пожалуйста, уточните номер заявки.

Пример: "Какой статус у заявки #12345?"
"""
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage"
        )
    
    try:
        payment = await client.get_form_payment(payment_id)
        
        if not payment:
            answer = f"""📋 **Статус заявки**

❌ Заявка #{payment_id} не найдена.
"""
            return ChatResponse(
                answer=answer,
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
        
        return ChatResponse(
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
        from app.core.config import settings
        
        has_api_key = bool(settings.FEA_STAGE_API_KEY and settings.FEA_STAGE_API_KEY.strip())
        has_credentials = bool(
            getattr(settings, 'FEA_STAGE_EMAIL', '') and 
            getattr(settings, 'FEA_STAGE_PASSWORD', '')
        )
        
        answer = f"""📋 **Статус заявки**

❌ Ошибка аутентификации в fea-stage.

**Запрошенная заявка:** #{payment_id}

"""
        if not has_api_key and not has_credentials:
            answer += "⚠️ **Проблема:** Не настроена аутентификация.\n\n"
            answer += "**Решение:** Установите `FEA_STAGE_API_KEY` или `FEA_STAGE_EMAIL` + `FEA_STAGE_PASSWORD`\n"
        else:
            answer += "**Проблема:** API ключ или учетные данные неверны.\n"
            answer += "Проверьте правильность `FEA_STAGE_API_KEY`.\n"
        
        if str(e):
            answer += f"\n**Детали ошибки:** {str(e)}\n"
        
        return ChatResponse(answer=answer, context_used=False, model="vili-fea-stage")
        
    except FeaStageConnectionError:
        from app.core.config import settings
        api_url = settings.FEA_STAGE_API_URL or "(не установлен)"
        
        answer = f"""📋 **Статус заявки**

❌ Не удалось подключиться к fea-stage.

**Текущий адрес:** `{api_url}`

**Возможные причины:**
1. Сервер fea-stage не запущен
2. Неверный адрес в `FEA_STAGE_API_URL`
3. Проблемы с сетью или файрволом

**Запрошенная заявка:** #{payment_id}
"""
        return ChatResponse(answer=answer, context_used=False, model="vili-fea-stage")
        
    except FeaStageError as e:
        answer = f"""📋 **Статус заявки**

❌ Ошибка: {str(e)}

**Запрошенная заявка:** #{payment_id}
"""
        return ChatResponse(answer=answer, context_used=False, model="vili-fea-stage")


async def _handle_create_form_payment(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов создания заявки."""
    client = get_fea_stage_client()
    
    if not client.is_configured:
        answer = """💳 **Создание заявки на платёж**

⚠️ Интеграция с fea-stage не настроена.

Для работы необходимо настроить переменные окружения:
- `FEA_STAGE_API_URL`
- `FEA_STAGE_API_KEY`
"""
        return ChatResponse(
            answer=answer,
            context_used=False,
            model="vili-fea-stage",
            embedded_data={"type": "form_payment_create", "integration_status": "not_configured"}
        )
    
    # Для создания заявки через чат нужны дополнительные данные
    # Пока направляем на форму создания
    answer = """💳 **Создание заявки на платёж**

✅ Интеграция с fea-stage настроена.

Для создания заявки через чат укажите:
- Сумму (например: "создай заявку на 1000 USD")
- Контрагента
- Назначение платежа

Или используйте форму создания заявки в системе fea-stage.
"""
    
    return ChatResponse(
        answer=answer,
        context_used=True,
        model="vili-fea-stage",
        links={"Создать заявку": "/form-payments/new"},
        actions=[
            {"type": "create", "label": "Открыть форму создания", "data": {"entity": "form_payment"}}
        ],
        embedded_data={"type": "form_payment_create", "integration_status": "connected"}
    )


async def _handle_project_management(
    intent_result: IntentResult,
    chat_message: ChatMessage,
    db: Session
) -> ChatResponse:
    """Обработчик запросов по управлению проектами (бизнес-методология)."""
    llm_service = LLMService()
    rag_service = RAGService(db)
    
    # Извлекаем фазу проекта если указана
    project_phase = intent_result.get_entity(EntityType.PROJECT_PHASE)
    
    # Получаем контекст из базы знаний с фильтром по категории
    context = ""
    sources = []
    
    try:
        # Ищем в категории project_management
        search_results = await rag_service.search_knowledge(
            query=chat_message.message,
            top_k=5,
            min_similarity=0.5,
            category="project_management"
        )
        
        # Если не нашли в категории, ищем по всей базе
        if not search_results:
            search_results = await rag_service.search_knowledge(
                query=chat_message.message,
                top_k=3,
                min_similarity=0.5
            )
        
        if search_results:
            context_parts = []
            for result in search_results:
                context_parts.append(result['content'])
                if 'source_name' in result:
                    sources.append(result['source_name'])
            
            context = "\n\n".join(context_parts)
    except Exception as e:
        logger.warning(f"RAG search failed for project management: {e}")
    
    # Специализированный системный промпт для управления проектами
    system_prompt = """Ты — VILI, эксперт по управлению проектами и бизнес-методологиям.

Твои возможности:
- Консультирование по методологиям управления проектами (Agile, Scrum, Waterfall, Kanban)
- Помощь с планированием проектов (WBS, Gantt, критический путь)
- Рекомендации по фазам проекта: инициация, планирование, исполнение, мониторинг, завершение
- Анализ рисков проекта и стратегии их митигации
- Работа со стейкхолдерами и управление ожиданиями
- Бюджетирование и управление ресурсами

При ответе:
1. Структурируй рекомендации по этапам жизненного цикла проекта
2. Предлагай конкретные инструменты и шаблоны
3. Учитывай контекст из базы знаний компании
4. Давай практические, применимые советы

Используй предоставленный контекст из базы знаний для точных ответов."""

    # Формируем промпт с контекстом
    phase_context = f"\nФаза проекта: {project_phase}" if project_phase else ""
    
    if context:
        prompt = f"""Контекст из базы знаний по управлению проектами:
{context}
{phase_context}
---

Вопрос пользователя: {chat_message.message}

Ответь на вопрос, используя контекст выше и свои знания по управлению проектами."""
    else:
        prompt = f"""{phase_context}
Вопрос пользователя: {chat_message.message}

Ответь на вопрос, используя свои знания по управлению проектами."""
    
    # Генерируем ответ
    response = await llm_service.complete(
        prompt=prompt,
        model=chat_message.model,
        system_prompt=system_prompt,
        temperature=chat_message.temperature,
        max_tokens=chat_message.max_tokens
    )
    
    return ChatResponse(
        answer=response['content'],
        context_used=bool(context),
        model=response.get('model', chat_message.model),
        sources=list(set(sources)) if sources else None,
        links={
            "База знаний": "/knowledge",
        } if context else None,
        embedded_data={
            "type": "project_management",
            "phase": project_phase,
            "knowledge_used": bool(context)
        }
    )


async def _handle_chat(
    chat_message: ChatMessage,
    db: Session
) -> ChatResponse:
    """Обработчик обычных чат-запросов (LLM + RAG)."""
    llm_service = LLMService()
    rag_service = RAGService(db) if chat_message.use_rag else None
    
    # Определяем, является ли запрос вопросом по ВЭД
    ved_keywords = [
        "вэд", "внешнеэкономическая", "внешнеэкономической", "внешнеэкономические",
        "таможня", "таможенный", "таможенная", "таможенные",
        "экспорт", "импорт", "экспортно", "импортно",
        "внешнеторговая", "внешнеторговый", "внешнеторговые",
        "валютное регулирование", "валютный контроль",
        "декларация", "таможенная декларация",
        "нетарифное регулирование", "тарифное регулирование"
    ]
    
    message_lower = chat_message.message.lower()
    is_ved_query = any(keyword in message_lower for keyword in ved_keywords)
    
    # Получаем контекст из базы знаний
    context = ""
    sources = []
    category_filter = "ved" if is_ved_query else None
    
    if chat_message.use_rag and rag_service:
        logger.debug(f"RAG search: query='{chat_message.message[:50]}...', category={category_filter}, use_rag={chat_message.use_rag}")
        try:
            search_results = await rag_service.search_knowledge(
                query=chat_message.message,
                top_k=5 if is_ved_query else 3,  # Больше результатов для ВЭД-запросов
                min_similarity=0.5,
                category=category_filter  # Фильтруем по категории ВЭД
            )
            
            if search_results:
                context_parts = []
                for result in search_results:
                    context_parts.append(result['content'])
                    if 'source_name' in result:
                        sources.append(result['source_name'])
                
                context = "\n\n".join(context_parts)
                logger.info(f"RAG search found {len(search_results)} results with category={category_filter}")
            else:
                logger.info(f"RAG search found 0 results with category={category_filter}")
            
            # Если ничего не найдено И была указана категория, ищем без категории
            if not search_results and category_filter:
                try:
                    search_results = await rag_service.search_knowledge(
                        query=chat_message.message,
                        top_k=5 if is_ved_query else 3,
                        min_similarity=0.5,
                        category=None  # Убираем фильтр категории
                    )
                    
                    if search_results:
                        context_parts = []
                        for result in search_results:
                            context_parts.append(result['content'])
                            if 'source_name' in result:
                                sources.append(result['source_name'])
                        
                        context = "\n\n".join(context_parts)
                        logger.info(f"RAG fallback search found {len(search_results)} results without category filter")
                except Exception as e:
                    logger.warning(f"RAG fallback search failed: {e}")
        except Exception as e:
            logger.warning(f"RAG search failed: {e}")
    
    # Формируем системный промпт
    system_prompt = """Ты — VILI, AI-ассистент для анализа платежных документов и compliance проверок.

Твои возможности:
- Анализ платежных документов (SWIFT MT, ISO 20022, XML, JSON)
- Compliance проверки (санкции, AML, KYC)
- Оценка рисков транзакций
- Ответы на вопросы о финансовых регуляциях
- Внешнеэкономическая деятельность (ВЭД): методология, таможенное регулирование, валютный контроль
- Аналитика операторов (используй команды: "покажи аналитику оператора", "список операторов")

Отвечай четко, профессионально и по делу. Если не уверен, так и скажи.
Используй предоставленный контекст из базы знаний для точных ответов."""
    
    # Формируем промпт с контекстом
    if context:
        prompt = f"""Контекст из базы знаний:
{context}

---

Вопрос пользователя: {chat_message.message}

Ответь на вопрос, используя контекст выше. Если информации недостаточно, используй свои знания."""
    else:
        prompt = chat_message.message
    
    # Генерируем ответ
    response = await llm_service.complete(
        prompt=prompt,
        model=chat_message.model,
        system_prompt=system_prompt,
        temperature=chat_message.temperature,
        max_tokens=chat_message.max_tokens
    )
    
    return ChatResponse(
        answer=response['content'],
        context_used=bool(context),
        model=response.get('model', chat_message.model),
        sources=list(set(sources)) if sources else None
    )


# ============================================
# FEA-Stage Extended Handlers
# ============================================

async def _handle_counterparty(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов по контрагентам (fea-stage)."""
    from app.services.chat_handlers import CounterpartyHandler
    
    handler = CounterpartyHandler(db)
    result = await handler.handle(intent_result)
    
    return ChatResponse(
        answer=result.answer,
        context_used=result.context_used,
        model=result.model,
        sources=result.sources,
        links=result.links,
        actions=result.actions,
        embedded_data=result.embedded_data
    )


async def _handle_contract(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов по контрактам (fea-stage)."""
    from app.services.chat_handlers import ContractHandler
    
    handler = ContractHandler(db)
    result = await handler.handle(intent_result)
    
    return ChatResponse(
        answer=result.answer,
        context_used=result.context_used,
        model=result.model,
        sources=result.sources,
        links=result.links,
        actions=result.actions,
        embedded_data=result.embedded_data
    )


async def _handle_currency(
    intent_result: IntentResult,
    db: Session
) -> ChatResponse:
    """Обработчик запросов по курсам валют (fea-stage)."""
    from app.services.chat_handlers import CurrencyHandler
    
    handler = CurrencyHandler(db)
    result = await handler.handle(intent_result)
    
    return ChatResponse(
        answer=result.answer,
        context_used=result.context_used,
        model=result.model,
        sources=result.sources,
        links=result.links,
        actions=result.actions,
        embedded_data=result.embedded_data
    )


# ============================================
# Additional Endpoints
# ============================================

@router.get("/models")
async def list_available_models():
    """Получить список доступных моделей"""
    return {
        "models": [
            {
                "id": "local-llama",
                "name": "Llama 3.2",
                "type": "local",
                "description": "Локальная модель Llama 3.2"
            },
            {
                "id": "local-qwen",
                "name": "Qwen 2.5 7B",
                "type": "local",
                "description": "Локальная модель Qwen 2.5 7B"
            },
            {
                "id": "local-mistral",
                "name": "Mistral",
                "type": "local",
                "description": "Локальная модель Mistral"
            },
            {
                "id": "fingpt-sentiment",
                "name": "FinGPT Sentiment",
                "type": "specialized",
                "description": "Специализированная финансовая модель"
            },
            {
                "id": "vili-analytics",
                "name": "VILI Analytics",
                "type": "internal",
                "description": "Встроенный модуль аналитики"
            }
        ]
    }


@router.get("/intents")
async def list_supported_intents():
    """Получить список поддерживаемых типов запросов"""
    return {
        "intents": [
            # Операторы
            {
                "type": IntentType.OPERATOR_ANALYTICS.value,
                "description": "Аналитика оператора",
                "examples": ["Покажи аналитику оператора Иванова", "Метрики оператора за месяц"]
            },
            {
                "type": IntentType.OPERATOR_LIST.value,
                "description": "Список операторов",
                "examples": ["Покажи всех операторов", "Список операторов отдела"]
            },
            {
                "type": IntentType.OPERATOR_COMPARE.value,
                "description": "Сравнение операторов",
                "examples": ["Сравни операторов по compliance", "Рейтинг операторов"]
            },
            # Отчёты
            {
                "type": IntentType.CREATE_REPORT.value,
                "description": "Создание отчёта",
                "examples": ["Создай отчёт по операторам", "Сформируй отчёт за месяц"]
            },
            # Заявки
            {
                "type": IntentType.LIST_FORM_PAYMENTS.value,
                "description": "Список заявок",
                "examples": ["Покажи активные заявки", "Все заявки на платёж"]
            },
            {
                "type": IntentType.CREATE_FORM_PAYMENT.value,
                "description": "Создание заявки",
                "examples": ["Создай заявку на платёж", "Оформи новую заявку"]
            },
            # Контрагенты
            {
                "type": IntentType.LIST_COUNTERPARTIES.value,
                "description": "Список контрагентов",
                "examples": ["Покажи список контрагентов", "Мои контрагенты"]
            },
            {
                "type": IntentType.GET_COUNTERPARTY.value,
                "description": "Информация о контрагенте",
                "examples": ["Информация о контрагенте ABC Trading", "Детали контрагента"]
            },
            {
                "type": IntentType.GET_COUNTERPARTY_REQUESTS.value,
                "description": "История запросов контрагента",
                "examples": ["История запросов контрагента ABC", "Заявки контрагента"]
            },
            # Контракты
            {
                "type": IntentType.LIST_CONTRACTS.value,
                "description": "Список контрактов",
                "examples": ["Покажи мои контракты", "Список договоров"]
            },
            {
                "type": IntentType.GET_CONTRACT.value,
                "description": "Информация о контракте",
                "examples": ["Информация о контракте АГ-123", "Детали договора"]
            },
            {
                "type": IntentType.GET_CONTRACT_DIADOC_STATUS.value,
                "description": "Статус контракта в Diadoc",
                "examples": ["Статус контракта в Diadoc", "Подписан ли договор?"]
            },
            # Валюты
            {
                "type": IntentType.GET_CURRENCY_RATES.value,
                "description": "Курсы валют",
                "examples": ["Курсы валют", "Покажи курсы"]
            },
            {
                "type": IntentType.GET_CURRENCY_BY_SYMBOL.value,
                "description": "Курс конкретной валюты",
                "examples": ["Курс доллара", "Сколько стоит евро?"]
            },
            # Управление проектами
            {
                "type": IntentType.PROJECT_MANAGEMENT.value,
                "description": "Управление проектами",
                "examples": ["Как спланировать проект?", "Что такое Scrum?", "Методология Agile"]
            },
            # Чат
            {
                "type": IntentType.CHAT.value,
                "description": "Обычный чат",
                "examples": ["Что такое FATF?", "Как проверить санкции?"]
            }
        ]
    }


@router.delete("/history")
async def clear_chat_history(
    current_user: dict = Depends(get_current_user)
):
    """Очистить историю чата (только на клиенте)"""
    return {"message": "Chat history cleared (client-side only)"}
