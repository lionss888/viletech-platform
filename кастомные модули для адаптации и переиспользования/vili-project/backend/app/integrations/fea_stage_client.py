"""fea-stage Integration Client.

Provides client for communicating with fea-stage API for form payments,
operator data, and other business operations.
"""

import httpx
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from enum import Enum

from app.core.config import settings

logger = logging.getLogger(__name__)


class FeaStageError(Exception):
    """Base exception for fea-stage integration errors."""
    pass


class FeaStageConnectionError(FeaStageError):
    """Error connecting to fea-stage API."""
    pass


class FeaStageNotConfiguredError(FeaStageError):
    """fea-stage integration is not configured."""
    pass


class FeaStageAuthError(FeaStageError):
    """Authentication error with fea-stage API."""
    pass


class FormPaymentStatus(str, Enum):
    """Статусы заявок на платёж (из fea-stage)."""
    # Основные статусы
    CREATING = "creating"
    DRAFT = "draft"
    # Проверка организации
    ORGANIZATION_WAITING_VERIFICATION = "organization_waiting_verification"
    ORGANIZATION_VERIFICATION = "organization_verification"
    # Проверка формы
    FORM_WAITING_VERIFICATION = "form_waiting_verification"
    FORM_WAITING_CORRECTIONS = "form_waiting_corrections"
    FORM_VERIFICATION = "form_verification"
    FORM_ACCEPTED = "form_accepted"
    # Подписание поручения
    SIGNING_ORDER = "signing_order"
    SIGNING_ORDER_WAITING_VERIFICATION = "signing_order_waiting_verification"
    SIGNING_ORDER_WAITING_CORRECTIONS = "signing_order_waiting_corrections"
    SIGNING_ORDER_VERIFICATION = "signing_order_verification"
    SIGNING_ORDER_ACCEPTED = "signing_order_accepted"
    # Платёж
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_PROCESSING = "payment_processing"
    PAYMENT_SENT = "payment_sent"
    # Отчёт
    REPORT_WAITING = "report_waiting"
    REPORT_WAITING_VERIFICATION = "report_waiting_verification"
    REPORT_WAITING_CORRECTIONS = "report_waiting_corrections"
    REPORT_VERIFICATION = "report_verification"
    REPORT_ACCEPTED = "report_accepted"
    # Закрытие
    CLOSE = "close"
    # Fallback
    UNKNOWN = "unknown"
    
    @classmethod
    def _missing_(cls, value):
        """Обработка неизвестных статусов."""
        return cls.UNKNOWN


class FormPayment(BaseModel):
    """Модель заявки на платёж."""
    id: str
    status: FormPaymentStatus
    amount: float
    currency: str = "USD"
    counterparty: Optional[str] = None
    purpose: Optional[str] = None
    operator_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class FormPaymentCreateRequest(BaseModel):
    """Запрос на создание заявки."""
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD")
    counterparty: str
    purpose: str


class FormPaymentListResponse(BaseModel):
    """Ответ со списком заявок."""
    payments: List[FormPayment]
    total: int
    page: int = 1
    page_size: int = 20


# ============================================
# Counterparty Models (Контрагенты)
# ============================================

class CounterpartyType(str, Enum):
    """Типы контрагентов."""
    FOREIGN = "foreign"
    RUSSIAN = "russian"
    UNKNOWN = "unknown"
    
    @classmethod
    def _missing_(cls, value):
        return cls.UNKNOWN


class CounterpartyApprovalStatus(str, Enum):
    """Статусы одобрения контрагента."""
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"
    NOT_REVIEWED = "not_reviewed"
    UNKNOWN = "unknown"
    
    @classmethod
    def _missing_(cls, value):
        return cls.UNKNOWN


class CounterpartyBankAccount(BaseModel):
    """Банковский счёт контрагента."""
    uuid: Optional[str] = None
    account_number: Optional[str] = Field(None, alias="accountNumber")
    currency: str = "USD"
    is_primary: bool = Field(False, alias="isPrimary")
    
    class Config:
        populate_by_name = True


class CounterpartyBank(BaseModel):
    """Банк контрагента."""
    uuid: Optional[str] = None
    bank_name: Optional[str] = Field(None, alias="bankName")
    bank_country: Optional[str] = Field(None, alias="bankCountry")
    bank_address: Optional[str] = Field(None, alias="bankAddress")
    swift_code: Optional[str] = Field(None, alias="swiftCode")
    accounts: List[CounterpartyBankAccount] = Field(default_factory=list)
    
    class Config:
        populate_by_name = True


