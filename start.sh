#!/bin/bash
set -e

# Start Backend with Frontend static files
echo "Starting Backend..."
cd Backend
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
