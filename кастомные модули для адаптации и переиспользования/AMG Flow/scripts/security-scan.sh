#!/bin/bash
set -euo pipefail

# Security scanning script for AMG Flow project
# Usage: ./scripts/security-scan.sh [go|python|all]

SCAN_TYPE=${1:-all}
REPORT_DIR="security-reports"
mkdir -p "$REPORT_DIR"

echo "🔒 Starting security scan: $SCAN_TYPE"

# Go security scan
if [[ "$SCAN_TYPE" == "go" || "$SCAN_TYPE" == "all" ]]; then
    echo "📋 Scanning Go backend..."
    
    # Gosec scan
    if command -v gosec &> /dev/null; then
        gosec -fmt=json -severity=medium -out="$REPORT_DIR/gosec-report.json" ./go-backend/...
        echo "✅ Gosec scan completed"
    else
        echo "⚠️  Gosec not installed, skipping"
    fi
    
    # Golangci-lint security scan
    if command -v golangci-lint &> /dev/null; then
        golangci-lint run --config=.golangci-security.yml --out-format=json ./go-backend/... > "$REPORT_DIR/golangci-security-report.json" || true
        echo "✅ Golangci-lint security scan completed"
    else
        echo "⚠️  Golangci-lint not installed, skipping"
    fi
fi

# Python security scan
if [[ "$SCAN_TYPE" == "python" || "$SCAN_TYPE" == "all" ]]; then
    echo "🐍 Scanning Python analytics..."
    
    # Bandit scan
    if command -v bandit &> /dev/null; then
        bandit -r app/ -f json -o "$REPORT_DIR/bandit-report.json" || true
        echo "✅ Bandit scan completed"
    else
        echo "⚠️  Bandit not installed, skipping"
    fi
    
    # Safety scan
    if command -v safety &> /dev/null; then
        safety check --json --output "$REPORT_DIR/safety-report.json" || true
        echo "✅ Safety scan completed"
    else
        echo "⚠️  Safety not installed, skipping"
    fi
    
    # Pip-audit scan
    if command -v pip-audit &> /dev/null; then
        pip-audit --desc --format=json --output "$REPORT_DIR/pip-audit-report.json" || true
        echo "✅ Pip-audit scan completed"
    else
        echo "⚠️  Pip-audit not installed, skipping"
    fi
fi

echo "📊 Security reports generated in $REPORT_DIR/"
ls -la "$REPORT_DIR/"

echo "🔒 Security scan completed!"