class CounterpartyApprovalHistory(BaseModel):
    """История одобрения контрагента."""
    status: CounterpartyApprovalStatus = CounterpartyApprovalStatus.NOT_REVIEWED
    approved_by: Optional[str] = Field(None, alias="approvedBy")
    approved_at: Optional[str] = Field(None, alias="approvedAt")
    comment: Optional[str] = None
    
    class Config:
        populate_by_name = True


class Counterparty(BaseModel):
    """Модель контрагента."""
    id: str
    name: str
    country: Optional[str] = None
    type: CounterpartyType = CounterpartyType.UNKNOWN
    inn: Optional[str] = None
    legal_address: Optional[str] = Field(None, alias="legalAddress")
    banks: List[CounterpartyBank] = Field(default_factory=list)
    last_approval_status: CounterpartyApprovalStatus = Field(
        CounterpartyApprovalStatus.NOT_REVIEWED,
        alias="lastApprovalStatus"
    )
    last_approval_date: Optional[str] = Field(None, alias="lastApprovalDate")
    created_by: Optional[str] = Field(None, alias="createdBy")
    created_at: Optional[str] = Field(None, alias="createDate")
    updated_at: Optional[str] = Field(None, alias="updateDate")
    
    class Config:
        populate_by_name = True


class CounterpartyStatistics(BaseModel):
    """Статистика контрагента."""
    total_requests: int = Field(0, alias="totalRequests")
    approved_requests: int = Field(0, alias="approvedRequests")
    rejected_requests: int = Field(0, alias="rejectedRequests")
    pending_requests: int = Field(0, alias="pendingRequests")
    total_amount: float = Field(0.0, alias="totalAmount")
    
    class Config:
        populate_by_name = True


class CounterpartyWithStatistics(Counterparty):
    """Контрагент со статистикой."""
    statistics: Optional[CounterpartyStatistics] = None


class CounterpartyListResponse(BaseModel):
    """Ответ со списком контрагентов."""
    counterparties: List[CounterpartyWithStatistics]
    total: int
    page: int = 1
    page_size: int = Field(20, alias="pageSize")
    has_next: bool = Field(False, alias="hasNext")
    
    class Config:
        populate_by_name = True


class CounterpartyRequest(BaseModel):
    """Запрос (заявка) контрагента."""
    id: str
    number: Optional[str] = None
    status: str
    amount: float = 0.0
    currency: str = "USD"
    created_at: Optional[str] = Field(None, alias="createDate")
    
    class Config:
        populate_by_name = True


class CounterpartyRequestsResponse(BaseModel):
    """Ответ со списком запросов контрагента."""
    requests: List[CounterpartyRequest]
    total: int
    page: int = 1
    page_size: int = Field(20, alias="pageSize")
    
    class Config:
        populate_by_name = True


# ============================================
# Contract Models (Контракты)
# ============================================

class ContractStatus(str, Enum):
    """Статусы контракта."""
    DRAFT = "draft"
    ACTIVE = "active"
    SIGNED = "signed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    UNKNOWN = "unknown"
    
    @classmethod
    def _missing_(cls, value):
        return cls.UNKNOWN


class DiadocDocumentStatus(str, Enum):
    """Статусы документа в Diadoc."""
    DRAFT = "draft"
    SENT = "sent"
    DELIVERED = "delivered"
    SIGNED = "signed"
    REJECTED = "rejected"
    REVOKED = "revoked"
    UNKNOWN = "unknown"
    
    @classmethod
    def _missing_(cls, value):
        return cls.UNKNOWN


class Contract(BaseModel):
    """Модель контракта."""
    id: str
    number: Optional[str] = None
    name: Optional[str] = None
    contract_type: Optional[str] = Field(None, alias="type")
    status: ContractStatus = ContractStatus.UNKNOWN
    organization_id: Optional[str] = Field(None, alias="organization")
    agent_id: Optional[str] = Field(None, alias="agent")
    file_id: Optional[str] = Field(None, alias="file")
    is_template: bool = Field(False, alias="isTemplate")
    diadoc_document_id: Optional[str] = Field(None, alias="diadocDocumentId")
    diadoc_message_id: Optional[str] = Field(None, alias="diadocMessageId")
    diadoc_status: Optional[DiadocDocumentStatus] = Field(None, alias="diadocStatus")
    created_at: Optional[str] = Field(None, alias="createDate")
    updated_at: Optional[str] = Field(None, alias="updateDate")
    
    class Config:
        populate_by_name = True


class ContractListResponse(BaseModel):
    """Ответ со списком контрактов."""
    contracts: List[Contract]
    total: int
    page: int = 1
    page_size: int = Field(20, alias="pageSize")
    has_next: bool = Field(False, alias="hasNext")
    
    class Config:
        populate_by_name = True


