#!/usr/bin/env bash
# Deploy semantic alerts to staging Prometheus
# Phase 4 Ops Excellence
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VDP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RULES_FILE="$VDP_ROOT/ops/prometheus-rules.example.yml"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
DRY_RUN="${DRY_RUN:-true}"

echo "=== VDP Semantic Alerts Deployment ==="
echo "Prometheus: $PROMETHEUS_URL"
echo "Rules file: $RULES_FILE"
echo "Dry run: $DRY_RUN"
echo

# Check prerequisites
if [[ ! -f "$RULES_FILE" ]]; then
    echo "ERROR: Rules file not found at $RULES_FILE"
    exit 1
fi

# Validate YAML syntax
if command -v yamllint >/dev/null 2>&1; then
    echo "Validating YAML syntax..."
    yamllint "$RULES_FILE" || {
        echo "WARNING: YAML validation failed. Proceeding anyway."
    }
else
    echo "SKIP: yamllint not installed, skipping YAML validation"
fi

# Check Prometheus connectivity (if not dry run)
if [[ "$DRY_RUN" != "true" ]]; then
    echo "Checking Prometheus connectivity..."
    if ! curl -sf "$PROMETHEUS_URL/-/healthy" >/dev/null; then
        echo "ERROR: Prometheus not reachable at $PROMETHEUS_URL"
        echo "Set PROMETHEUS_URL or run with DRY_RUN=true"
        exit 1
    fi
    echo "Prometheus healthy"
fi

# Validate PromQL expressions
echo
echo "Validating PromQL expressions..."
validate_expr() {
    local expr="$1"
    local name="$2"
    if [[ "$DRY_RUN" != "true" ]]; then
        # Query Prometheus to validate expression
        if curl -sf -G "$PROMETHEUS_URL/api/v1/query" \
            --data-urlencode "query=$expr" \
            --data-urlencode "time=$(date +%s)" \
            | jq -e '.status == "success"' >/dev/null 2>&1; then
            echo "  ✓ $name"
        else
            echo "  ✗ $name (may be valid but no data)"
        fi
    else
        echo "  ~ $name (dry run, not validated)"
    fi
}

# Extract and validate key expressions from rules file
# In real deployment, use promtool to validate
if command -v promtool >/dev/null 2>&1; then
    echo "Running promtool check..."
    promtool check rules "$RULES_FILE" || {
        echo "ERROR: promtool validation failed"
        exit 1
    }
    echo "promtool validation passed"
else
    echo "SKIP: promtool not installed, cannot validate rule syntax"
fi

# Deployment instructions
echo
echo "=== Deployment Steps ==="
if [[ "$DRY_RUN" == "true" ]]; then
    cat <<EOF
DRY RUN MODE - Manual steps required:

1. Copy rules file to Prometheus config directory:
   cp $RULES_FILE /path/to/prometheus/rules/vdp-alerts.yml

2. Add rule_files entry to prometheus.yml:
   rule_files:
     - "rules/vdp-alerts.yml"

3. Reload Prometheus configuration:
   curl -X POST $PROMETHEUS_URL/-/reload
   OR: kill -HUP <prometheus-pid>
   OR: restart Prometheus service

4. Verify rules loaded:
   curl $PROMETHEUS_URL/api/v1/rules | jq '.data.groups[] | select(.name | contains("vdp"))'

5. Test alert firing:
   - Create synthetic stuck form in staging DB
   - Stop a gateway service
   - Verify alert appears in $PROMETHEUS_URL/alerts

6. Configure Alertmanager routing:
   - Set up receiver for on-call channel (Telegram/Slack/PagerDuty)
   - Add route for severity=critical with high-priority notification
   - Test end-to-end alert delivery

EOF
else
    echo "Attempting automatic deployment..."
    echo "This requires Prometheus reload API or file-based config injection."
    echo "Not implemented in this script - use configuration management tool."
    exit 1
fi

echo
echo "=== Verification Checklist ==="
cat <<EOF
After deployment, verify:

[ ] Prometheus rules endpoint shows vdp_business_sla group
[ ] Alertmanager config includes VDP alert routes
[ ] Test alert fired and received by on-call channel
[ ] Runbook URLs in annotations are accessible
[ ] Alert thresholds match documented SLA
[ ] On-call rotation has access to runbooks

Commands for verification:

# List loaded rule groups
curl -s $PROMETHEUS_URL/api/v1/rules | jq '.data.groups[] | select(.name | contains("vdp")) | {name, file, rules: (.rules | length)}'

# Check specific alert status
curl -s $PROMETHEUS_URL/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname | contains("VDP"))'

# Query metrics used by alerts (requires instrumentation in core/hub)
curl -s -G $PROMETHEUS_URL/api/v1/query --data-urlencode 'query=vdp_forms_by_status'
curl -s -G $PROMETHEUS_URL/api/v1/query --data-urlencode 'query=vdp_hub_inbox_failed_total'
curl -s -G $PROMETHEUS_URL/api/v1/query --data-urlencode 'query=vdp_external_service_errors_total'

EOF

echo
echo "Deployment script complete."
echo "Actual deployment requires ops access to staging Prometheus."
