#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${NAVIA_RUNTIME_HOST:-127.0.0.1}"
PORT="${NAVIA_RUNTIME_PORT:-17861}"
APP_DIR="${NAVIA_RUNTIME_APP_DIR:-services/local-runtime}"
APP_MODULE="${NAVIA_RUNTIME_APP_MODULE:-navia_runtime.app:app}"

cd "$ROOT_DIR"

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof is required to clean port $PORT, but it was not found." >&2
  exit 1
fi

if ! command -v uvicorn >/dev/null 2>&1; then
  echo "uvicorn is required. Install dependencies first: pip install -r requirements.txt" >&2
  exit 1
fi

PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
if [[ -n "$PIDS" ]]; then
  echo "Cleaning existing process(es) on $HOST:$PORT: $PIDS"
  kill $PIDS 2>/dev/null || true
  for _ in {1..20}; do
    sleep 0.1
    REMAINING="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
    [[ -z "$REMAINING" ]] && break
  done
  REMAINING="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [[ -n "$REMAINING" ]]; then
    echo "Force killing process(es) still listening on $PORT: $REMAINING"
    kill -9 $REMAINING 2>/dev/null || true
  fi
fi

export PYTHONPATH="$APP_DIR${PYTHONPATH:+:$PYTHONPATH}"

echo "Starting Navia local runtime at http://$HOST:$PORT"
exec uvicorn "$APP_MODULE" --host "$HOST" --port "$PORT" --app-dir "$APP_DIR"
