FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 5002
HEALTHCHECK --interval=15s --timeout=5s --retries=10 --start-period=20s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5002/health')" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5002"]
