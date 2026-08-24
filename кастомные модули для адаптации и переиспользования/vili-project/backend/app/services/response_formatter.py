"""Response Formatter Service.

Provides unified formatting for chat responses with links, actions, and embedded data.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class FormattedResponse(BaseModel):
    """Отформатированный ответ для чата."""
    answer: str
    context_used: bool = True
    model: str = "vili"
    sources: Optional[List[str]] = None
    links: Optional[Dict[str, str]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    embedded_data: Optional[Dict[str, Any]] = None


class ResponseFormatter:
    """Сервис форматирования ответов чата."""
    
    # URL паттерны
    OPERATORS_DASHBOARD_URL = "/operators/"
    OPERATOR_DETAIL_URL = "/operators/#operator-{operator_id}"
    API_DOCS_URL = "/api/docs"
    OPERATORS_API_URL = "/api/v1/operators"
    
    def format_percentage(self, value: float) -> str:
        """Форматирование процентов."""
        return f"{value:.1%}"
    
    def format_currency(self, value: float, currency: str = "USD") -> str:
        """Форматирование валюты."""
        return f"{value:,.2f} {currency}"
    
    def create_link(self, text: str, url: str) -> str:
        """Создание markdown ссылки."""
        return f"[{text}]({url})"
    
    def create_action(
        self,
        action_type: str,
        label: str,
        url: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Создание объекта действия."""
        action = {"type": action_type, "label": label}
        if url:
            action["url"] = url
        if data:
            action["data"] = data
        return action
    
    def format_operator_analytics(
        self,
        analytics,
        period_days: int = 30
    ) -> FormattedResponse:
        """Форматирование ответа аналитики оператора."""
        profile = analytics.profile
        metrics = analytics.metrics
        compliance = analytics.compliance_score
        
        recommendations_text = ""
        if analytics.recommendations:
            recommendations_text = "\n".join([
                f"- {r.title}" for r in analytics.recommendations[:3]
            ])
        else:
            recommendations_text = "- Нет рекомендаций"
        
        forecast_text = analytics.forecast.trend if analytics.forecast else "N/A"
        
        answer = f"""📊 **Аналитика оператора: {profile.full_name}**

**Основные метрики (за {period_days} дней):**
- Обработано заявок: {metrics.applications_processed}
- Success Rate: {self.format_percentage(metrics.success_rate)}
- Compliance Score: {self.format_percentage(compliance.overall_score)}
- Среднее время обработки: {metrics.avg_processing_time_min:.1f} мин

**Compliance (115-ФЗ):**
- Detection Rate: {self.format_percentage(compliance.detection_rate)}
- False Negative Rate: {self.format_percentage(compliance.false_negative_rate)}
- Red Flags выявлено: {metrics.red_flags_detected}

**Прогноз:** {forecast_text}

**Рекомендации:**
{recommendations_text}
"""
        
        operator_id = str(profile.id)
        
        return FormattedResponse(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={
                "Детальная аналитика": self.OPERATOR_DETAIL_URL.format(operator_id=operator_id),
                "Дашборд операторов": self.OPERATORS_DASHBOARD_URL
            },
            embedded_data={
                "type": "operator_analytics",
                "operator_id": operator_id,
                "operator_name": profile.full_name,
                "compliance_score": compliance.overall_score,
                "success_rate": metrics.success_rate,
                "applications_processed": metrics.applications_processed
            }
        )
    
    def format_operator_list(
        self,
        operators_list,
        max_items: int = 10
    ) -> FormattedResponse:
        """Форматирование списка операторов."""
        operators = operators_list.operators[:max_items]
        
        operators_text = "\n".join([
            f"- **{op.full_name}** ({op.level.value}): "
            f"Compliance {self.format_percentage(op.compliance_score)}, "
            f"Success {self.format_percentage(op.success_rate)}"
            for op in operators
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
        
        return FormattedResponse(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={"Дашборд операторов": self.OPERATORS_DASHBOARD_URL},
            actions=[
                self.create_action("link", "Открыть дашборд", url=self.OPERATORS_DASHBOARD_URL)
            ],
            embedded_data={
                "type": "operator_list",
                "total": operators_list.total,
                "operators": [
                    {"id": str(op.id), "name": op.full_name, "level": op.level.value}
                    for op in operators
                ]
            }
        )
    
    def format_operator_comparison(
        self,
        operators_list,
        sort_by: str = "compliance_score"
    ) -> FormattedResponse:
        """Форматирование сравнения операторов."""
        sorted_ops = sorted(
            operators_list.operators,
            key=lambda x: getattr(x, sort_by, 0),
            reverse=True
        )
        
        top_list = "\n".join([
            f"{i}. **{op.full_name}** ({op.level.value}): "
            f"{self.format_percentage(getattr(op, sort_by, 0))}"
            for i, op in enumerate(sorted_ops[:5], 1)
        ])
        
        avg_value = operators_list.team_stats.get(f'avg_{sort_by}', 0)
        
        answer = f"""📊 **Сравнение операторов по {sort_by.replace('_', ' ').title()}**

**Топ операторов:**
{top_list}

**Среднее по команде:** {self.format_percentage(avg_value)}

Для детального сравнения укажите конкретных операторов или используйте дашборд.
"""
        
        return FormattedResponse(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={"Дашборд операторов": self.OPERATORS_DASHBOARD_URL},
            actions=[
                self.create_action("compare", "Сравнить в дашборде", url=self.OPERATORS_DASHBOARD_URL)
            ]
        )
    
    def format_team_statistics(
        self,
        operators_list
    ) -> FormattedResponse:
        """Форматирование статистики команды."""
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
        
        avg_success = operators_list.team_stats.get('avg_success_rate', 0)
        avg_compliance = operators_list.team_stats.get('avg_compliance_score', 0)
        
        answer = f"""📈 **Статистика команды операторов ВЭД**

**Общие показатели:**
- Всего операторов: {operators_list.total}
- Средний Success Rate: {self.format_percentage(avg_success)}
- Средний Compliance Score: {self.format_percentage(avg_compliance)}

**Распределение по уровням:**
{levels_text}

**Требуют внимания (Compliance < 85%):**
{attention_text}
"""
        
        return FormattedResponse(
            answer=answer,
            context_used=True,
            model="vili-analytics",
            links={"Дашборд операторов": self.OPERATORS_DASHBOARD_URL}
        )
    
    def format_report(
        self,
        report_type: str,
        report_data: Dict[str, Any],
        period_days: int = 30
    ) -> FormattedResponse:
        """Форматирование отчёта."""
        import time
        report_date = time.strftime('%Y-%m-%d %H:%M')
        
        if report_type == "operators":
            answer = self._format_operators_report(report_data, report_date, period_days)
        elif report_type == "compliance":
            answer = self._format_compliance_report(report_data, report_date, period_days)
        else:
            answer = f"""📄 **Отчёт**

**Тип:** {report_type}
**Дата:** {report_date}
**Период:** {period_days} дней

Данные отчёта доступны в дашборде.
"""
        
        return FormattedResponse(
            answer=answer,
            context_used=True,
            model="vili-reports",
            links={
                "Дашборд операторов": self.OPERATORS_DASHBOARD_URL,
                "API документация": self.API_DOCS_URL
            },
            actions=[
                self.create_action("download", "Скачать JSON", url=self.OPERATORS_API_URL)
            ],
            embedded_data={
                "type": "report",
                "report_type": report_type,
                "period_days": period_days,
                **report_data
            }
        )
    
    def _format_operators_report(
        self,
        data: Dict[str, Any],
        report_date: str,
        period_days: int
    ) -> str:
        """Форматирование отчёта по операторам."""
        return f"""📄 **Отчёт по операторам ВЭД**

**Дата:** {report_date}
**Период:** {period_days} дней

---

**📊 Сводная статистика:**
- Всего операторов: {data.get('total', 0)}
- Средний Compliance Score: {self.format_percentage(data.get('avg_compliance', 0))}
- Средний Success Rate: {self.format_percentage(data.get('avg_success', 0))}

---

Полный отчёт доступен для скачивания.
"""
    
    def _format_compliance_report(
        self,
        data: Dict[str, Any],
        report_date: str,
        period_days: int
    ) -> str:
        """Форматирование отчёта по compliance."""
        return f"""📋 **Отчёт по Compliance (115-ФЗ)**

**Дата:** {report_date}
**Период:** {period_days} дней

---

**📊 Распределение по Compliance Score:**

🔴 Критический (<70%): {data.get('critical_count', 0)} оператор(ов)
🟡 Предупреждение (70-85%): {data.get('warning_count', 0)} оператор(ов)
🟢 Норма (85-95%): {data.get('normal_count', 0)} оператор(ов)
⭐ Отлично (≥95%): {data.get('excellent_count', 0)} оператор(ов)

---

Полный отчёт доступен в дашборде.
"""
    
    def format_form_payments_list(
        self,
        payments: List[Dict[str, Any]],
        total: int = 0,
        status_filter: Optional[str] = None
    ) -> FormattedResponse:
        """Форматирование списка заявок на платежи."""
        if not payments:
            answer = """📋 **Заявки на платежи**

Заявок не найдено по указанным критериям.
"""
        else:
            payments_text = "\n".join([
                f"- #{p.get('id', 'N/A')}: {p.get('status', 'N/A')} - "
                f"{p.get('amount', 0)} {p.get('currency', 'USD')}"
                for p in payments[:10]
            ])
            
            answer = f"""📋 **Заявки на платежи**

Найдено заявок: {total}
{f"Фильтр: {status_filter}" if status_filter else ""}

**Заявки:**
{payments_text}
"""
        
        return FormattedResponse(
            answer=answer,
            context_used=True,
            model="vili-fea-stage",
            embedded_data={
                "type": "form_payments_list",
                "total": total,
                "filter": status_filter
            }
        )
    
    def format_integration_not_configured(
        self,
        service_name: str,
        action: str
    ) -> FormattedResponse:
        """Форматирование ответа при отсутствии интеграции."""
        answer = f"""⚠️ **{action.title()}**

Интеграция с {service_name} находится в процессе настройки.

**Для настройки интеграции необходимо:**

1. Указать URL API в конфигурации
2. Настроить аутентификацию
3. Перезапустить VILI

Обратитесь к документации для детальных инструкций.
"""
        
        return FormattedResponse(
            answer=answer,
            context_used=False,
            model=f"vili-{service_name}",
            links={
                "Документация API": self.API_DOCS_URL
            },
            embedded_data={
                "type": "integration_status",
                "service": service_name,
                "status": "pending_configuration"
            }
        )


# Singleton instance
_formatter_instance: Optional[ResponseFormatter] = None


def get_response_formatter() -> ResponseFormatter:
    """Возвращает singleton экземпляр форматтера."""
    global _formatter_instance
    if _formatter_instance is None:
        _formatter_instance = ResponseFormatter()
    return _formatter_instance
