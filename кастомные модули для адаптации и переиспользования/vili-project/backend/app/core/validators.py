"""Custom validators for VILI application"""

import re
from typing import Any, Optional
from uuid import UUID
from pydantic import validator, field_validator


# ============================================
# UUID Validators
# ============================================

def validate_uuid(value: Any) -> UUID:
    """Validate and convert value to UUID."""
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError:
            raise ValueError(f"Invalid UUID format: {value}")
    raise ValueError(f"Cannot convert {type(value)} to UUID")


# ============================================
# Document Type Validators
# ============================================

VALID_DOCUMENT_TYPES = {"traditional", "crypto"}
VALID_DOCUMENT_FORMATS = {"SWIFT", "PDF", "JSON", "XML", "text", "blockchain"}
VALID_DOCUMENT_STATUSES = {"pending", "processing", "completed", "failed", "review_required"}


def validate_document_type(value: str) -> str:
    """Validate document type."""
    if value not in VALID_DOCUMENT_TYPES:
        raise ValueError(f"Invalid document type: {value}. Must be one of: {VALID_DOCUMENT_TYPES}")
    return value


def validate_document_format(value: str) -> str:
    """Validate document format."""
    if value not in VALID_DOCUMENT_FORMATS:
        raise ValueError(f"Invalid document format: {value}. Must be one of: {VALID_DOCUMENT_FORMATS}")
    return value


def validate_document_status(value: str) -> str:
    """Validate document status."""
    if value not in VALID_DOCUMENT_STATUSES:
        raise ValueError(f"Invalid document status: {value}. Must be one of: {VALID_DOCUMENT_STATUSES}")
    return value


# ============================================
# Compliance Validators
# ============================================

VALID_CHECK_TYPES = {"sanctions", "kyc", "aml", "travel_rule", "fatf"}
VALID_CHECK_STATUSES = {"passed", "failed", "warning", "pending"}
VALID_RISK_LEVELS = {"low", "medium", "high", "critical"}


def validate_check_type(value: str) -> str:
    """Validate compliance check type."""
    if value not in VALID_CHECK_TYPES:
        raise ValueError(f"Invalid check type: {value}. Must be one of: {VALID_CHECK_TYPES}")
    return value


def validate_check_types_list(values: list) -> list:
    """Validate list of compliance check types."""
    if not values:
        raise ValueError("At least one check type must be specified")
    for value in values:
        validate_check_type(value)
    return values


def validate_check_status(value: str) -> str:
    """Validate compliance check status."""
    if value not in VALID_CHECK_STATUSES:
        raise ValueError(f"Invalid check status: {value}. Must be one of: {VALID_CHECK_STATUSES}")
    return value


def validate_risk_level(value: str) -> str:
    """Validate risk level."""
    if value not in VALID_RISK_LEVELS:
        raise ValueError(f"Invalid risk level: {value}. Must be one of: {VALID_RISK_LEVELS}")
    return value


# ============================================
# Rating Validators
# ============================================

def validate_rating(value: int) -> int:
    """Validate rating (1-5)."""
    if not 1 <= value <= 5:
        raise ValueError(f"Rating must be between 1 and 5, got: {value}")
    return value


# ============================================
# Amount Validators
# ============================================

def validate_positive_amount(value: float) -> float:
    """Validate that amount is positive."""
    if value < 0:
        raise ValueError(f"Amount must be positive, got: {value}")
    return value


def validate_currency_code(value: str) -> str:
    """Validate currency code (3 letter ISO code)."""
    if not re.match(r'^[A-Z]{3}$', value.upper()):
        raise ValueError(f"Invalid currency code: {value}. Must be 3-letter ISO code")
    return value.upper()


# ============================================
# Country Validators
# ============================================

def validate_country_code(value: str) -> str:
    """Validate country code (2 letter ISO code)."""
    if not re.match(r'^[A-Z]{2}$', value.upper()):
        raise ValueError(f"Invalid country code: {value}. Must be 2-letter ISO code")
    return value.upper()


# ============================================
# Knowledge Source Validators
# ============================================

