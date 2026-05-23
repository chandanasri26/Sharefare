#!/bin/bash
# Sharefare Backend Runner
# Navigates to directory, activates virtualenv, and runs the flask app.

CDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$CDIR"

echo "=== Starting Sharefare Flask Backend Server ==="
if [ -d "venv" ]; then
  source venv/bin/activate
else
  echo "Error: virtualenv (venv) not found. Please setup python venv."
  exit 1
fi

python app.py
