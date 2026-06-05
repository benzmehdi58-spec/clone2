FROM python:3.12-slim

# HF Spaces security policy: run as non-root
RUN useradd -m -u 1000 appuser

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies BEFORE copying code (preserves Docker layer cache)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code + all model artifacts
COPY backend/ ./backend/

# Copy the datasets folder so inference files are available
COPY data/ ./data/

# Fix ownership so non-root user can read everything
RUN chown -R appuser:appuser /app

USER appuser

# HF Spaces requires port 7860
EXPOSE 7860

# Shift working directory to where main.py lives
WORKDIR /app/backend

# 1 worker — models are loaded into memory and state is shared
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
