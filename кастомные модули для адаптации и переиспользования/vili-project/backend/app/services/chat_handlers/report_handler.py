"""Report Handler for Chat Requests.

Handles requests related to report generation.
"""

import time
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.schemas.intent import IntentResult, IntentType, EntityType
from app.services.operator_service import OperatorService
from .base_handler import BaseHandler, ChatResponseData


class ReportHandler(BaseHandler):
    """Обработчик запросов создания отчётов."""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.operator_service = OperatorService(db)
    
    async def handle(self, intent_result: IntentResult) -> ChatResponseData:
        """Обработка запроса создания отчёта."""
        report_type = self.get_entity(
            intent_result, 
            EntityType.REPORT_TYPE, 
            default="operators"
        )
        period_days = self.get_entity(
            intent_result,
            EntityType.PERIOD_DAYS,
            default=30
        )
        
        if report_type == "operators":
            return await self._create_operators_report(period_days)
        elif report_type == "compliance":
            return await self._create_compliance_report(period_days)
        elif report_type == "form_payments":
            return await self._create_form_payments_report(period_days)
        else:
            return await self._create_operators_report(period_days)
    
    async def _create_operators_report(self, period_days: int) -> ChatResponseData:
        """Создание отчёта по операторам."""
        operators_list = await self.operator_service.get_operators_list()
        
        report_date = time.strftime('%Y-%m-%d %H:%M')
        avg_compliance = operators_list.team_stats.get('avg_compliance_score', 0)
        avg_success = operators_list.team_stats.get('avg_success_rate', 0)
        
        # Группировка по уровням
        by_level = {}
        need_attention = []
        top_performers = []
        
        for op in operators_list.operators:
            level = op.level.value
            by_level[level] = by_level.get(level, 0) + 1
            
            if op.compliance_score < 0.85:
                need_attention.append(op)
            elif op.compliance_score >= 0.95:
                top_performers.append(op)
        
        levels_text = ", ".join([f"{level}: {count}" for level, count in by_level.items()])
        attention_list = "\n".join([
            f"- {op.full_name}: {self.format_percentage(op.compliance_score)}"
            for op in need_attention[:5]
        ]) or "- Все операторы в норме"
        top_list = "\n".join([
            f"- {op.full_name}: {self.format_percentage(op.compliance_score)}"
            for op in top_performers[:3]
        ]) or "- Нет"
        
        answer = f"""📄 **Отчёт по операторам ВЭД**

**Дата:** {report_date}
**Период:** {period_days} дней

---

**📊 Сводная статистика:**
- Всего операторов: {operators_list.total}
- Средний Compliance Score: {self.format_percentage(avg_compliance)}
- Средний Success Rate: {self.format_percentage(avg_success)}

**👥 Распределение по уровням:**
{levels_text}

**⭐ Лучшие операторы (Compliance ≥ 95%):**
{top_list}

**⚠️ Требуют внимания (Compliance < 85%):**
{attention_list}

---

Полный отчёт доступен для скачивания в формате JSON.
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=True,
            model="vili-reports",
            links={
                "Дашборд операторов": "/operators/",
                "API документация": "/api/docs"
            },
            actions=[
                self.create_action("download", "Скачать JSON", url="/api/v1/operators"),
                self.create_action("link", "Открыть дашборд", url="/operators/")
            ],
            embedded_data={
                "type": "report",
                "report_type": "operators",
                "period_days": period_days,
                "total_operators": operators_list.total,
                "avg_compliance": avg_compliance,
                "avg_success": avg_success,
                "need_attention_count": len(need_attention)
            }
        )
    
    async def _create_compliance_report(self, period_days: int) -> ChatResponseData:
        """Создание отчёта по compliance."""
        operators_list = await self.operator_service.get_operators_list()
        
        report_date = time.strftime('%Y-%m-%d %H:%M')
        
        # Группировка по compliance score
        critical = []  # < 70%
        warning = []   # 70-85%
        normal = []    # 85-95%
        excellent = [] # >= 95%
        
        for op in operators_list.operators:
            score = op.compliance_score
            if score < 0.70:
                critical.append(op)
            elif score < 0.85:
                warning.append(op)
            elif score < 0.95:
                normal.append(op)
            else:
                excellent.append(op)
        
        answer = f"""📋 **Отчёт по Compliance (115-ФЗ)**

**Дата:** {report_date}
**Период:** {period_days} дней

---

**📊 Распределение по Compliance Score:**

🔴 **Критический (<70%):** {len(critical)} оператор(ов)
{chr(10).join(f"   - {op.full_name}: {self.format_percentage(op.compliance_score)}" for op in critical[:3]) or "   - Нет"}

🟡 **Предупреждение (70-85%):** {len(warning)} оператор(ов)
{chr(10).join(f"   - {op.full_name}: {self.format_percentage(op.compliance_score)}" for op in warning[:3]) or "   - Нет"}

🟢 **Норма (85-95%):** {len(normal)} оператор(ов)

⭐ **Отлично (≥95%):** {len(excellent)} оператор(ов)

---

**Рекомендации:**
{"- Провести дополнительное обучение для операторов с критическим уровнем" if critical else "- Поддерживать текущий уровень обучения"}
{"- Усилить контроль за операторами с предупреждением" if warning else ""}

---

Полный отчёт доступен в дашборде.
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=True,
            model="vili-reports",
            links={
                "Дашборд операторов": "/operators/",
                "Compliance детали": "/api/v1/operators/statistics"
            },
            embedded_data={
                "type": "report",
                "report_type": "compliance",
                "critical_count": len(critical),
                "warning_count": len(warning),
                "normal_count": len(normal),
                "excellent_count": len(excellent)
            }
        )
    
    async def _create_form_payments_report(self, period_days: int) -> ChatResponseData:
        """Создание отчёта по заявкам (заглушка)."""
        report_date = time.strftime('%Y-%m-%d %H:%M')
        
        answer = f"""📋 **Отчёт по заявкам на платежи**

**Дата:** {report_date}
**Период:** {period_days} дней

---

⚠️ Интеграция с fea-stage находится в процессе настройки.

После настройки интеграции здесь будет отображаться:
- Общее количество заявок за период
- Распределение по статусам
- Статистика по операторам
- Среднее время обработки

---

Для настройки интеграции обратитесь к документации.
"""
        
        return ChatResponseData(
            answer=answer,
            context_used=False,
            model="vili-reports",
            links={
                "Документация": "/api/docs"
            },
            embedded_data={
                "type": "report",
                "report_type": "form_payments",
                "integration_status": "pending_configuration"
            }
        )
