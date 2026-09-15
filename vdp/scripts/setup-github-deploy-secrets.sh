#!/usr/bin/env bash
# Setup GitHub Environment Secrets for VDP Deploy
# Usage: GITHUB_TOKEN=<your_token> ./setup-github-deploy-secrets.sh
set -euo pipefail

REPO_OWNER="${REPO_OWNER:-lionss888}"
REPO_NAME="${REPO_NAME:-viletech-platform}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

MGMT_TOKEN="8910940409:AAFj1czFdevhKv4gZegrAy1Sl_N9qhQHr5w"
MGMT_CHAT_ID="-1004449173165"

ENVIRONMENTS=("alpha" "beta" "gamma" "demo" "test")

if [ -z "$GITHUB_TOKEN" ]; then
  cat >&2 <<'EOF'
❌ GITHUB_TOKEN not set

This script needs a GitHub Personal Access Token with 'repo' and 'admin:org' scopes.

How to create:
1. Go to https://github.com/settings/tokens/new
2. Select scopes: 'repo' (full control) and 'admin:org' (manage environments)
3. Generate token and copy it
4. Run:
   export GITHUB_TOKEN="your_token_here"
   ./setup-github-deploy-secrets.sh

Or in one line:
   GITHUB_TOKEN="your_token_here" ./setup-github-deploy-secrets.sh
EOF
  exit 1
fi

echo "🔧 Setting up GitHub Environment Secrets for ${REPO_OWNER}/${REPO_NAME}"
echo ""

# Function to get environment ID
get_env_id() {
  local env_name="$1"
  curl -sS -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/environments/${env_name}" \
    | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null || echo ""
}

# Function to get repository public key for secrets encryption
get_repo_public_key() {
  local env_name="$1"
  curl -sS -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/environments/${env_name}/secrets/public-key"
}

# Function to encrypt secret (requires libsodium or Python with pynacl)
encrypt_secret() {
  local secret_value="$1"
  local public_key="$2"
  
  python3 -c "
import base64
import sys
try:
    from nacl import encoding, public
    public_key = public.PublicKey(sys.argv[1].encode('utf-8'), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(sys.argv[2].encode('utf-8'))
    print(base64.b64encode(encrypted).decode('utf-8'))
except ImportError:
    print('ERROR: Install PyNaCl: pip3 install pynacl', file=sys.stderr)
    sys.exit(1)
" "$public_key" "$secret_value"
}

# Function to create or update environment secret
set_environment_secret() {
  local env_name="$1"
  local secret_name="$2"
  local secret_value="$3"
  
  echo "  Setting ${secret_name} in environment ${env_name}..."
  
  # Get public key
  local key_response
  key_response=$(get_repo_public_key "$env_name")
  local public_key
  public_key=$(echo "$key_response" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('key', ''))")
  local key_id
  key_id=$(echo "$key_response" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('key_id', ''))")
  
  if [ -z "$public_key" ] || [ -z "$key_id" ]; then
    echo "    ❌ Failed to get public key for ${env_name}"
    return 1
  fi
  
  # Encrypt secret
  local encrypted_value
  encrypted_value=$(encrypt_secret "$secret_value" "$public_key")
  
  if [ -z "$encrypted_value" ] || [[ "$encrypted_value" == ERROR* ]]; then
    echo "    ❌ Failed to encrypt secret"
    return 1
  fi
  
  # Set secret
  local response
  response=$(curl -sS -w "\n%{http_code}" -X PUT \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/environments/${env_name}/secrets/${secret_name}" \
    -d "{\"encrypted_value\":\"${encrypted_value}\",\"key_id\":\"${key_id}\"}")
  
  local http_code
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "201" ] || [ "$http_code" = "204" ]; then
    echo "    ✅ ${secret_name} set successfully"
    return 0
  else
    echo "    ❌ Failed to set ${secret_name} (HTTP ${http_code})"
    echo "$response" | head -n-1 | python3 -m json.tool 2>/dev/null || echo "$response"
    return 1
  fi
}

# Check if PyNaCl is installed
if ! python3 -c "import nacl" 2>/dev/null; then
  echo "⚠️  PyNaCl not installed. Installing..."
  pip3 install pynacl --user || {
    echo "❌ Failed to install PyNaCl. Install manually: pip3 install pynacl"
    exit 1
  }
fi

echo ""

# List existing environments
echo "📋 Existing environments:"
curl -sS -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/environments" \
  | python3 -c "import sys, json; data = json.load(sys.stdin); [print(f\"  - {env['name']}\") for env in data.get('environments', [])]"

echo ""
echo "🔐 Setting secrets for environments: ${ENVIRONMENTS[*]}"
echo ""

for env in "${ENVIRONMENTS[@]}"; do
  echo "Environment: $env"
  
  # Check if environment exists, create if not
  env_id=$(get_env_id "$env")
  if [ -z "$env_id" ]; then
    echo "  Creating environment ${env}..."
    curl -sS -X PUT \
      -H "Authorization: token ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/environments/${env}" \
      -d '{}' >/dev/null
    sleep 1
  fi
  
  # Set secrets
  set_environment_secret "$env" "MGMT_NOTIFY_TOKEN" "$MGMT_TOKEN" || true
  set_environment_secret "$env" "MGMT_NOTIFY_CHAT_ID" "$MGMT_CHAT_ID" || true
  
  echo ""
done

echo "✅ Done! Management notify secrets configured for all environments."
echo ""
echo "Next steps:"
echo "1. Test manual deploy: Actions → VDP Deploy → Run workflow → environment: alpha"
echo "2. Check Telegram channel for deploy notification: https://t.me/+XAl4Vq3otV81YzVi"
echo "3. If successful, merge to main will auto-deploy to alpha with notification"
