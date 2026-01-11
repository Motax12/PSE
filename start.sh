#!/bin/bash
set -e

# Build Frontend
echo "Building Frontend..."
cd Frontend
npm install
npm run build
cd ..

# Start Backend with Frontend static files
echo "Starting Backend..."
cd Backend
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port $PORT
