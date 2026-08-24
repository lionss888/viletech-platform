"""Integrations module.

This module provides integrations with external services and systems.
"""

from .fea_stage_client import (
    # Client and Errors
    FeaStageClient,
    FeaStageError,
    FeaStageConnectionError,
    FeaStageNotConfiguredError,
    FeaStageAuthError,
    get_fea_stage_client,
    # FormPayment Models
    FormPayment,
    FormPaymentStatus,
    FormPaymentCreateRequest,
    FormPaymentListResponse,
    # Counterparty Models
    Counterparty,
    CounterpartyType,
    CounterpartyApprovalStatus,
    CounterpartyBank,
    CounterpartyBankAccount,
    CounterpartyApprovalHistory,
    CounterpartyStatistics,
    CounterpartyWithStatistics,
    CounterpartyListResponse,
    CounterpartyRequest,
    CounterpartyRequestsResponse,
    # Contract Models
    Contract,
    ContractStatus,
    ContractListResponse,
    ContractDiadocStatusResponse,
    DiadocDocumentStatus,
    # Currency Models
    CurrencyRate,
    CurrencyRateShort,
    CurrencySource,
    CurrencyListResponse,
    CurrencyDashboardResponse,
)

__all__ = [
    # Client and Errors
    "FeaStageClient",
    "FeaStageError",
    "FeaStageConnectionError",
    "FeaStageNotConfiguredError",
    "FeaStageAuthError",
    "get_fea_stage_client",
    # FormPayment Models
    "FormPayment",
    "FormPaymentStatus",
    "FormPaymentCreateRequest",
    "FormPaymentListResponse",
    # Counterparty Models
    "Counterparty",
    "CounterpartyType",
    "CounterpartyApprovalStatus",
    "CounterpartyBank",
    "CounterpartyBankAccount",
    "CounterpartyApprovalHistory",
    "CounterpartyStatistics",
    "CounterpartyWithStatistics",
    "CounterpartyListResponse",
    "CounterpartyRequest",
    "CounterpartyRequestsResponse",
    # Contract Models
    "Contract",
    "ContractStatus",
    "ContractListResponse",
    "ContractDiadocStatusResponse",
    "DiadocDocumentStatus",
    # Currency Models
    "CurrencyRate",
    "CurrencyRateShort",
    "CurrencySource",
    "CurrencyListResponse",
    "CurrencyDashboardResponse",
]