class ContractDiadocStatusResponse(BaseModel):
    """Ответ со статусом контракта в Diadoc."""
    status: DiadocDocumentStatus
    document_id: Optional[str] = Field(None, alias="documentId")
    message_id: Optional[str] = Field(None, alias="messageId")
    
    class Config:
        populate_by_name = True


# ============================================
# Currency Models (Валюты и курсы)
# ============================================

class CurrencySource(str, Enum):
    """Источники курсов валют."""
    CBR = "cbr"
    OPENEXCHANGE = "openexchange"
    MANUAL = "manual"
    UNKNOWN = "unknown"
    
    @classmethod
    def _missing_(cls, value):
        return cls.UNKNOWN


class CurrencyRate(BaseModel):
    """Модель курса валюты."""
    id: Optional[str] = None
    symbol: str
    source: CurrencySource = CurrencySource.UNKNOWN
    rate: float
    base_currency: str = Field("RUB", alias="baseCurrency")
    inverse_rate: Optional[float] = Field(None, alias="inverseRate")
    date: Optional[str] = None
    updated_at: Optional[str] = Field(None, alias="updateDate")
    
    class Config:
        populate_by_name = True


class CurrencyRateShort(BaseModel):
    """Краткая модель курса валюты (для дашборда)."""
    symbol: str
    rate: float
    base: str = "RUB"
    change_percent: Optional[float] = Field(None, alias="changePercent")
    
    class Config:
        populate_by_name = True


class CurrencyListResponse(BaseModel):
    """Ответ со списком валют."""
    currencies: List[CurrencyRate]
    total: int
    page: int = 1
    page_size: int = Field(20, alias="pageSize")
    
    class Config:
        populate_by_name = True


class CurrencyDashboardResponse(BaseModel):
    """Ответ с курсами для дашборда."""
    rates: List[CurrencyRateShort]
    base_currency: str = Field("RUB", alias="baseCurrency")
    updated_at: Optional[str] = Field(None, alias="updateDate")
    
    class Config:
        populate_by_name = True


