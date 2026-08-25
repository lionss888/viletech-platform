#!/usr/bin/env bash
# One-click local prep for fe-experiment BDUI (E1).
# Starts docker compose, ensures .env, waits for Mongo/Redis/NATS, runs seed.
# Does not start Nest/Vite (prints next steps) so logs stay readable.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend-for-ved"
CLIENT="$ROOT/bdui-client"

export PATH="/usr/local/bin:/opt/homebrew/bin:${BACKEND}/.tools/node-v22.14.0-darwin-x64/bin:${BACKEND}/.tools/node-v22.14.0-darwin-arm64/bin:${PATH:-}"

echo "==> fe-experiment start-local"
echo "    backend: $BACKEND"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Install Docker Desktop and retry." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found. Install Node 18+ or use portable node under backend-for-ved/.tools/" >&2
  exit 1
fi

cd "$BACKEND"

if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

# Compose maps Redis to host 6380; Nest on host must use that port.
if grep -q '^REDIS_URL=' .env; then
  sed -i.bak 's|^REDIS_URL=.*|REDIS_URL=redis://127.0.0.1:6380|' .env
else
  echo 'REDIS_URL=redis://127.0.0.1:6380' >> .env
fi
if grep -q '^REDIS_QUEUE_PORT=' .env; then
  sed -i.bak 's|^REDIS_QUEUE_PORT=.*|REDIS_QUEUE_PORT=6380|' .env
else
  echo 'REDIS_QUEUE_PORT=6380' >> .env
fi
if grep -q '^NATS_URL=' .env; then
  sed -i.bak 's|^NATS_URL=.*|NATS_URL=nats://127.0.0.1:4222|' .env
else
  echo 'NATS_URL=nats://127.0.0.1:4222' >> .env
fi

# MinIO (S3-compatible) — required for real PDF upload (E7)
set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}
set_env S3_REGION us-east-1
set_env BUCKET_NAME fea360
set_env S3_ENDPOINT 'http://127.0.0.1:9000'
set_env AWS_ACCESS_KEY_ID minioadmin
set_env AWS_SECRET_ACCESS_KEY minioadmin
rm -f .env.bak

echo "==> docker compose up -d"
docker compose up -d

wait_tcp() {
  local host="$1"
  local port="$2"
  local name="$3"
  local i=0
  while [ "$i" -lt 60 ]; do
    if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
      echo "    OK $name on $host:$port"
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "ERROR: timeout waiting for $name ($host:$port)" >&2
  return 1
}

# bash /dev/tcp may be unavailable in some shells — fall back to node
wait_port() {
  local host="$1"
  local port="$2"
  local name="$3"
  node -e "
const net=require('net');
const host=process.argv[1], port=+process.argv[2], name=process.argv[3];
let n=0;
function tryConnect(){
  const s=net.connect({host,port},()=>{console.log('    OK '+name+' on '+host+':'+port); s.end(); process.exit(0);});
  s.on('error',()=>{s.destroy(); if(++n>60){console.error('ERROR: timeout waiting for '+name); process.exit(1);} setTimeout(tryConnect,1000);});
}
tryConnect();
" "$host" "$port" "$name"
}

echo "==> Waiting for infra"
wait_port 127.0.0.1 27017 MongoDB
wait_port 127.0.0.1 6380 Redis
wait_port 127.0.0.1 4222 NATS
wait_port 127.0.0.1 9000 MinIO
# Allow minio-init to create bucket fea360
sleep 2

if [ ! -d node_modules ]; then
  echo "==> npm install (backend)"
  npm i
fi

echo "==> Seed BDUI lifecycle accounts"
node scripts/seed-bdui-lifecycle.js

if [ -d "$CLIENT" ] && [ ! -d "$CLIENT/node_modules" ]; then
  echo "==> npm install (bdui-client)"
  (cd "$CLIENT" && npm i)
fi

cat <<EOF

==> Infra + seed ready.

Next (two terminals):

  # Terminal A — Nest API
  cd "$BACKEND"
  npm run dev
  # http://localhost:30000

  # Terminal B — BDUI UI
  cd "$CLIENT"
  npm run dev
  # http://localhost:5173

Then smoke (API must be up):

  cd "$BACKEND"
  node scripts/smoke-bdui-login.js
  node scripts/smoke-bdui-upload.js

Seed logins: see fe-experiment/LIFECYCLE.md
EOF
