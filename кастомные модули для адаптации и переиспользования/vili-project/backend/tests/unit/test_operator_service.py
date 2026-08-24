"""Unit tests for OperatorService.

Tests the operator analytics service functionality including:
- Loading demo data
- Parsing operator profiles, metrics, and compliance scores
- Generating forecasts and recommendations
- Comparing operators

These tests use mock database sessions and don't require actual DB connection.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import UUID
from datetime import date, datetime

from app.services.operator_service import OperatorService, OperatorServiceException
from app.database.schemas.operator import (
    OperatorAnalyticsRequest,
    OperatorCompareRequest,
    RecommendationsRequest,
    OperatorLevel,
    RiskLevel,
)


# Test UUIDs from demo data
SENIOR_OPERATOR_ID = UUID("550e8400-e29b-41d4-a716-446655440001")
MIDDLE_OPERATOR_ID = UUID("550e8400-e29b-41d4-a716-446655440002")
JUNIOR_OPERATOR_ID = UUID("550e8400-e29b-41d4-a716-446655440003")


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def operator_service(mock_db):
    """Create OperatorService instance with mock DB."""
    with patch.object(OperatorService, '_load_demo_data') as mock_load:
        mock_load.return_value = get_sample_demo_data()
        service = OperatorService(mock_db)
    return service


def get_sample_demo_data():
    """Get sample demo data for testing."""
    return {
        "operators": [
            {
                "id": str(SENIOR_OPERATOR_ID),
                "profile": {
                    "full_name": "Иванов Алексей Петрович",
                    "employee_id": "VED-001",
                    "department": "VED",
                    "position": "Старший менеджер ВЭД",
                    "level": "senior",
                    "hire_date": "2020-03-15",
                    "years_of_experience": 8.5,
                    "years_in_company": 5.8,
                    "certificates": [
                        {
                            "name": "Сертификат ВЭД",
                            "issuer": "ТПП РФ",
                            "issue_date": "2022-06-10",
                            "expiry_date": "2027-06-10",
                            "is_valid": True
                        }
                    ],
                    "languages": ["Русский", "Английский"],
                    "specializations": ["Китай", "ЕС"]
                },
                "metrics": {
                    "applications_processed": 156,
                    "applications_approved": 142,
                    "applications_rejected": 12,
                    "applications_pending": 2,
                    "avg_processing_time_min": 28.5,
                    "min_processing_time_min": 12.0,
                    "max_processing_time_min": 95.0,
                    "success_rate": 0.91,
                    "error_rate": 0.02,
                    "compliance_score": 0.97,
                    "red_flags_detected": 8,
                    "red_flags_missed": 0,
                    "false_positive_rate": 0.03,
                    "false_negative_rate": 0.0,
                    "avg_alert_response_time_min": 4.2,
                    "period_start": "2025-12-03",
                    "period_end": "2026-01-02"
                },
                "compliance": {
                    "overall_score": 0.97,
                    "risk_level": "low",
                    "kyc_compliance": 0.98,
                    "aml_compliance": 0.97,
                    "sanctions_compliance": 1.0,
                    "documentation_quality": 0.95,
                    "detection_rate": 1.0,
                    "false_negative_rate": 0.0,
                    "alert_response_compliance": 0.96,
                    "violations": [],
                    "violations_count_30d": 0,
                    "violations_count_90d": 1
                },
                "daily_stats": [
                    {"date": "2025-12-03", "processed": 5, "approved": 5, "rejected": 0},
                    {"date": "2025-12-04", "processed": 6, "approved": 5, "rejected": 1},
                ]
            },
            {
                "id": str(JUNIOR_OPERATOR_ID),
                "profile": {
                    "full_name": "Сидоров Дмитрий Александрович",
                    "employee_id": "VED-003",
                    "department": "VED",
                    "position": "Младший менеджер ВЭД",
                    "level": "junior",
                    "hire_date": "2025-06-01",
                    "years_of_experience": 1.2,
                    "years_in_company": 0.6,
                    "certificates": [],
                    "languages": ["Русский"],
                    "specializations": ["СНГ"]
                },
                "metrics": {
                    "applications_processed": 85,
                    "applications_approved": 68,
                    "applications_rejected": 12,
                    "applications_pending": 5,
                    "avg_processing_time_min": 52.8,
                    "min_processing_time_min": 25.0,
                    "max_processing_time_min": 180.0,
                    "success_rate": 0.80,
                    "error_rate": 0.09,
                    "compliance_score": 0.78,
                    "red_flags_detected": 2,
                    "red_flags_missed": 3,
                    "false_positive_rate": 0.08,
                    "false_negative_rate": 0.15,
                    "avg_alert_response_time_min": 15.3,
                    "period_start": "2025-12-03",
                    "period_end": "2026-01-02"
                },
                "compliance": {
                    "overall_score": 0.78,
                    "risk_level": "medium",
                    "kyc_compliance": 0.82,
                    "aml_compliance": 0.75,
                    "sanctions_compliance": 0.88,
                    "documentation_quality": 0.72,
                    "detection_rate": 0.67,
                    "false_negative_rate": 0.15,
                    "alert_response_compliance": 0.70,
                    "violations": [
                        {
                            "violation_type": "missed_red_flag",
                            "severity": "medium",
                            "date": "2025-12-10T11:20:00",
                            "description": "Пропущен признак подозрительной операции",
                            "resolved": True,
                            "resolution_date": "2025-12-10T16:00:00"
                        }
                    ],
                    "violations_count_30d": 3,
                    "violations_count_90d": 5
                },
                "daily_stats": []
            }
        ],
        "team_summary": {
            "total_operators": 2,
            "avg_success_rate": 0.855,
            "avg_compliance_score": 0.875,
            "total_applications_processed": 241,
            "team_detection_rate": 0.835
        }
    }


class TestOperatorServiceInit:
    """Tests for OperatorService initialization."""
    
    def test_service_loads_demo_data(self, operator_service):
        """Test that service loads demo data on init."""
        assert operator_service.demo_data is not None
        assert "operators" in operator_service.demo_data
        assert len(operator_service.demo_data["operators"]) == 2
    
    def test_service_has_rag_and_llm(self, operator_service):
        """Test that service initializes RAG and LLM services."""
        assert operator_service.rag is not None
        assert operator_service.llm is not None


class TestGetOperatorById:
    """Tests for _get_operator_by_id method."""
    
    def test_get_existing_operator(self, operator_service):
        """Test getting existing operator by ID."""
        operator = operator_service._get_operator_by_id(SENIOR_OPERATOR_ID)
        assert operator is not None
        assert operator["profile"]["full_name"] == "Иванов Алексей Петрович"
    
    def test_get_nonexistent_operator(self, operator_service):
        """Test getting non-existent operator returns None."""
        fake_id = UUID("00000000-0000-0000-0000-000000000000")
        operator = operator_service._get_operator_by_id(fake_id)
        assert operator is None


class TestParseOperatorProfile:
    """Tests for _parse_operator_profile method."""
    
    def test_parse_senior_profile(self, operator_service):
        """Test parsing senior operator profile."""
        raw = operator_service._get_operator_by_id(SENIOR_OPERATOR_ID)
        profile = operator_service._parse_operator_profile(raw)
        
        assert profile.full_name == "Иванов Алексей Петрович"
        assert profile.level == OperatorLevel.SENIOR
        assert profile.years_of_experience == 8.5
        assert len(profile.certificates) == 1
        assert profile.certificates[0].name == "Сертификат ВЭД"
    
    def test_parse_junior_profile(self, operator_service):
        """Test parsing junior operator profile."""
        raw = operator_service._get_operator_by_id(JUNIOR_OPERATOR_ID)
        profile = operator_service._parse_operator_profile(raw)
        
        assert profile.level == OperatorLevel.JUNIOR
        assert profile.years_in_company == 0.6
        assert len(profile.certificates) == 0


class TestParseOperatorMetrics:
    """Tests for _parse_operator_metrics method."""
    
    def test_parse_metrics(self, operator_service):
        """Test parsing operator metrics."""
        raw = operator_service._get_operator_by_id(SENIOR_OPERATOR_ID)
        metrics = operator_service._parse_operator_metrics(raw)
        
        assert metrics.applications_processed == 156
        assert metrics.success_rate == 0.91
        assert metrics.compliance_score == 0.97
        assert metrics.red_flags_detected == 8
        assert metrics.red_flags_missed == 0
    
    def test_parse_junior_metrics(self, operator_service):
        """Test parsing junior operator metrics with higher error rates."""
        raw = operator_service._get_operator_by_id(JUNIOR_OPERATOR_ID)
        metrics = operator_service._parse_operator_metrics(raw)
        
        assert metrics.compliance_score == 0.78
        assert metrics.false_negative_rate == 0.15
        assert metrics.avg_processing_time_min == 52.8


class TestParseComplianceScore:
    """Tests for _parse_compliance_score method."""
    
    def test_parse_high_compliance(self, operator_service):
        """Test parsing high compliance score."""
        raw = operator_service._get_operator_by_id(SENIOR_OPERATOR_ID)
        compliance = operator_service._parse_compliance_score(raw, SENIOR_OPERATOR_ID)
        
        assert compliance.overall_score == 0.97
        assert compliance.risk_level == RiskLevel.LOW
        assert compliance.detection_rate == 1.0
        assert len(compliance.violations) == 0
    
    def test_parse_medium_compliance(self, operator_service):
        """Test parsing medium compliance score with violations."""
        raw = operator_service._get_operator_by_id(JUNIOR_OPERATOR_ID)
        compliance = operator_service._parse_compliance_score(raw, JUNIOR_OPERATOR_ID)
        
        assert compliance.overall_score == 0.78
        assert compliance.risk_level == RiskLevel.MEDIUM
        assert len(compliance.violations) == 1
        assert compliance.violations[0].violation_type == "missed_red_flag"


class TestGetOperatorsList:
    """Tests for get_operators_list method."""
    
    @pytest.mark.asyncio
    async def test_get_operators_list(self, operator_service):
        """Test getting list of all operators."""
        result = await operator_service.get_operators_list()
        
        assert result.total == 2
        assert len(result.operators) == 2
        assert result.team_stats["avg_success_rate"] == 0.855


class TestGetOperatorAnalytics:
    """Tests for get_operator_analytics method."""
    
    @pytest.mark.asyncio
    async def test_get_analytics_basic(self, operator_service):
        """Test getting basic analytics without forecast/recommendations."""
        with patch.object(operator_service.rag, 'get_context_for_query', new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = ""
            
            request = OperatorAnalyticsRequest(
                operator_id=SENIOR_OPERATOR_ID,
                include_forecast=False,
                include_recommendations=False
            )
            
            result = await operator_service.get_operator_analytics(request)
            
            assert result.operator_id == SENIOR_OPERATOR_ID
            assert result.profile.full_name == "Иванов Алексей Петрович"
            assert result.metrics.applications_processed == 156
            assert result.forecast is None
    
    @pytest.mark.asyncio
    async def test_get_analytics_with_forecast(self, operator_service):
        """Test getting analytics with forecast."""
        with patch.object(operator_service.rag, 'get_context_for_query', new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = ""
            
            request = OperatorAnalyticsRequest(
                operator_id=SENIOR_OPERATOR_ID,
                include_forecast=True,
                include_recommendations=False
            )
            
            result = await operator_service.get_operator_analytics(request)
            
            assert result.forecast is not None
            assert result.forecast.forecast_period_days == 30
            assert 0 <= result.forecast.confidence <= 1
    
    @pytest.mark.asyncio
    async def test_get_analytics_not_found(self, operator_service):
        """Test getting analytics for non-existent operator."""
        fake_id = UUID("00000000-0000-0000-0000-000000000000")
        
        request = OperatorAnalyticsRequest(operator_id=fake_id)
        
        with pytest.raises(OperatorServiceException) as exc_info:
            await operator_service.get_operator_analytics(request)
        
        assert "not found" in exc_info.value.message.lower()


class TestGenerateForecast:
    """Tests for _generate_forecast method."""
    
    @pytest.mark.asyncio
    async def test_forecast_for_senior(self, operator_service):
        """Test generating forecast for senior operator."""
        raw = operator_service._get_operator_by_id(SENIOR_OPERATOR_ID)
        profile = operator_service._parse_operator_profile(raw)
        metrics = operator_service._parse_operator_metrics(raw)
        
        forecast = await operator_service._generate_forecast(raw, profile, metrics)
        
        assert forecast.forecast_period_days == 30
        assert forecast.predicted_applications > 0
        assert 0 <= forecast.predicted_success_rate <= 1
        assert forecast.confidence > 0


class TestGenerateRecommendations:
    """Tests for _generate_recommendations method."""
    
    @pytest.mark.asyncio
    async def test_recommendations_for_junior(self, operator_service):
        """Test generating recommendations for junior operator with issues."""
        with patch.object(operator_service.rag, 'get_context_for_query', new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = ""
            
            raw = operator_service._get_operator_by_id(JUNIOR_OPERATOR_ID)
            profile = operator_service._parse_operator_profile(raw)
            metrics = operator_service._parse_operator_metrics(raw)
            compliance = operator_service._parse_compliance_score(raw, JUNIOR_OPERATOR_ID)
            
            recommendations = await operator_service._generate_recommendations(
                raw, profile, metrics, compliance, use_rag=True
            )
            
            # Junior with high false_negative_rate should get training recommendation
            assert len(recommendations) > 0
            types = [r.type.value for r in recommendations]
            assert "training" in types or "mentoring" in types


class TestCompareOperators:
    """Tests for compare_operators method."""
    
    @pytest.mark.asyncio
    async def test_compare_two_operators(self, operator_service):
        """Test comparing two operators."""
        request = OperatorCompareRequest(
            operator_ids=[SENIOR_OPERATOR_ID, JUNIOR_OPERATOR_ID],
            metrics_to_compare=["success_rate", "compliance_score"]
        )
        
        result = await operator_service.compare_operators(request)
        
        assert len(result.operators) == 2
        assert result.best_performer == SENIOR_OPERATOR_ID  # Senior should be best
        assert "success_rate" in result.team_averages


class TestGetRecommendations:
    """Tests for get_recommendations method."""
    
    @pytest.mark.asyncio
    async def test_get_recommendations(self, operator_service):
        """Test getting recommendations for operator."""
        with patch.object(operator_service.rag, 'get_context_for_query', new_callable=AsyncMock) as mock_rag:
            mock_rag.return_value = ""
            
            request = RecommendationsRequest(
                operator_id=JUNIOR_OPERATOR_ID,
                use_rag=False,
                max_recommendations=5
            )
            
            result = await operator_service.get_recommendations(request)
            
            assert len(result.recommendations) <= 5
            assert result.operator_id == JUNIOR_OPERATOR_ID


class TestGetOperatorCompliance:
    """Tests for get_operator_compliance method."""
    
    @pytest.mark.asyncio
    async def test_get_compliance(self, operator_service):
        """Test getting compliance score for operator."""
        result = await operator_service.get_operator_compliance(SENIOR_OPERATOR_ID)
        
        assert result.operator_id == SENIOR_OPERATOR_ID
        assert result.overall_score == 0.97
        assert result.risk_level == RiskLevel.LOW
    
    @pytest.mark.asyncio
    async def test_get_compliance_not_found(self, operator_service):
        """Test getting compliance for non-existent operator."""
        fake_id = UUID("00000000-0000-0000-0000-000000000000")
        
        with pytest.raises(OperatorServiceException):
            await operator_service.get_operator_compliance(fake_id)
