FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from parent context (managed by docker-compose context: .)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY Backend/ ./Backend/

# Expose port
EXPOSE 8000

# Run dev server
CMD ["uvicorn", "Backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