VALID_SOURCE_TYPES = {"url", "file", "api", "manual"}
VALID_FILE_FORMATS = {"csv", "txt", "pdf", "json"}


def validate_source_type(value: str) -> str:
    """Validate knowledge source type."""
    if value not in VALID_SOURCE_TYPES:
        raise ValueError(f"Invalid source type: {value}. Must be one of: {VALID_SOURCE_TYPES}")
    return value


def validate_file_format(value: str) -> str:
    """Validate file format."""
    if value not in VALID_FILE_FORMATS:
        raise ValueError(f"Invalid file format: {value}. Must be one of: {VALID_FILE_FORMATS}")
    return value


def validate_url(value: str) -> str:
    """Validate URL format."""
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    if not url_pattern.match(value):
        raise ValueError(f"Invalid URL format: {value}")
    return value


# ============================================
# Blockchain Validators
# ============================================

VALID_BLOCKCHAINS = {"ethereum", "bitcoin", "tron", "polygon", "bsc", "solana"}


def validate_blockchain(value: str) -> str:
    """Validate blockchain name."""
    if value.lower() not in VALID_BLOCKCHAINS:
        raise ValueError(f"Invalid blockchain: {value}. Must be one of: {VALID_BLOCKCHAINS}")
    return value.lower()


def validate_ethereum_address(value: str) -> str:
    """Validate Ethereum address format."""
    if not re.match(r'^0x[a-fA-F0-9]{40}$', value):
        raise ValueError(f"Invalid Ethereum address format: {value}")
    return value


def validate_bitcoin_address(value: str) -> str:
    """Validate Bitcoin address format (basic check)."""
    # Basic validation for Bitcoin addresses (P2PKH, P2SH, Bech32)
    if not re.match(r'^(1|3|bc1)[a-zA-Z0-9]{25,62}$', value):
        raise ValueError(f"Invalid Bitcoin address format: {value}")
    return value


def validate_tx_hash(value: str, blockchain: str = "ethereum") -> str:
    """Validate transaction hash format."""
    if blockchain == "ethereum":
        if not re.match(r'^0x[a-fA-F0-9]{64}$', value):
            raise ValueError(f"Invalid Ethereum transaction hash: {value}")
    elif blockchain == "bitcoin":
        if not re.match(r'^[a-fA-F0-9]{64}$', value):
            raise ValueError(f"Invalid Bitcoin transaction hash: {value}")
    return value


# ============================================
# Text Validators
# ============================================

def validate_non_empty_string(value: str) -> str:
    """Validate that string is not empty or whitespace."""
    if not value or not value.strip():
        raise ValueError("Value cannot be empty or whitespace only")
    return value.strip()


def validate_max_length(value: str, max_length: int) -> str:
    """Validate string max length."""
    if len(value) > max_length:
        raise ValueError(f"Value exceeds maximum length of {max_length} characters")
    return value


# ============================================
# Pydantic Field Validators (for use in models)
# ============================================

class PydanticValidators:
    """Pydantic validators for use with @field_validator decorator."""
    
    @staticmethod
    def uuid_validator(v: Any) -> UUID:
        return validate_uuid(v)
    
    @staticmethod
    def document_type_validator(v: str) -> str:
        return validate_document_type(v)
    
    @staticmethod
    def document_format_validator(v: str) -> str:
        return validate_document_format(v)
    
    @staticmethod
    def check_types_validator(v: list) -> list:
        return validate_check_types_list(v)
    
    @staticmethod
    def risk_level_validator(v: str) -> str:
        return validate_risk_level(v)
    
    @staticmethod
    def rating_validator(v: int) -> int:
        return validate_rating(v)
    
    @staticmethod
    def positive_amount_validator(v: float) -> float:
        return validate_positive_amount(v)
    
    @staticmethod
    def currency_code_validator(v: str) -> str:
        return validate_currency_code(v)
    
    @staticmethod
    def country_code_validator(v: str) -> str:
        return validate_country_code(v)
    
    @staticmethod
    def url_validator(v: str) -> str:
        return validate_url(v)
