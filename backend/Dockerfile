FROM node:20-bookworm-slim AS node_runtime

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:${PATH}"
# Tell Playwright/botasaurus where to find Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=node_runtime /usr/local /usr/local

# System deps for Chromium (required by botasaurus/playwright)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libx11-6 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libatspi2.0-0 libglib2.0-0 libasound2 fonts-liberation \
    xvfb wget curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Install Playwright's Chromium (used by botasaurus under the hood)
RUN pip install --no-cache-dir playwright && \
    playwright install chromium --with-deps 2>/dev/null || \
    python -m playwright install chromium

COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app
COPY run_worker.py /app/run_worker.py

# Copy scraper scripts (Python + Node entrypoints, minus node_modules which npm ci installs)
COPY scraper /app/scraper

# Install ever-jobs Node dependencies inside the container
RUN cd /app/scraper/ever-jobs && npm ci --omit=dev 2>&1 | tail -5

EXPOSE 8000

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