class FeaStageClient:
    """Клиент для интеграции с fea-stage API.
    
    Поддерживает два режима аутентификации:
    1. Статический API ключ (FEA_STAGE_API_KEY)
    2. Динамический логин (FEA_STAGE_EMAIL + FEA_STAGE_PASSWORD)
    """
    
    def __init__(self):
        """Инициализация клиента."""
        self.base_url = settings.FEA_STAGE_API_URL
        self.api_key = settings.FEA_STAGE_API_KEY
        self.email = getattr(settings, 'FEA_STAGE_EMAIL', '')
        self.password = getattr(settings, 'FEA_STAGE_PASSWORD', '')
        self.timeout = settings.FEA_STAGE_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None
        self._access_token: Optional[str] = None
    
    @property
    def is_configured(self) -> bool:
        """Проверка, настроена ли интеграция."""
        # Можно использовать либо API ключ, либо логин/пароль
        return bool(self.base_url and (self.api_key or (self.email and self.password)))
    
    async def _authenticate(self) -> str:
        """Получение токена через логин."""
        if not self.email or not self.password:
            raise FeaStageAuthError("Email or password not configured for fea-stage")
        
        auth_url = f"{self.base_url}/auth/login"
        logger.debug(f"Attempting authentication to fea-stage at {auth_url} with email: {self.email}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    auth_url,
                    json={"email": self.email, "password": self.password},
                    headers={"Content-Type": "application/json"}
                )
                
                # Логируем детали ответа для отладки
                logger.debug(
                    f"fea-stage auth response: status={response.status_code}, "
                    f"headers={dict(response.headers)}, "
                    f"text={response.text[:200] if response.text else 'empty'}"
                )
                
                # Принимаем как 200, так и 201 как успешные ответы
                if response.status_code not in (200, 201):
                    response.raise_for_status()
                
                data = response.json()
                
                access_token = data.get("accessToken") or data.get("access_token") or data.get("token")
                if not access_token:
                    logger.error(f"fea-stage auth response missing token. Response: {data}")
                    raise FeaStageAuthError(
                        "Authentication succeeded but no token received. "
                        f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}"
                    )
                
                logger.debug(f"Successfully authenticated to fea-stage, token length: {len(access_token)}")
                return access_token
                
        except httpx.RequestError as e:
            logger.error(f"Connection error during fea-stage authentication: {str(e)}")
            raise FeaStageConnectionError(f"Failed to authenticate: {str(e)}")
        except httpx.HTTPStatusError as e:
            error_detail = ""
            try:
                error_data = e.response.json()
                error_detail = error_data.get("detail", error_data.get("message", error_data.get("error", "")))
            except:
                error_detail = e.response.text[:200] if e.response.text else ""
            
            # Различаем ошибки аутентификации (400/401/403/404) и серверные ошибки (500+)
            # 400 может быть ошибкой аутентификации если пароль неверный
            # 404 может быть ошибкой аутентификации если пользователь не найден
            is_incorrect_password = (
                e.response.status_code == 400 and (
                    "incorrect password" in error_detail.lower() or
                    "wrong password" in error_detail.lower() or
                    "invalid password" in error_detail.lower()
                )
            )
            is_account_not_found = (
                e.response.status_code == 404 and (
                    "account not found" in error_detail.lower() or
                    "user not found" in error_detail.lower() or
                    "not found" in error_detail.lower()
                )
            )
            is_auth_error = (
                e.response.status_code in (401, 403) or 
                is_incorrect_password or 
                is_account_not_found
            )
            
            if is_auth_error:
                if is_incorrect_password:
                    logger.warning(
                        f"fea-stage authentication failed: Incorrect password. "
                        f"Email: {self.email}"
                    )
                    error_msg = f"Authentication failed: {e.response.status_code} - Incorrect password"
                else:
                    logger.warning(
                        f"fea-stage authentication failed ({e.response.status_code}): "
                        f"Email: {self.email}, Error: {error_detail[:100]}"
                    )
                    error_msg = f"Authentication failed: {e.response.status_code}"
                    if error_detail:
                        error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            elif e.response.status_code >= 500:
                # Серверная ошибка - это не проблема аутентификации, а проблема на стороне fea-stage
                logger.error(
                    f"fea-stage server error during authentication: {e.response.status_code}. "
                    f"URL: {auth_url}, Error: {error_detail[:100]}"
                )
                raise FeaStageError(
                    f"fea-stage server error during authentication: {e.response.status_code}. "
                    f"This is a server-side issue, not an authentication problem. "
                    f"Details: {error_detail[:200] if error_detail else 'No details available'}"
                )
            elif e.response.status_code == 404:
                # 404 может быть и ошибкой аутентификации (если не попали в is_auth_error)
                # и ошибкой маршрута (неправильный URL)
                logger.warning(
                    f"fea-stage endpoint not found (404): URL: {auth_url}, Error: {error_detail[:100]}"
                )
                raise FeaStageError(
                    f"fea-stage endpoint not found (404). "
                    f"Check if FEA_STAGE_API_URL is correct. "
                    f"Expected endpoint: /auth/login. "
                    f"Details: {error_detail[:200] if error_detail else 'Endpoint not found'}"
                )
            else:
                # Другие ошибки (400 и т.д.)
                logger.warning(
                    f"fea-stage authentication error: {e.response.status_code}. "
                    f"Error: {error_detail[:100]}"
                )
                raise FeaStageAuthError(
                    f"Authentication failed: {e.response.status_code} - {error_detail[:200] if error_detail else 'Unknown error'}"
                )
    
    async def _get_token(self) -> str:
        """Получение актуального токена."""
        # Если есть статический API ключ, используем его
        if self.api_key and self.api_key.strip():
            return self.api_key.strip()
        
        # Иначе получаем токен динамически
        if not self._access_token:
            self._access_token = await self._authenticate()
        
        if not self._access_token:
            raise FeaStageAuthError("Failed to obtain authentication token")
        
        return self._access_token
    
    async def _refresh_token_if_needed(self) -> None:
        """Обновление токена при необходимости."""
        if not self.api_key and self._access_token:
            # Можно добавить логику проверки истечения токена
            pass
    
    def _check_configured(self) -> None:
        """Проверка настройки и выброс исключения если не настроено."""
        if not self.is_configured:
            raise FeaStageNotConfiguredError(
                "fea-stage integration is not configured. "
                "Set FEA_STAGE_API_URL and FEA_STAGE_API_KEY environment variables."
            )
    
    async def _get_headers(self) -> Dict[str, str]:
        """Получение заголовков для запросов."""
        token = await self._get_token()
        if not token:
            logger.error("Failed to obtain authentication token for fea-stage")
            raise FeaStageAuthError("Authentication token is empty")
        
        # Логируем только факт использования API ключа (без самого ключа)
        auth_method = "API key" if self.api_key else "dynamic token"
        logger.debug(f"Using {auth_method} for fea-stage authentication")
        
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Получение HTTP клиента с актуальным токеном."""
        headers = await self._get_headers()
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout
            )
        else:
            # Обновляем заголовки на случай обновления токена
            self._client.headers.update(headers)
        return self._client
    
    async def close(self) -> None:
        """Закрытие HTTP клиента."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def get_form_payments(
        self,
        status: Optional[FormPaymentStatus] = None,
        operator_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> FormPaymentListResponse:
        """Получение списка заявок на платежи.
        
        Args:
            status: Фильтр по статусу
            operator_id: Фильтр по оператору
            page: Номер страницы
            page_size: Размер страницы
            
        Returns:
            FormPaymentListResponse: Список заявок
            
        Raises:
            FeaStageNotConfiguredError: Если интеграция не настроена
            FeaStageConnectionError: При ошибке соединения
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            params = {
                "page": page,
                "limit": page_size
            }
            if status:
                params["status"] = status.value
            if operator_id:
                params["operatorId"] = operator_id
            
            response = await client.get("/form-payment", params=params)
            response.raise_for_status()
            
            data = response.json()
            
            payments = [
                FormPayment(
                    id=str(p.get("_id", p.get("id", ""))),
                    status=FormPaymentStatus(p.get("status", "pending")),
                    amount=float(p.get("amount", 0)),
                    currency=p.get("currency", "USD"),
                    counterparty=p.get("counterparty"),
                    purpose=p.get("purpose"),
                    operator_id=str(p.get("operatorId", "")) if p.get("operatorId") else None,
                    created_at=p.get("createDate"),
                    updated_at=p.get("updateDate")
                )
                for p in data.get("items", data.get("payments", []))
            ]
            
            return FormPaymentListResponse(
                payments=payments,
                total=data.get("total", len(payments)),
                page=page,
                page_size=page_size
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_form_payment(self, payment_id: str) -> Optional[FormPayment]:
        """Получение заявки по ID.
        
        Args:
            payment_id: ID заявки
            
        Returns:
            FormPayment или None если не найдена
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            response = await client.get(f"/form-payment/{payment_id}")
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            p = response.json()
            
            return FormPayment(
                id=str(p.get("_id", p.get("id", ""))),
                status=FormPaymentStatus(p.get("status", "pending")),
                amount=float(p.get("amount", 0)),
                currency=p.get("currency", "USD"),
                counterparty=p.get("counterparty"),
                purpose=p.get("purpose"),
                operator_id=str(p.get("operatorId", "")) if p.get("operatorId") else None,
                created_at=p.get("createDate"),
                updated_at=p.get("updateDate")
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def create_form_payment(
        self, 
        request: FormPaymentCreateRequest
    ) -> FormPayment:
        """Создание заявки на платёж.
        
        Args:
            request: Данные для создания заявки
            
        Returns:
            FormPayment: Созданная заявка
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            response = await client.post(
                "/form-payment",
                json=request.model_dump()
            )
            response.raise_for_status()
            
            p = response.json()
            
            return FormPayment(
                id=str(p.get("_id", p.get("id", ""))),
                status=FormPaymentStatus(p.get("status", "draft")),
                amount=float(p.get("amount", request.amount)),
                currency=p.get("currency", request.currency),
                counterparty=p.get("counterparty", request.counterparty),
                purpose=p.get("purpose", request.purpose),
                created_at=p.get("createDate")
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_operator_statistics(
        self,
        operator_id: str,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """Получение статистики оператора из fea-stage.
        
        Args:
            operator_id: ID оператора
            period_days: Период в днях
            
        Returns:
            Dict: Статистика оператора
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            response = await client.get(
                f"/api/operators/{operator_id}/statistics",
                params={"periodDays": period_days}
            )
            
            if response.status_code == 404:
                return {}
            
            response.raise_for_status()
            return response.json()
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    # ============================================
    # Counterparty Methods (Контрагенты)
    # ============================================
    
    async def get_counterparties(
        self,
        name: Optional[str] = None,
        country: Optional[str] = None,
        approval_status: Optional[CounterpartyApprovalStatus] = None,
        page: int = 1,
        page_size: int = 20
    ) -> CounterpartyListResponse:
        """Получение списка контрагентов.
        
        Args:
            name: Фильтр по имени (поиск)
            country: Фильтр по стране
            approval_status: Фильтр по статусу одобрения
            page: Номер страницы
            page_size: Размер страницы
            
        Returns:
            CounterpartyListResponse: Список контрагентов
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            params: Dict[str, Any] = {
                "page": page,
                "limit": page_size
            }
            if name:
                params["name"] = name
            if country:
                params["country"] = country
            if approval_status:
                params["lastApprovalStatus"] = approval_status.value
            
            response = await client.get("/counterparty/list", params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Обрабатываем ответ - может быть items или docs в зависимости от API
            items = data.get("items", data.get("docs", []))
            
            counterparties = []
            for c in items:
                banks = []
                for b in c.get("banks", []):
                    accounts = [
                        CounterpartyBankAccount(
                            uuid=a.get("uuid"),
                            account_number=a.get("accountNumber"),
                            currency=a.get("currency", "USD"),
                            is_primary=a.get("isPrimary", False)
                        )
                        for a in b.get("accounts", [])
                    ]
                    banks.append(CounterpartyBank(
                        uuid=b.get("uuid"),
                        bank_name=b.get("bankName"),
                        bank_country=b.get("bankCountry"),
                        bank_address=b.get("bankAddress"),
                        swift_code=b.get("swiftCode"),
                        accounts=accounts
                    ))
                
                statistics = None
                if c.get("statistics"):
                    stats = c.get("statistics", {})
                    statistics = CounterpartyStatistics(
                        total_requests=stats.get("totalRequests", 0),
                        approved_requests=stats.get("approvedRequests", 0),
                        rejected_requests=stats.get("rejectedRequests", 0),
                        pending_requests=stats.get("pendingRequests", 0),
                        total_amount=stats.get("totalAmount", 0.0)
                    )
                
                counterparties.append(CounterpartyWithStatistics(
                    id=str(c.get("_id", c.get("id", ""))),
                    name=c.get("name", ""),
                    country=c.get("country"),
                    type=CounterpartyType(c.get("type", "unknown")),
                    inn=c.get("inn"),
                    legal_address=c.get("legalAddress"),
                    banks=banks,
                    last_approval_status=CounterpartyApprovalStatus(
                        c.get("lastApprovalStatus", "not_reviewed")
                    ),
                    last_approval_date=c.get("lastApprovalDate"),
                    created_by=str(c.get("createdBy", "")) if c.get("createdBy") else None,
                    created_at=c.get("createDate"),
                    updated_at=c.get("updateDate"),
                    statistics=statistics
                ))
            
            return CounterpartyListResponse(
                counterparties=counterparties,
                total=data.get("total", data.get("totalDocs", len(counterparties))),
                page=page,
                page_size=page_size,
                has_next=data.get("hasNext", data.get("hasNextPage", False))
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_counterparty(self, counterparty_id: str) -> Optional[Counterparty]:
        """Получение контрагента по ID.
        
        Args:
            counterparty_id: ID контрагента
            
        Returns:
            Counterparty или None если не найден
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            response = await client.get(f"/counterparty/{counterparty_id}")
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            c = response.json()
            
            banks = []
            for b in c.get("banks", []):
                accounts = [
                    CounterpartyBankAccount(
                        uuid=a.get("uuid"),
                        account_number=a.get("accountNumber"),
                        currency=a.get("currency", "USD"),
                        is_primary=a.get("isPrimary", False)
                    )
                    for a in b.get("accounts", [])
                ]
                banks.append(CounterpartyBank(
                    uuid=b.get("uuid"),
                    bank_name=b.get("bankName"),
                    bank_country=b.get("bankCountry"),
                    bank_address=b.get("bankAddress"),
                    swift_code=b.get("swiftCode"),
                    accounts=accounts
                ))
            
            return Counterparty(
                id=str(c.get("_id", c.get("id", ""))),
                name=c.get("name", ""),
                country=c.get("country"),
                type=CounterpartyType(c.get("type", "unknown")),
                inn=c.get("inn"),
                legal_address=c.get("legalAddress"),
                banks=banks,
                last_approval_status=CounterpartyApprovalStatus(
                    c.get("lastApprovalStatus", "not_reviewed")
                ),
                last_approval_date=c.get("lastApprovalDate"),
                created_by=str(c.get("createdBy", "")) if c.get("createdBy") else None,
                created_at=c.get("createDate"),
                updated_at=c.get("updateDate")
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_counterparty_requests(
        self,
        counterparty_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> CounterpartyRequestsResponse:
        """Получение истории запросов контрагента.
        
        Args:
            counterparty_id: ID контрагента
            page: Номер страницы
            page_size: Размер страницы
            
        Returns:
            CounterpartyRequestsResponse: Список запросов
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            params = {
                "page": page,
                "limit": page_size
            }
            
            response = await client.get(
                f"/counterparty/{counterparty_id}/requests",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            items = data.get("items", data.get("requests", []))
            
            requests = [
                CounterpartyRequest(
                    id=str(r.get("_id", r.get("id", ""))),
                    number=r.get("number"),
                    status=r.get("status", "unknown"),
                    amount=float(r.get("amount", 0)),
                    currency=r.get("currency", "USD"),
                    created_at=r.get("createDate")
                )
                for r in items
            ]
            
            return CounterpartyRequestsResponse(
                requests=requests,
                total=data.get("total", len(requests)),
                page=page,
                page_size=page_size
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    # ============================================
    # Contract Methods (Контракты)
    # ============================================
    
    async def get_contracts(
        self,
        organization_id: Optional[str] = None,
        status: Optional[ContractStatus] = None,
        is_template: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> ContractListResponse:
        """Получение списка контрактов.
        
        Args:
            organization_id: Фильтр по организации
            status: Фильтр по статусу
            is_template: Фильтр по шаблонам
            page: Номер страницы
            page_size: Размер страницы
            
        Returns:
            ContractListResponse: Список контрактов
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            params: Dict[str, Any] = {
                "page": page,
                "limit": page_size
            }
            if organization_id:
                params["organization"] = organization_id
            if status:
                params["status"] = status.value
            if is_template is not None:
                params["isTemplate"] = str(is_template).lower()
            
            response = await client.get("/contract", params=params)
            response.raise_for_status()
            
            data = response.json()
            items = data.get("items", data.get("docs", []))
            
            contracts = [
                Contract(
                    id=str(c.get("_id", c.get("id", ""))),
                    number=c.get("number"),
                    name=c.get("name"),
                    contract_type=c.get("type"),
                    status=ContractStatus(c.get("status", "unknown")),
                    organization_id=str(c.get("organization", "")) if c.get("organization") else None,
                    agent_id=str(c.get("agent", "")) if c.get("agent") else None,
                    file_id=str(c.get("file", "")) if c.get("file") else None,
                    is_template=c.get("isTemplate", False),
                    diadoc_document_id=c.get("diadocDocumentId"),
                    diadoc_message_id=c.get("diadocMessageId"),
                    diadoc_status=DiadocDocumentStatus(c.get("diadocStatus")) if c.get("diadocStatus") else None,
                    created_at=c.get("createDate"),
                    updated_at=c.get("updateDate")
                )
                for c in items
            ]
            
            return ContractListResponse(
                contracts=contracts,
                total=data.get("total", data.get("totalDocs", len(contracts))),
                page=page,
                page_size=page_size,
                has_next=data.get("hasNext", data.get("hasNextPage", False))
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_contract(self, contract_id: str) -> Optional[Contract]:
        """Получение контракта по ID.
        
        Args:
            contract_id: ID контракта
            
        Returns:
            Contract или None если не найден
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            response = await client.get(f"/contract/{contract_id}")
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            c = response.json()
            
            return Contract(
                id=str(c.get("_id", c.get("id", ""))),
                number=c.get("number"),
                name=c.get("name"),
                contract_type=c.get("type"),
                status=ContractStatus(c.get("status", "unknown")),
                organization_id=str(c.get("organization", "")) if c.get("organization") else None,
                agent_id=str(c.get("agent", "")) if c.get("agent") else None,
                file_id=str(c.get("file", "")) if c.get("file") else None,
                is_template=c.get("isTemplate", False),
                diadoc_document_id=c.get("diadocDocumentId"),
                diadoc_message_id=c.get("diadocMessageId"),
                diadoc_status=DiadocDocumentStatus(c.get("diadocStatus")) if c.get("diadocStatus") else None,
                created_at=c.get("createDate"),
                updated_at=c.get("updateDate")
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_contract_diadoc_status(
        self,
        contract_id: str
    ) -> Optional[ContractDiadocStatusResponse]:
        """Получение статуса контракта в Diadoc.
        
        Args:
            contract_id: ID контракта
            
        Returns:
            ContractDiadocStatusResponse или None
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            response = await client.get(f"/contract/{contract_id}/diadoc-status")
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            data = response.json()
            
            return ContractDiadocStatusResponse(
                status=DiadocDocumentStatus(data.get("status", "unknown")),
                document_id=data.get("documentId"),
                message_id=data.get("messageId")
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    # ============================================
    # Currency Methods (Валюты)
    # ============================================
    
    async def get_currencies(
        self,
        active_only: bool = True,
        page: int = 1,
        page_size: int = 50
    ) -> CurrencyListResponse:
        """Получение списка валют.
        
        Args:
            active_only: Только активные валюты
            page: Номер страницы
            page_size: Размер страницы
            
        Returns:
            CurrencyListResponse: Список валют
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            params: Dict[str, Any] = {
                "page": page,
                "limit": page_size
            }
            if active_only:
                params["active"] = "true"
            
            response = await client.get("/currency", params=params)
            response.raise_for_status()
            
            data = response.json()
            items = data.get("items", data.get("docs", []))
            
            currencies = [
                CurrencyRate(
                    id=str(c.get("_id", c.get("id", ""))),
                    symbol=c.get("symbol", ""),
                    source=CurrencySource(c.get("source", "unknown")),
                    rate=float(c.get("rate", 0)),
                    base_currency=c.get("baseCurrency", "RUB"),
                    inverse_rate=c.get("inverseRate"),
                    date=c.get("date"),
                    updated_at=c.get("updateDate")
                )
                for c in items
            ]
            
            return CurrencyListResponse(
                currencies=currencies,
                total=data.get("total", data.get("totalDocs", len(currencies))),
                page=page,
                page_size=page_size
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_currency_rates(
        self,
        base_currency: str = "RUB",
        symbols: Optional[List[str]] = None
    ) -> CurrencyDashboardResponse:
        """Получение курсов валют для дашборда.
        
        Args:
            base_currency: Базовая валюта
            symbols: Список символов валют (опционально)
            
        Returns:
            CurrencyDashboardResponse: Курсы валют
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            
            params: Dict[str, Any] = {
                "base": base_currency,
                "inverse": "true"
            }
            if symbols:
                params["symbols"] = ",".join(symbols)
            
            response = await client.get("/currency/dashboard-rate", params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Ответ может быть списком или объектом
            if isinstance(data, list):
                rates = [
                    CurrencyRateShort(
                        symbol=r.get("symbol", ""),
                        rate=float(r.get("rate", 0)),
                        base=r.get("base", base_currency),
                        change_percent=r.get("changePercent")
                    )
                    for r in data
                ]
                return CurrencyDashboardResponse(
                    rates=rates,
                    base_currency=base_currency
                )
            else:
                rates = [
                    CurrencyRateShort(
                        symbol=r.get("symbol", ""),
                        rate=float(r.get("rate", 0)),
                        base=r.get("base", base_currency),
                        change_percent=r.get("changePercent")
                    )
                    for r in data.get("rates", [])
                ]
                return CurrencyDashboardResponse(
                    rates=rates,
                    base_currency=data.get("baseCurrency", base_currency),
                    updated_at=data.get("updateDate")
                )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    async def get_currency_by_symbol(
        self,
        symbol: str,
        source: str = "cbr"
    ) -> Optional[CurrencyRate]:
        """Получение курса валюты по символу.
        
        Args:
            symbol: Символ валюты (USD, EUR, CNY и т.д.)
            source: Источник курса (cbr, openexchange)
            
        Returns:
            CurrencyRate или None
        """
        self._check_configured()
        
        try:
            client = await self._get_client()
            response = await client.get(f"/currency/{symbol}/{source}")
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            c = response.json()
            
            return CurrencyRate(
                id=str(c.get("_id", c.get("id", ""))),
                symbol=c.get("symbol", symbol),
                source=CurrencySource(c.get("source", source)),
                rate=float(c.get("rate", 0)),
                base_currency=c.get("baseCurrency", "RUB"),
                inverse_rate=c.get("inverseRate"),
                date=c.get("date"),
                updated_at=c.get("updateDate")
            )
            
        except httpx.RequestError as e:
            raise FeaStageConnectionError(f"Failed to connect to fea-stage: {str(e)}")
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (401, 403):
                error_detail = ""
                try:
                    error_data = e.response.json()
                    error_detail = error_data.get("detail", error_data.get("message", ""))
                except:
                    error_detail = e.response.text[:200] if e.response.text else ""
                
                auth_method = "API key" if (self.api_key and self.api_key.strip()) else "email/password"
                has_api_key = bool(self.api_key and self.api_key.strip())
                
                logger.warning(
                    f"fea-stage authentication failed ({auth_method}): {e.response.status_code}. "
                    f"API key configured: {has_api_key}, "
                    f"Error: {error_detail[:100]}"
                )
                
                error_msg = f"Authentication failed ({auth_method}): {e.response.status_code}"
                if error_detail:
                    error_msg += f" - {error_detail}"
                raise FeaStageAuthError(error_msg)
            raise FeaStageError(f"fea-stage API error: {e.response.status_code}")
    
    # ============================================
    # Health Check
    # ============================================
    
    async def health_check(self) -> bool:
        """Проверка доступности fea-stage API.
        
        Returns:
            bool: True если API доступен
        """
        if not self.is_configured:
            return False
        
        try:
            client = await self._get_client()
            response = await client.get("/diadoc/health")
            return response.status_code == 200
        except Exception:
            return False


# Singleton instance
_client_instance: Optional[FeaStageClient] = None


def get_fea_stage_client() -> FeaStageClient:
    """Возвращает singleton экземпляр клиента."""
    global _client_instance
    if _client_instance is None:
        _client_instance = FeaStageClient()
    return _client_instance
