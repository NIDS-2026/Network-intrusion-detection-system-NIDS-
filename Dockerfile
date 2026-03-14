# ── NIDS API — Dockerfile ──────────────────────────────────────────────
# Build:   docker build -t nids-api .
# Run:     docker run -p 8000:8000 -e NIDS_API_KEY=your-key nids-api
# Compose: docker compose up -d
# ──────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only what the API needs (not capture.py, data, notebooks, etc.)
COPY backend/ ./backend/
COPY model/nids_model.pkl    ./model/nids_model.pkl
COPY model/label_encoder.pkl ./model/label_encoder.pkl

EXPOSE 8000

# Default API key — OVERRIDE this at runtime via -e or docker-compose.yml
ENV NIDS_API_KEY=change-me-in-production

# Healthcheck — Docker will mark the container unhealthy if /health fails
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
