#!/usr/bin/env bash
set -euo pipefail

# Starts the backend using the correct backend virtualenv.
# Usage: bash run_backend.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV1="$BACKEND_DIR/.venv"
VENV2="$ROOT_DIR/.venv"

if [ -d "$VENV1" ]; then
  VENV="$VENV1"
elif [ -d "$VENV2" ]; then
  VENV="$VENV2"
else
  echo "No .venv found in $BACKEND_DIR or $ROOT_DIR. Create one with: python3.13 -m venv backend/.venv" >&2
  exit 1
fi

echo "Using venv: $VENV"
cd "$BACKEND_DIR"
# shellcheck disable=SC1091
source "$VENV/bin/activate"

PYTHON_EXEC="$VENV/bin/python"
echo "Starting backend (uvicorn app.main:app) on 127.0.0.1:8000 using $PYTHON_EXEC"
exec "$PYTHON_EXEC" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
