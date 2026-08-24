"""
Test Fixtures Package

Contains test data and fixtures for testing:
- Sample documents
- Sample compliance data
- Sample knowledge sources
"""

import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent


def load_fixture(filename: str) -> dict:
    """Load a JSON fixture file."""
    filepath = FIXTURES_DIR / filename
    if filepath.exists():
        with open(filepath, "r") as f:
            return json.load(f)
    return {}


# Sample SWIFT message
SAMPLE_SWIFT_MESSAGE = """
{1:F01BANKUS33AXXX0000000000}
{2:I103BANKEU22XXXXN}
{3:{108:MT103}}
{4:
:20:REF123456789
:23B:CRED
:32A:230115USD10000,00
:50K:/12345678
ACME CORPORATION
123 MAIN STREET
NEW YORK NY 10001
:59:/87654321
SAMPLE BENEFICIARY
456 TEST AVENUE
BERLIN 10178
:70:PAYMENT FOR INVOICE 12345
:71A:SHA
-}
"""

# Sample compliance rules
SAMPLE_COMPLIANCE_RULES = [
    {
        "rule_id": "SANC001",
        "name": "OFAC Sanctions Check",
        "description": "Check against OFAC sanctions list",
        "severity": "critical"
    },
    {
        "rule_id": "AML001",
        "name": "AML Threshold Check",
        "description": "Check for transactions above AML threshold",
        "severity": "high"
    },
    {
        "rule_id": "KYC001",
        "name": "KYC Verification",
        "description": "Verify customer KYC status",
        "severity": "medium"
    }
]

# Sample risk factors
SAMPLE_RISK_FACTORS = [
    {
        "factor": "high_risk_country",
        "weight": 0.3,
        "description": "Transaction involves high-risk country"
    },
    {
        "factor": "large_amount",
        "weight": 0.25,
        "description": "Transaction amount exceeds threshold"
    },
    {
        "factor": "new_beneficiary",
        "weight": 0.15,
        "description": "First transaction to this beneficiary"
    },
    {
        "factor": "unusual_pattern",
        "weight": 0.2,
        "description": "Transaction pattern is unusual"
    }
]
