#!/usr/bin/env bash
# Ensure the Docker daemon is reachable before compose / Local QG / pre-push.
# If the daemon is down on macOS, start Docker Desktop and wait until ready.
# Linux: try systemctl --user / systemctl (no sudo prompt) when docker.service exists.
#
# Env:
#   SKIP_ENSURE_DOCKER=1     — no-op (CI / emergency)
#   ENSURE_DOCKER_TIMEOUT=N  — seconds to wait after start (default 180)
#   ENSURE_DOCKER_CHECK_ONLY=1 — only probe; do not start (contract tests)
set -euo pipefail

if [ "${SKIP_ENSURE_DOCKER:-0}" = "1" ]; then
  exit 0
fi

timeout_s="${ENSURE_DOCKER_TIMEOUT:-180}"
poll_s=2

docker_ready() {
  command -v docker >/dev/null 2>&1 || return 1
  docker info >/dev/null 2>&1
}

if docker_ready; then
  exit 0
fi

if [ "${ENSURE_DOCKER_CHECK_ONLY:-0}" = "1" ]; then
  echo "ensure-docker: daemon not reachable (check-only)" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ensure-docker: docker CLI not found in PATH" >&2
  exit 1
fi

os="$(uname -s 2>/dev/null || echo unknown)"
started=0

backend_running() {
  pgrep -x com.docker.backend >/dev/null 2>&1 \
    || pgrep -f '/MacOS/com.docker.backend' >/dev/null 2>&1
}

start_macos_docker() {
  local app backend ui
  app="/Applications/Docker.app"
  backend="$app/Contents/MacOS/com.docker.backend"
  ui="$app/Contents/MacOS/Docker Desktop.app"

  # 1) Preferred: LaunchServices / open (works from real Terminal / Cursor git hook).
  if [ -d "$app" ]; then
    echo "ensure-docker: Docker daemon down — opening Docker Desktop..." >&2
    if open "$app" 2>/dev/null; then
      return 0
    fi
    if [ -d "$ui" ] && open "$ui" 2>/dev/null; then
      return 0
    fi
    if open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null; then
      return 0
    fi
  fi

  # 2) Fallback: launch backend binary directly (CFBundleExecutable of Docker.app).
  # Needed when `open` fails (LaunchServices) but binaries exist.
  if [ -x "$backend" ]; then
    if backend_running; then
      echo "ensure-docker: com.docker.backend already running — waiting for API..." >&2
      return 0
    fi
    echo "ensure-docker: launching com.docker.backend directly..." >&2
    "$backend" >/dev/null 2>&1 &
    disown 2>/dev/null || true
    # Prefer LaunchServices for the Electron UI; never exec the binary (AbortTrap in headless).
    if [ -d "$ui" ]; then
      open "$ui" 2>/dev/null || true
    fi
    return 0
  fi

  return 1
}

case "$os" in
  Darwin)
    if start_macos_docker; then
      started=1
    else
      echo "ensure-docker: could not start Docker Desktop (app/backend missing)" >&2
      echo "ensure-docker: start Docker Desktop manually, then retry" >&2
      exit 1
    fi
    ;;
  Linux)
    if command -v systemctl >/dev/null 2>&1; then
      if systemctl --user is-enabled docker.service >/dev/null 2>&1 \
        || systemctl --user status docker.service >/dev/null 2>&1; then
        echo "ensure-docker: starting docker.service (user)..." >&2
        systemctl --user start docker.service >/dev/null 2>&1 && started=1 || true
      fi
      if [ "$started" != "1" ] && systemctl is-enabled docker.service >/dev/null 2>&1; then
        if systemctl start docker.service >/dev/null 2>&1; then
          echo "ensure-docker: started docker.service" >&2
          started=1
        fi
      fi
    fi
    if [ "$started" != "1" ] && command -v colima >/dev/null 2>&1; then
      echo "ensure-docker: starting colima..." >&2
      colima start >/dev/null 2>&1 && started=1 || true
    fi
    if [ "$started" != "1" ]; then
      echo "ensure-docker: Docker daemon down and no auto-start path succeeded (systemctl/colima)" >&2
      echo "ensure-docker: start Docker manually, then retry" >&2
      exit 1
    fi
    ;;
  *)
    echo "ensure-docker: Docker daemon down on unsupported OS ($os); start it manually" >&2
    exit 1
    ;;
esac

echo "ensure-docker: waiting up to ${timeout_s}s for docker info..." >&2
elapsed=0
while [ "$elapsed" -lt "$timeout_s" ]; do
  if docker_ready; then
    echo "ensure-docker: daemon ready (${elapsed}s)" >&2
    exit 0
  fi
  sleep "$poll_s"
  elapsed=$((elapsed + poll_s))
done

echo "ensure-docker: timed out after ${timeout_s}s waiting for Docker daemon" >&2
echo "ensure-docker: open Docker Desktop / start the daemon, then retry the gate" >&2
exit 1
