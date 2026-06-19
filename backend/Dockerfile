FROM node:20-bookworm-slim AS node_runtime

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:${PATH}"

COPY --from=node_runtime /usr/local /usr/local

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app
COPY run_worker.py /app/run_worker.py
COPY scraper /app/scraper

RUN if [ -f /app/scraper/ever-jobs/package-lock.json ]; then \
      cd /app/scraper/ever-jobs && npm ci; \
    fi

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
