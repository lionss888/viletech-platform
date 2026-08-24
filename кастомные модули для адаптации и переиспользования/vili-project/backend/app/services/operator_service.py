"""Operator Analytics Service.

This module provides business logic for analyzing VED operators' performance,
calculating compliance scores based on 115-FZ requirements, and generating
forecasts and recommendations using RAG and LLM.

Created as part of the Operator Analytics Module for VILI.
"""

import json
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.exceptions import VILIException
from app.services.rag_service import RAGService
from app.services.llm_service import LLMService
from app.database.schemas.operator import (
    OperatorProfileResponse,
    OperatorMetrics,
    OperatorComplianceScore,
    OperatorAnalyticsRequest,
    OperatorAnalyticsResponse,
    OperatorCompareRequest,
    OperatorCompareResponse,
    OperatorCompareItem,
    OperatorListItem,
    OperatorListResponse,
    PerformanceForecast,
    Recommendation,
    RecommendationType,
    RecommendationsRequest,
    RecommendationsResponse,
    OperatorLevel,
    RiskLevel,
    Certificate,
    ComplianceViolation,
)


class OperatorServiceException(VILIException):
    """Exception for operator service errors."""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            details=details
        )


class OperatorService:
    """Сервис аналитики операторов отдела ВЭД.
    
    Предоставляет функциональность для:
    - Получения метрик производительности операторов
    - Расчёта compliance-оценок с учётом 115-ФЗ
    - Генерации прогнозов через LLM
    - Формирования рекомендаций через RAG
    
    Attributes:
        db: SQLAlchemy сессия
        rag: RAG-сервис для поиска контекста
        llm: LLM-сервис для генерации
        demo_data: Демо-данные операторов
    """
    
    def __init__(self, db: Session):
        """Инициализация сервиса.
        
        Args:
            db: SQLAlchemy сессия базы данных
        """
        self.db = db
        self.rag = RAGService(db)
        self.llm = LLMService()
        self.demo_data = self._load_demo_data()
    
    def _load_demo_data(self) -> Dict[str, Any]:
        """Загружает демо-данные из fixtures.
        
        Returns:
            Dict: Демо-данные операторов
            
        Raises:
            OperatorServiceException: Если файл не найден или невалидный JSON
        """
        fixtures_path = Path(__file__).parent.parent.parent / "tests" / "fixtures" / "demo_operators.json"
        
        try:
            if fixtures_path.exists():
                with open(fixtures_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                # Возвращаем пустую структуру если файла нет
                return {"operators": [], "team_summary": {}}
        except json.JSONDecodeError as e:
            raise OperatorServiceException(
                f"Invalid demo data JSON: {e}",
                details={"path": str(fixtures_path)}
            )
    
    def _get_operator_by_id(self, operator_id: UUID) -> Optional[Dict]:
        """Получает оператора по ID из демо-данных.
        
        Args:
            operator_id: UUID оператора
            
        Returns:
            Dict или None: Данные оператора
        """
        for op in self.demo_data.get("operators", []):
            if op.get("id") == str(operator_id):
                return op
        return None
    
    def _parse_operator_profile(self, raw: Dict) -> OperatorProfileResponse:
        """Парсит профиль оператора из сырых данных.
        
        Args:
            raw: Сырые данные оператора
            
        Returns:
            OperatorProfileResponse: Профиль оператора
        """
        profile = raw.get("profile", {})
        
        certificates = [
            Certificate(
                name=c.get("name", ""),
                issuer=c.get("issuer", ""),
                issue_date=date.fromisoformat(c.get("issue_date", "2020-01-01")),
                expiry_date=date.fromisoformat(c["expiry_date"]) if c.get("expiry_date") else None,
                is_valid=c.get("is_valid", True)
            )
            for c in profile.get("certificates", [])
        ]
        
        return OperatorProfileResponse(
            id=UUID(raw["id"]),
            full_name=profile.get("full_name", ""),
            employee_id=profile.get("employee_id", ""),
            department=profile.get("department", "VED"),
            position=profile.get("position", ""),
            level=OperatorLevel(profile.get("level", "junior")),
            hire_date=date.fromisoformat(profile.get("hire_date", "2020-01-01")),
            years_of_experience=profile.get("years_of_experience", 0),
            years_in_company=profile.get("years_in_company", 0),
            certificates=certificates,
            languages=profile.get("languages", []),
            specializations=profile.get("specializations", []),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    def _parse_operator_metrics(self, raw: Dict) -> OperatorMetrics:
        """Парсит метрики оператора из сырых данных.
        
        Args:
            raw: Сырые данные оператора
            
        Returns:
            OperatorMetrics: Метрики оператора
        """
        m = raw.get("metrics", {})
        
        return OperatorMetrics(
            applications_processed=m.get("applications_processed", 0),
            applications_approved=m.get("applications_approved", 0),
            applications_rejected=m.get("applications_rejected", 0),
            applications_pending=m.get("applications_pending", 0),
            avg_processing_time_min=m.get("avg_processing_time_min", 0),
            min_processing_time_min=m.get("min_processing_time_min", 0),
            max_processing_time_min=m.get("max_processing_time_min", 0),
            success_rate=m.get("success_rate", 0),
            error_rate=m.get("error_rate", 0),
            compliance_score=m.get("compliance_score", 0),
            red_flags_detected=m.get("red_flags_detected", 0),
            red_flags_missed=m.get("red_flags_missed", 0),
            false_positive_rate=m.get("false_positive_rate", 0),
            false_negative_rate=m.get("false_negative_rate", 0),
            avg_alert_response_time_min=m.get("avg_alert_response_time_min", 0),
            period_start=date.fromisoformat(m.get("period_start", "2025-12-03")),
            period_end=date.fromisoformat(m.get("period_end", "2026-01-02"))
        )
    
    def _parse_compliance_score(self, raw: Dict, operator_id: UUID) -> OperatorComplianceScore:
        """Парсит compliance-оценку из сырых данных.
        
        Args:
            raw: Сырые данные оператора
            operator_id: ID оператора
            
        Returns:
            OperatorComplianceScore: Compliance-оценка
        """
        c = raw.get("compliance", {})
        
        violations = [
            ComplianceViolation(
                violation_type=v.get("violation_type", ""),
                severity=RiskLevel(v.get("severity", "low")),
                date=datetime.fromisoformat(v.get("date", "2025-12-01T00:00:00")),
                description=v.get("description", ""),
                resolved=v.get("resolved", False),
                resolution_date=datetime.fromisoformat(v["resolution_date"]) if v.get("resolution_date") else None
            )
            for v in c.get("violations", [])
        ]
        
        return OperatorComplianceScore(
            operator_id=operator_id,
            overall_score=c.get("overall_score", 0),
            risk_level=RiskLevel(c.get("risk_level", "low")),
            kyc_compliance=c.get("kyc_compliance", 0),
            aml_compliance=c.get("aml_compliance", 0),
            sanctions_compliance=c.get("sanctions_compliance", 0),
            documentation_quality=c.get("documentation_quality", 0),
            detection_rate=c.get("detection_rate", 0),
            false_negative_rate=c.get("false_negative_rate", 0),
            alert_response_compliance=c.get("alert_response_compliance", 0),
            violations=violations,
            violations_count_30d=c.get("violations_count_30d", 0),
            violations_count_90d=c.get("violations_count_90d", 0),
            calculated_at=datetime.now(),
            period_days=30
        )
    
    async def get_operators_list(self) -> OperatorListResponse:
        """Получает список всех операторов с базовыми метриками.
        
        Returns:
            OperatorListResponse: Список операторов
        """
        operators = []
        
        for raw in self.demo_data.get("operators", []):
            profile = raw.get("profile", {})
            metrics = raw.get("metrics", {})
            
            operators.append(OperatorListItem(
                id=UUID(raw["id"]),
                full_name=profile.get("full_name", ""),
                level=OperatorLevel(profile.get("level", "junior")),
                department=profile.get("department", "VED"),
                success_rate=metrics.get("success_rate", 0),
                compliance_score=metrics.get("compliance_score", 0),
                applications_processed_30d=metrics.get("applications_processed", 0),
                status="active"
            ))
        
        team_summary = self.demo_data.get("team_summary", {})
        
        return OperatorListResponse(
            total=len(operators),
            operators=operators,
            team_stats={
                "avg_success_rate": team_summary.get("avg_success_rate", 0),
                "avg_compliance_score": team_summary.get("avg_compliance_score", 0),
                "total_applications": team_summary.get("total_applications_processed", 0),
                "team_detection_rate": team_summary.get("team_detection_rate", 0)
            }
        )
    
    async def get_operator_analytics(
        self,
        request: OperatorAnalyticsRequest
    ) -> OperatorAnalyticsResponse:
        """Получает полную аналитику по оператору.
        
        Args:
            request: Запрос на анализ
            
        Returns:
            OperatorAnalyticsResponse: Результат анализа
            
        Raises:
            OperatorServiceException: Если оператор не найден
        """
        start_time = time.time()
        
        if not request.operator_id:
            raise OperatorServiceException("operator_id is required")
        
        raw = self._get_operator_by_id(request.operator_id)
        if not raw:
            raise OperatorServiceException(
                f"Operator not found: {request.operator_id}",
                details={"operator_id": str(request.operator_id)}
            )
        
        # Парсим данные
        profile = self._parse_operator_profile(raw)
        metrics = self._parse_operator_metrics(raw)
        compliance = self._parse_compliance_score(raw, request.operator_id)
        
        # Генерируем прогноз если запрошено
        forecast = None
        if request.include_forecast:
            forecast = await self._generate_forecast(raw, profile, metrics)
        
        # Генерируем рекомендации если запрошено
        recommendations = []
        if request.include_recommendations:
            recommendations = await self._generate_recommendations(
                raw, profile, metrics, compliance, request.use_rag
            )
        
        # Сравнение с командой
        team_comparison = None
        if request.compare_with_team:
            team_comparison = self._calculate_team_comparison(metrics)
        
        # Генерируем текстовое резюме
        summary = await self._generate_analysis_summary(profile, metrics, compliance)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return OperatorAnalyticsResponse(
            operator_id=request.operator_id,
            profile=profile,
            metrics=metrics,
            compliance_score=compliance,
            forecast=forecast,
            recommendations=recommendations,
            team_comparison=team_comparison,
            analysis_summary=summary,
            processing_time_ms=processing_time_ms,
            generated_at=datetime.now()
        )
    
    async def _generate_forecast(
        self,
        raw: Dict,
        profile: OperatorProfileResponse,
        metrics: OperatorMetrics
    ) -> PerformanceForecast:
        """Генерирует прогноз производительности через LLM.
        
        Args:
            raw: Сырые данные оператора
            profile: Профиль оператора
            metrics: Метрики оператора
            
        Returns:
            PerformanceForecast: Прогноз производительности
        """
        # Анализируем тренд по дневной статистике
        daily_stats = raw.get("daily_stats", [])
        
        if len(daily_stats) >= 10:
            first_half = daily_stats[:len(daily_stats)//2]
            second_half = daily_stats[len(daily_stats)//2:]
            
            avg_first = sum(d.get("processed", 0) for d in first_half) / len(first_half)
            avg_second = sum(d.get("processed", 0) for d in second_half) / len(second_half)
            
            if avg_second > avg_first * 1.1:
                trend = "improving"
            elif avg_second < avg_first * 0.9:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        # Прогнозируем на основе текущих метрик и тренда
        trend_multiplier = {"improving": 1.1, "stable": 1.0, "declining": 0.9}[trend]
        
        predicted_applications = int(metrics.applications_processed * trend_multiplier)
        predicted_success_rate = min(1.0, metrics.success_rate * trend_multiplier)
        predicted_compliance = min(1.0, metrics.compliance_score * trend_multiplier)
        
        # Определяем факторы
        risk_factors = []
        growth_factors = []
        
        if metrics.false_negative_rate > 0.1:
            risk_factors.append("Высокий процент пропущенных red flags")
        if metrics.avg_processing_time_min > 45:
            risk_factors.append("Медленная обработка заявок")
        if metrics.error_rate > 0.05:
            risk_factors.append("Повышенный процент ошибок")
        
        if profile.level == OperatorLevel.JUNIOR and trend == "improving":
            growth_factors.append("Быстрая адаптация новичка")
        if len(profile.certificates) >= 2:
            growth_factors.append("Наличие профессиональных сертификатов")
        if metrics.compliance_score > 0.95:
            growth_factors.append("Отличное соблюдение compliance")
        
        # Уверенность прогноза зависит от количества данных и стабильности
        confidence = 0.7
        if len(daily_stats) >= 20:
            confidence += 0.1
        if trend == "stable":
            confidence += 0.1
        
        return PerformanceForecast(
            forecast_period_days=30,
            predicted_applications=predicted_applications,
            predicted_success_rate=round(predicted_success_rate, 3),
            predicted_compliance_score=round(predicted_compliance, 3),
            confidence=round(min(0.95, confidence), 2),
            trend=trend,
            risk_factors=risk_factors,
            growth_factors=growth_factors
        )
    
    async def _generate_recommendations(
        self,
        raw: Dict,
        profile: OperatorProfileResponse,
        metrics: OperatorMetrics,
        compliance: OperatorComplianceScore,
        use_rag: bool
    ) -> List[Recommendation]:
        """Генерирует рекомендации для оператора.
        
        Args:
            raw: Сырые данные
            profile: Профиль оператора
            metrics: Метрики
            compliance: Compliance-оценка
            use_rag: Использовать ли RAG
            
        Returns:
            List[Recommendation]: Список рекомендаций
        """
        recommendations = []
        
        # Рекомендации на основе compliance
        if compliance.false_negative_rate > 0.1:
            recommendations.append(Recommendation(
                type=RecommendationType.TRAINING,
                priority="high",
                title="Обучение выявлению подозрительных операций",
                description=f"Оператор пропускает {compliance.false_negative_rate*100:.0f}% подозрительных операций. "
                           "Рекомендуется пройти курс по 115-ФЗ и типологиям отмывания.",
                expected_impact="Снижение false negative rate до 5%",
                implementation_time="2 недели",
                based_on=["false_negative_rate", "115-ФЗ requirements"]
            ))
        
        if compliance.alert_response_compliance < 0.85:
            recommendations.append(Recommendation(
                type=RecommendationType.WARNING,
                priority="high",
                title="Улучшение времени реакции на алерты",
                description=f"Текущее среднее время реакции: {metrics.avg_alert_response_time_min:.1f} мин. "
                           "SLA: 10 минут. Необходимо ускорить обработку алертов.",
                expected_impact="Соответствие SLA по реакции на алерты",
                implementation_time="Немедленно",
                based_on=["avg_alert_response_time_min", "SLA requirements"]
            ))
        
        # Рекомендации на основе производительности
        if metrics.avg_processing_time_min > 45 and profile.level == OperatorLevel.JUNIOR:
            recommendations.append(Recommendation(
                type=RecommendationType.MENTORING,
                priority="medium",
                title="Назначение наставника",
                description="Время обработки заявок выше среднего. "
                           "Рекомендуется назначить опытного наставника для ускорения адаптации.",
                expected_impact="Снижение времени обработки на 20-30%",
                implementation_time="1 неделя",
                based_on=["avg_processing_time_min", "level=junior"]
            ))
        
        if metrics.success_rate > 0.9 and compliance.overall_score > 0.95:
            recommendations.append(Recommendation(
                type=RecommendationType.PROMOTION,
                priority="low",
                title="Рассмотреть повышение",
                description="Показатели существенно выше средних по команде. "
                           "Рекомендуется рассмотреть кандидатуру на повышение или расширение полномочий.",
                expected_impact="Мотивация и удержание ценного сотрудника",
                implementation_time="По результатам квартала",
                based_on=["success_rate", "compliance_score"]
            ))
        
        # Рекомендации на основе сертификатов
        if not profile.certificates and profile.level != OperatorLevel.JUNIOR:
            recommendations.append(Recommendation(
                type=RecommendationType.CERTIFICATION,
                priority="medium",
                title="Получение профессионального сертификата",
                description="Рекомендуется пройти сертификацию специалиста ВЭД (ТПП РФ) "
                           "для подтверждения квалификации и карьерного роста.",
                expected_impact="Повышение квалификации, возможность работы со сложными кейсами",
                implementation_time="3 месяца",
                based_on=["certificates_count=0", "level"]
            ))
        
        # Используем RAG для дополнительного контекста
        if use_rag and compliance.violations_count_30d > 0:
            try:
                context = await self.rag.get_context_for_query(
                    query="Рекомендации по устранению нарушений compliance 115-ФЗ",
                    max_chunks=3
                )
                if context and "Нет релевантной информации" not in context:
                    recommendations.append(Recommendation(
                        type=RecommendationType.TRAINING,
                        priority="medium",
                        title="Изучение материалов по compliance",
                        description=f"На основе базы знаний рекомендуется изучить: {context[:200]}...",
                        expected_impact="Снижение количества нарушений",
                        implementation_time="1 неделя",
                        based_on=["RAG knowledge base", "violations_count"]
                    ))
            except Exception:
                pass  # RAG недоступен, пропускаем
        
        return recommendations[:5]  # Максимум 5 рекомендаций
    
    def _calculate_team_comparison(self, metrics: OperatorMetrics) -> Dict[str, Any]:
        """Сравнивает метрики оператора со средними по команде.
        
        Args:
            metrics: Метрики оператора
            
        Returns:
            Dict: Результаты сравнения
        """
        team_summary = self.demo_data.get("team_summary", {})
        
        team_avg_success = team_summary.get("avg_success_rate", 0.85)
        team_avg_compliance = team_summary.get("avg_compliance_score", 0.88)
        team_avg_applications = team_summary.get("total_applications_processed", 0) / max(1, team_summary.get("total_operators", 1))
        
        return {
            "success_rate": {
                "operator": metrics.success_rate,
                "team_avg": team_avg_success,
                "diff": round(metrics.success_rate - team_avg_success, 3),
                "percentile": self._calculate_percentile(metrics.success_rate, [0.80, 0.86, 0.91])
            },
            "compliance_score": {
                "operator": metrics.compliance_score,
                "team_avg": team_avg_compliance,
                "diff": round(metrics.compliance_score - team_avg_compliance, 3),
                "percentile": self._calculate_percentile(metrics.compliance_score, [0.78, 0.89, 0.97])
            },
            "applications_processed": {
                "operator": metrics.applications_processed,
                "team_avg": round(team_avg_applications, 1),
                "diff": round(metrics.applications_processed - team_avg_applications, 1),
                "percentile": self._calculate_percentile(
                    metrics.applications_processed, [85, 128, 156]
                )
            }
        }
    
    def _calculate_percentile(self, value: float, thresholds: List[float]) -> int:
        """Рассчитывает перцентиль значения.
        
        Args:
            value: Значение для оценки
            thresholds: Пороги [25%, 50%, 75%]
            
        Returns:
            int: Перцентиль (0-100)
        """
        if value <= thresholds[0]:
            return 25
        elif value <= thresholds[1]:
            return 50
        elif value <= thresholds[2]:
            return 75
        else:
            return 90
    
    async def _generate_analysis_summary(
        self,
        profile: OperatorProfileResponse,
        metrics: OperatorMetrics,
        compliance: OperatorComplianceScore
    ) -> str:
        """Генерирует текстовое резюме анализа.
        
        Args:
            profile: Профиль оператора
            metrics: Метрики
            compliance: Compliance-оценка
            
        Returns:
            str: Текстовое резюме
        """
        level_text = {
            OperatorLevel.JUNIOR: "младший специалист",
            OperatorLevel.MIDDLE: "специалист",
            OperatorLevel.SENIOR: "старший специалист",
            OperatorLevel.LEAD: "ведущий специалист"
        }
        
        risk_text = {
            RiskLevel.LOW: "низкий",
            RiskLevel.MEDIUM: "средний",
            RiskLevel.HIGH: "высокий",
            RiskLevel.CRITICAL: "критический"
        }
        
        summary = f"{profile.full_name} ({level_text[profile.level]}) за отчётный период "
        summary += f"обработал(а) {metrics.applications_processed} заявок "
        summary += f"с показателем успешности {metrics.success_rate*100:.1f}%. "
        summary += f"Compliance-оценка: {compliance.overall_score*100:.0f}% "
        summary += f"(уровень риска: {risk_text[compliance.risk_level]}). "
        
        if metrics.red_flags_detected > 0:
            summary += f"Выявлено {metrics.red_flags_detected} подозрительных операций. "
        
        if compliance.violations_count_30d > 0:
            summary += f"За 30 дней зафиксировано {compliance.violations_count_30d} нарушений. "
        
        if metrics.avg_processing_time_min > 45:
            summary += "Среднее время обработки выше нормы. "
        elif metrics.avg_processing_time_min < 30:
            summary += "Время обработки заявок отличное. "
        
        return summary
    
    async def compare_operators(
        self,
        request: OperatorCompareRequest
    ) -> OperatorCompareResponse:
        """Сравнивает нескольких операторов.
        
        Args:
            request: Запрос на сравнение
            
        Returns:
            OperatorCompareResponse: Результат сравнения
        """
        items = []
        all_metrics = {}
        
        for op_id in request.operator_ids:
            raw = self._get_operator_by_id(op_id)
            if not raw:
                continue
            
            profile = raw.get("profile", {})
            metrics = raw.get("metrics", {})
            
            operator_metrics = {}
            for metric_name in request.metrics_to_compare:
                operator_metrics[metric_name] = metrics.get(metric_name, 0)
                if metric_name not in all_metrics:
                    all_metrics[metric_name] = []
                all_metrics[metric_name].append(metrics.get(metric_name, 0))
            
            items.append({
                "operator_id": op_id,
                "operator_name": profile.get("full_name", ""),
                "level": OperatorLevel(profile.get("level", "junior")),
                "metrics": operator_metrics
            })
        
        # Рассчитываем средние
        team_averages = {k: sum(v)/len(v) for k, v in all_metrics.items() if v}
        
        # Ранжируем по первой метрике
        primary_metric = request.metrics_to_compare[0] if request.metrics_to_compare else "success_rate"
        items.sort(key=lambda x: x["metrics"].get(primary_metric, 0), reverse=True)
        
        # Добавляем ранги
        compare_items = []
        needs_attention = []
        
        for rank, item in enumerate(items, 1):
            compare_items.append(OperatorCompareItem(
                operator_id=item["operator_id"],
                operator_name=item["operator_name"],
                level=item["level"],
                metrics=item["metrics"],
                rank=rank
            ))
            
            # Определяем кто требует внимания
            if item["metrics"].get("compliance_score", 1) < 0.85:
                needs_attention.append(item["operator_id"])
        
        best_performer = compare_items[0].operator_id if compare_items else None
        
        summary = f"Сравнение {len(compare_items)} операторов по метрикам: {', '.join(request.metrics_to_compare)}. "
        if best_performer:
            summary += f"Лидер: {compare_items[0].operator_name}. "
        if needs_attention:
            summary += f"Требуют внимания: {len(needs_attention)} сотрудников."
        
        return OperatorCompareResponse(
            operators=compare_items,
            best_performer=best_performer,
            needs_attention=needs_attention,
            team_averages=team_averages,
            comparison_summary=summary
        )
    
    async def get_recommendations(
        self,
        request: RecommendationsRequest
    ) -> RecommendationsResponse:
        """Генерирует рекомендации через RAG+LLM.
        
        Args:
            request: Запрос на рекомендации
            
        Returns:
            RecommendationsResponse: Рекомендации
        """
        recommendations = []
        context_used = []
        
        if request.operator_id:
            raw = self._get_operator_by_id(request.operator_id)
            if raw:
                profile = self._parse_operator_profile(raw)
                metrics = self._parse_operator_metrics(raw)
                compliance = self._parse_compliance_score(raw, request.operator_id)
                
                recommendations = await self._generate_recommendations(
                    raw, profile, metrics, compliance, request.use_rag
                )
        else:
            # Рекомендации для команды
            recommendations.append(Recommendation(
                type=RecommendationType.TRAINING,
                priority="medium",
                title="Командное обучение по 115-ФЗ",
                description="Рекомендуется провести командный тренинг по актуальным требованиям "
                           "115-ФЗ и типологиям подозрительных операций.",
                expected_impact="Повышение общего уровня compliance команды",
                implementation_time="1 месяц",
                based_on=["team_compliance_score", "115-ФЗ updates"]
            ))
        
        # Получаем контекст из RAG если доступен
        if request.use_rag:
            try:
                for area in request.focus_areas[:2]:
                    context = await self.rag.get_context_for_query(
                        query=f"Рекомендации по улучшению {area} для операторов ВЭД",
                        max_chunks=2
                    )
                    if context and "Нет релевантной информации" not in context:
                        context_used.append(f"{area}: {context[:100]}...")
            except Exception:
                pass
        
        return RecommendationsResponse(
            operator_id=request.operator_id,
            recommendations=recommendations[:request.max_recommendations],
            context_used=context_used,
            generated_at=datetime.now()
        )
    
    async def get_operator_compliance(self, operator_id: UUID) -> OperatorComplianceScore:
        """Получает детальную compliance-оценку оператора.
        
        Args:
            operator_id: ID оператора
            
        Returns:
            OperatorComplianceScore: Compliance-оценка
            
        Raises:
            OperatorServiceException: Если оператор не найден
        """
        raw = self._get_operator_by_id(operator_id)
        if not raw:
            raise OperatorServiceException(
                f"Operator not found: {operator_id}",
                details={"operator_id": str(operator_id)}
            )
        
        return self._parse_compliance_score(raw, operator_id)
