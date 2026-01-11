#!/bin/bash
set -e

# Start Backend
echo "Starting Backend..."
cd Backend
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
