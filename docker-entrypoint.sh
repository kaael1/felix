#!/usr/bin/env bash
set -euo pipefail

PY_PORT="${PYTHON_PORT:-8000}"
APP_PORT="${PORT:-3000}"
APP_HOST="${HOST:-0.0.0.0}"

# Ensure the frontend talks to the in-container FastAPI service by default
export PYTHON_SERVICE_URL="${PYTHON_SERVICE_URL:-http://127.0.0.1:${PY_PORT}}"

start_backend() {
  python -m uvicorn backend.main:app --host 0.0.0.0 --port "${PY_PORT}"
}

start_frontend() {
  npm run start -- --hostname "${APP_HOST}" --port "${APP_PORT}"
}

start_backend &
BACKEND_PID=$!

start_frontend &
FRONTEND_PID=$!

cleanup() {
  kill -TERM "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
  wait "${BACKEND_PID}" "${FRONTEND_PID}" 2>/dev/null || true
}

trap cleanup INT TERM

wait -n "${BACKEND_PID}" "${FRONTEND_PID}"
EXIT_CODE=$?

cleanup
exit "${EXIT_CODE}"

