"""Unit tests for FEA-stage handlers (Counterparty, Contract, Currency).

Tests handler logic with mocked FEA-stage client.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.database.schemas.intent import IntentResult, IntentType, EntityType, ExtractedEntity
from app.services.chat_handlers.counterparty_handler import CounterpartyHandler
from app.services.chat_handlers.contract_handler import ContractHandler
from app.services.chat_handlers.currency_handler import CurrencyHandler
from app.integrations import (
    Counterparty,
    CounterpartyType,
    CounterpartyApprovalStatus,
    CounterpartyWithStatistics,
    CounterpartyListResponse,
    CounterpartyRequest,
    CounterpartyRequestsResponse,
    Contract,
    ContractStatus,
    ContractListResponse,
    ContractDiadocStatusResponse,
    DiadocDocumentStatus,
    CurrencyRate,
    CurrencyRateShort,
    CurrencySource,
    CurrencyDashboardResponse,
    FeaStageNotConfiguredError,
    FeaStageConnectionError,
    FeaStageAuthError,
)


# ============================================
# Fixtures
# ============================================

@pytest.fixture
def mock_db():
    """Mock database session."""
    return MagicMock()


@pytest.fixture
def counterparty_intent_list():
    """Intent result for listing counterparties."""
    return IntentResult(
        intent=IntentType.LIST_COUNTERPARTIES,
        confidence=0.9,
        entities=[],
        original_message="покажи список контрагентов"
    )


@pytest.fixture
def counterparty_intent_get():
    """Intent result for getting a counterparty."""
    return IntentResult(
        intent=IntentType.GET_COUNTERPARTY,
        confidence=0.9,
        entities=[
            ExtractedEntity(
                type=EntityType.COUNTERPARTY_ID,
                value="123e4567-e89b-12d3-a456-426614174000",
                raw_text="123e4567-e89b-12d3-a456-426614174000"
            )
        ],
        original_message="информация о контрагенте 123e4567-e89b-12d3-a456-426614174000"
    )


@pytest.fixture
def contract_intent_list():
    """Intent result for listing contracts."""
    return IntentResult(
        intent=IntentType.LIST_CONTRACTS,
        confidence=0.9,
        entities=[],
        original_message="покажи мои контракты"
    )


@pytest.fixture
def currency_intent_rates():
    """Intent result for getting currency rates."""
    return IntentResult(
        intent=IntentType.GET_CURRENCY_RATES,
        confidence=0.9,
        entities=[],
        original_message="курсы валют"
    )


@pytest.fixture
def currency_intent_by_symbol():
    """Intent result for getting a specific currency rate."""
    return IntentResult(
        intent=IntentType.GET_CURRENCY_BY_SYMBOL,
        confidence=0.9,
        entities=[
            ExtractedEntity(
                type=EntityType.CURRENCY_SYMBOL,
                value="USD",
                raw_text="доллар"
            )
        ],
        original_message="курс доллара"
    )


@pytest.fixture
def sample_counterparties():
    """Sample counterparty list response."""
    return CounterpartyListResponse(
        counterparties=[
            CounterpartyWithStatistics(
                id="123e4567-e89b-12d3-a456-426614174000",
                name="ABC Trading Ltd",
                country="Germany",
                type=CounterpartyType.FOREIGN,
                last_approval_status=CounterpartyApprovalStatus.APPROVED
            ),
            CounterpartyWithStatistics(
                id="223e4567-e89b-12d3-a456-426614174001",
                name="XYZ Import Co",
                country="China",
                type=CounterpartyType.FOREIGN,
                last_approval_status=CounterpartyApprovalStatus.PENDING
            )
        ],
        total=2,
        page=1,
        page_size=20,
        has_next=False
    )


@pytest.fixture
def sample_counterparty():
    """Sample single counterparty."""
    return Counterparty(
        id="123e4567-e89b-12d3-a456-426614174000",
        name="ABC Trading Ltd",
        country="Germany",
        type=CounterpartyType.FOREIGN,
        inn=None,
        legal_address="Berlin, Germany",
        banks=[],
        last_approval_status=CounterpartyApprovalStatus.APPROVED,
        last_approval_date="2025-01-15T10:00:00Z",
        created_at="2024-12-01T10:00:00Z"
    )


@pytest.fixture
def sample_contracts():
    """Sample contract list response."""
    return ContractListResponse(
        contracts=[
            Contract(
                id="contract-001",
                number="АГ-001",
                name="Агентский договор",
                status=ContractStatus.ACTIVE,
                diadoc_status=DiadocDocumentStatus.SIGNED
            ),
            Contract(
                id="contract-002",
                number="АГ-002",
                name="Договор поставки",
                status=ContractStatus.DRAFT,
                diadoc_status=None
            )
        ],
        total=2,
        page=1,
        page_size=20,
        has_next=False
    )


@pytest.fixture
def sample_currency_rates():
    """Sample currency rates response."""
    return CurrencyDashboardResponse(
        rates=[
            CurrencyRateShort(symbol="USD", rate=92.50, base="RUB", change_percent=0.15),
            CurrencyRateShort(symbol="EUR", rate=100.25, base="RUB", change_percent=-0.10),
            CurrencyRateShort(symbol="CNY", rate=12.75, base="RUB", change_percent=0.05)
        ],
        base_currency="RUB",
        updated_at="2025-01-20T10:00:00Z"
    )


@pytest.fixture
def sample_currency_rate():
    """Sample single currency rate."""
    return CurrencyRate(
        id="rate-001",
        symbol="USD",
        source=CurrencySource.CBR,
        rate=92.50,
        base_currency="RUB",
        inverse_rate=0.0108,
        date="2025-01-20",
        updated_at="2025-01-20T10:00:00Z"
    )


# ============================================
# Counterparty Handler Tests
# ============================================

class TestCounterpartyHandler:
    """Tests for CounterpartyHandler."""
    
    @pytest.mark.asyncio
    async def test_handle_list_success(self, mock_db, counterparty_intent_list, sample_counterparties):
        """Test successful counterparty list retrieval."""
        with patch('app.services.chat_handlers.counterparty_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_counterparties = AsyncMock(return_value=sample_counterparties)
            mock_get_client.return_value = mock_client
            
            handler = CounterpartyHandler(mock_db)
            result = await handler.handle(counterparty_intent_list)
            
            assert result.context_used is True
            assert result.model == "vili-fea-stage"
            assert "ABC Trading" in result.answer
            assert "XYZ Import" in result.answer
            assert result.embedded_data["type"] == "counterparty_list"
            assert result.embedded_data["total"] == 2
    
    @pytest.mark.asyncio
    async def test_handle_list_empty(self, mock_db, counterparty_intent_list):
        """Test counterparty list when no counterparties found."""
        with patch('app.services.chat_handlers.counterparty_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_counterparties = AsyncMock(return_value=CounterpartyListResponse(
                counterparties=[],
                total=0,
                page=1,
                page_size=20,
                has_next=False
            ))
            mock_get_client.return_value = mock_client
            
            handler = CounterpartyHandler(mock_db)
            result = await handler.handle(counterparty_intent_list)
            
            assert "не найдены" in result.answer.lower()
    
    @pytest.mark.asyncio
    async def test_handle_get_success(self, mock_db, counterparty_intent_get, sample_counterparty):
        """Test successful counterparty details retrieval."""
        with patch('app.services.chat_handlers.counterparty_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_counterparty = AsyncMock(return_value=sample_counterparty)
            mock_get_client.return_value = mock_client
            
            handler = CounterpartyHandler(mock_db)
            result = await handler.handle(counterparty_intent_get)
            
            assert result.context_used is True
            assert "ABC Trading" in result.answer
            assert "Germany" in result.answer
            assert result.embedded_data["type"] == "counterparty_details"
    
    @pytest.mark.asyncio
    async def test_handle_not_configured(self, mock_db, counterparty_intent_list):
        """Test response when fea-stage is not configured."""
        with patch('app.services.chat_handlers.counterparty_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = False
            mock_get_client.return_value = mock_client
            
            handler = CounterpartyHandler(mock_db)
            result = await handler.handle(counterparty_intent_list)
            
            assert "не настроена" in result.answer.lower()
            assert result.context_used is False
    
    @pytest.mark.asyncio
    async def test_handle_connection_error(self, mock_db, counterparty_intent_list):
        """Test response on connection error."""
        with patch('app.services.chat_handlers.counterparty_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_counterparties = AsyncMock(
                side_effect=FeaStageConnectionError("Connection failed")
            )
            mock_get_client.return_value = mock_client
            
            handler = CounterpartyHandler(mock_db)
            result = await handler.handle(counterparty_intent_list)
            
            assert "не удалось подключиться" in result.answer.lower()


# ============================================
# Contract Handler Tests
# ============================================

class TestContractHandler:
    """Tests for ContractHandler."""
    
    @pytest.mark.asyncio
    async def test_handle_list_success(self, mock_db, contract_intent_list, sample_contracts):
        """Test successful contract list retrieval."""
        with patch('app.services.chat_handlers.contract_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_contracts = AsyncMock(return_value=sample_contracts)
            mock_get_client.return_value = mock_client
            
            handler = ContractHandler(mock_db)
            result = await handler.handle(contract_intent_list)
            
            assert result.context_used is True
            assert result.model == "vili-fea-stage"
            assert "АГ-001" in result.answer
            assert "АГ-002" in result.answer
            assert result.embedded_data["type"] == "contract_list"
    
    @pytest.mark.asyncio
    async def test_handle_list_empty(self, mock_db, contract_intent_list):
        """Test contract list when no contracts found."""
        with patch('app.services.chat_handlers.contract_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_contracts = AsyncMock(return_value=ContractListResponse(
                contracts=[],
                total=0,
                page=1,
                page_size=20,
                has_next=False
            ))
            mock_get_client.return_value = mock_client
            
            handler = ContractHandler(mock_db)
            result = await handler.handle(contract_intent_list)
            
            assert "не найдены" in result.answer.lower()
    
    @pytest.mark.asyncio
    async def test_handle_not_configured(self, mock_db, contract_intent_list):
        """Test response when fea-stage is not configured."""
        with patch('app.services.chat_handlers.contract_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = False
            mock_get_client.return_value = mock_client
            
            handler = ContractHandler(mock_db)
            result = await handler.handle(contract_intent_list)
            
            assert "не настроена" in result.answer.lower()


# ============================================
# Currency Handler Tests
# ============================================

class TestCurrencyHandler:
    """Tests for CurrencyHandler."""
    
    @pytest.mark.asyncio
    async def test_handle_rates_success(self, mock_db, currency_intent_rates, sample_currency_rates):
        """Test successful currency rates retrieval."""
        with patch('app.services.chat_handlers.currency_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_currency_rates = AsyncMock(return_value=sample_currency_rates)
            mock_get_client.return_value = mock_client
            
            handler = CurrencyHandler(mock_db)
            result = await handler.handle(currency_intent_rates)
            
            assert result.context_used is True
            assert result.model == "vili-fea-stage"
            assert "USD" in result.answer
            assert "EUR" in result.answer
            assert result.embedded_data["type"] == "currency_rates"
    
    @pytest.mark.asyncio
    async def test_handle_by_symbol_success(self, mock_db, currency_intent_by_symbol, sample_currency_rate):
        """Test successful single currency rate retrieval."""
        with patch('app.services.chat_handlers.currency_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_currency_by_symbol = AsyncMock(return_value=sample_currency_rate)
            mock_get_client.return_value = mock_client
            
            handler = CurrencyHandler(mock_db)
            result = await handler.handle(currency_intent_by_symbol)
            
            assert result.context_used is True
            assert "USD" in result.answer
            assert "92.50" in result.answer or "92,50" in result.answer
            assert result.embedded_data["type"] == "currency_rate"
            assert result.embedded_data["symbol"] == "USD"
    
    @pytest.mark.asyncio
    async def test_handle_not_configured(self, mock_db, currency_intent_rates):
        """Test response when fea-stage is not configured."""
        with patch('app.services.chat_handlers.currency_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = False
            mock_get_client.return_value = mock_client
            
            handler = CurrencyHandler(mock_db)
            result = await handler.handle(currency_intent_rates)
            
            assert "не настроена" in result.answer.lower()
    
    @pytest.mark.asyncio
    async def test_handle_auth_error(self, mock_db, currency_intent_rates):
        """Test response on authentication error."""
        with patch('app.services.chat_handlers.currency_handler.get_fea_stage_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_configured = True
            mock_client.get_currency_rates = AsyncMock(
                side_effect=FeaStageAuthError("Auth failed")
            )
            mock_get_client.return_value = mock_client
            
            handler = CurrencyHandler(mock_db)
            result = await handler.handle(currency_intent_rates)
            
            assert "аутентификации" in result.answer.lower()


# ============================================
# Intent Detection Tests
# ============================================

class TestFEAStageIntentDetection:
    """Tests for intent detection of FEA-stage related queries."""
    
    def test_detect_counterparty_list_intent(self):
        """Test detection of counterparty list intent."""
        from app.services.intent_detector import get_intent_detector
        
        detector = get_intent_detector()
        
        test_messages = [
            "покажи список контрагентов",
            "мои контрагенты",
            "контрагенты из Германии",
        ]
        
        for msg in test_messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.LIST_COUNTERPARTIES, f"Failed for: {msg}"
    
    def test_detect_contract_list_intent(self):
        """Test detection of contract list intent."""
        from app.services.intent_detector import get_intent_detector
        
        detector = get_intent_detector()
        
        test_messages = [
            "покажи мои контракты",
            "список договоров",
        ]
        
        for msg in test_messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.LIST_CONTRACTS, f"Failed for: {msg}"
    
    def test_detect_currency_rates_intent(self):
        """Test detection of currency rates intent."""
        from app.services.intent_detector import get_intent_detector
        
        detector = get_intent_detector()
        
        test_messages = [
            "курсы валют",
            "покажи курсы",
        ]
        
        for msg in test_messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.GET_CURRENCY_RATES, f"Failed for: {msg}"
    
    def test_detect_currency_by_symbol_intent(self):
        """Test detection of specific currency intent."""
        from app.services.intent_detector import get_intent_detector
        
        detector = get_intent_detector()
        
        test_messages = [
            "курс доллара",
            "сколько стоит евро",
        ]
        
        for msg in test_messages:
            result = detector.detect_intent(msg)
            assert result.intent == IntentType.GET_CURRENCY_BY_SYMBOL, f"Failed for: {msg}"
