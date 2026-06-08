FROM python:3.12

# Set up a new user named "user" with user ID 1000
# Hugging Face Spaces run as a non-root user
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user ./backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user ./backend /app/backend
# Also copy frontend/public if you need any models from the root level, but here we just need backend
# If database needs to be created, ensure it writes to a writable directory like /tmp or /app
# Setting permissions might be needed for sqlite db creation

# Hugging Face Spaces require running on port 7860
ENV PORT=7860
EXPOSE 7860

CMD ["python", "backend/run_server.py"]
