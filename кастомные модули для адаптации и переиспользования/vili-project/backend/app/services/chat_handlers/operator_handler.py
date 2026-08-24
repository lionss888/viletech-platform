"""Operator Analytics Handler for Chat Requests.

Handles requests related to operator analytics, lists, comparisons, and statistics.
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.database.schemas.intent import IntentResult, IntentType, EntityType
from app.database.schemas.operator import OperatorAnalyticsRequest
from app.services.operator_service import OperatorService, OperatorServiceException
from .base_handler import BaseHandler, ChatResponseData


class OperatorHandler(BaseHandler):
    """Обработчик запросов аналитики операторов."""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.service = OperatorService(db)
    
    async def handle(self, intent_result: IntentResult) -> ChatResponseData:
        """Маршрутизация по типу запроса."""
        intent = intent_result.intent
        
        if intent == IntentType.OPERATOR_ANALYTICS:
            return await self.handle_analytics(intent_result)
        elif intent == IntentType.OPERATOR_LIST:
            return await self.handle_list(intent_result)
        elif intent == IntentType.OPERATOR_COMPARE:
            return await self.handle_compare(intent_result)
        elif intent == IntentType.OPERATOR_STATISTICS:
            return await self.handle_statistics(intent_result)
        else:
            return await self.handle_list(intent_result)
    
    async def handle_analytics(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса аналитики конкретного оператора."""
        operator_id = self.get_entity(intent_result, EntityType.OPERATOR_ID)
        operator_name = self.get_entity(intent_result, EntityType.OPERATOR_NAME)
        period_days = self.get_entity(intent_result, EntityType.PERIOD_DAYS, default=30)
        
        # Поиск по имени, если ID не указан
        if operator_name and not operator_id:
            operator_id = await self._find_operator_by_name(operator_name)
        
        if not operator_id:
            return await self.handle_list(intent_result)
        
        try:
            request = OperatorAnalyticsRequest(
                operator_id=UUID(operator_id),
                period_days=period_days,
                include_forecast=True,
                include_recommendations=True,
                use_rag=True
            )
            analytics = await self.service.get_operator_analytics(request)
            
            answer = self._format_analytics_response(analytics, period_days)
            
            return ChatResponseData(
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
                    "success_rate": analytics.metrics.success_rate,
                    "applications_processed": analytics.metrics.applications_processed
                }
            )
        except OperatorServiceException as e:
            return ChatResponseData(
                answer=f"❌ Оператор не найден: {str(e)}",
                context_used=False,
                model="vili-analytics",
                links={"Список операторов": "/operators/"}
            )
    
    async def handle_list(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса списка операторов."""
        operators_list = await self.service.get_operators_list()
        
        operators_text = "\n".join([
            f"- **{op.full_name}** ({op.level.value}): "
            f"Compliance {self.format_percentage(op.compliance_score)}, "
            f"Success {self.format_percentage(op.success_rate)}"
            for op in operators_list.operators[:10]
        ])
        
        avg_success = operators_list.team_stats.get('avg_success_rate', 0)
        avg_compliance = operators_list.team_stats.get('avg_compliance_score', 0)
        
        answer = f"""👥 **Список операторов отдела ВЭД**

Всего операторов: {operators_list.total}

**Статистика команды:**
- Средний Success Rate: {self.format_percentage(avg_success)}
- Средний Compliance Score: {self.format_percentage(avg_compliance)}

**Операторы:**
{operators_text}

Для получения детальной аналитики укажите имя оператора.
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={"Дашборд операторов": "/operators/"},
            actions=[
                self.create_action("link", "Открыть дашборд", url="/operators/")
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
    
    async def handle_compare(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса сравнения операторов."""
        operators_list = await self.service.get_operators_list()
        
        # Сортировка по compliance score
        sorted_ops = sorted(
            operators_list.operators, 
            key=lambda x: x.compliance_score, 
            reverse=True
        )
        
        top_list = "\n".join([
            f"{i}. **{op.full_name}** ({op.level.value}): {self.format_percentage(op.compliance_score)}"
            for i, op in enumerate(sorted_ops[:5], 1)
        ])
        
        answer = f"""📊 **Сравнение операторов по Compliance Score**

**Топ операторов:**
{top_list}

**Среднее по команде:** {self.format_percentage(operators_list.team_stats.get('avg_compliance_score', 0))}

Для детального сравнения укажите конкретных операторов или используйте дашборд.
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={"Дашборд операторов": "/operators/"},
            actions=[
                self.create_action("compare", "Сравнить в дашборде", url="/operators/")
            ]
        )
    
    async def handle_statistics(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса общей статистики команды."""
        operators_list = await self.service.get_operators_list()
        
        # Группировка по уровням
        by_level = {}
        need_attention = []
        
        for op in operators_list.operators:
            level = op.level.value
            by_level[level] = by_level.get(level, 0) + 1
            
            if op.compliance_score < 0.85:
                need_attention.append(op)
        
        levels_text = "\n".join([f"- {level}: {count}" for level, count in by_level.items()])
        attention_text = "\n".join([
            f"- {op.full_name}: {self.format_percentage(op.compliance_score)}"
            for op in need_attention
        ]) or "- Все операторы в норме"
        
        answer = f"""📈 **Статистика команды операторов ВЭД**

**Общие показатели:**
- Всего операторов: {operators_list.total}
- Средний Success Rate: {self.format_percentage(operators_list.team_stats.get('avg_success_rate', 0))}
- Средний Compliance Score: {self.format_percentage(operators_list.team_stats.get('avg_compliance_score', 0))}

**Распределение по уровням:**
{levels_text}

**Требуют внимания (Compliance < 85%):**
{attention_text}
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={"Дашборд операторов": "/operators/"}
        )
    
    async def _find_operator_by_name(self, name: str) -> Optional[str]:
        """Поиск оператора по имени."""
        operators_list = await self.service.get_operators_list()
        name_lower = name.lower()
        
        for op in operators_list.operators:
            if name_lower in op.full_name.lower():
                return str(op.id)
        
        return None
    
    def _format_analytics_response(self, analytics, period_days: int) -> str:
        """Форматирование ответа аналитики."""
        recommendations = ""
        if analytics.recommendations:
            recommendations = "\n".join([f"- {r.title}" for r in analytics.recommendations[:3]])
        else:
            recommendations = "- Нет рекомендаций"
        
        forecast_text = analytics.forecast.trend if analytics.forecast else "N/A"
        
        return f"""📊 **Аналитика оператора: {analytics.profile.full_name}**

**Основные метрики (за {period_days} дней):**
- Обработано заявок: {analytics.metrics.applications_processed}
- Success Rate: {self.format_percentage(analytics.metrics.success_rate)}
- Compliance Score: {self.format_percentage(analytics.compliance_score.overall_score)}
- Среднее время обработки: {analytics.metrics.avg_processing_time_min:.1f} мин

**Compliance (115-ФЗ):**
- Detection Rate: {self.format_percentage(analytics.compliance_score.detection_rate)}
- False Negative Rate: {self.format_percentage(analytics.compliance_score.false_negative_rate)}
- Red Flags выявлено: {analytics.metrics.red_flags_detected}

**Прогноз:** {forecast_text}

**Рекомендации:**
{recommendations}
"""
