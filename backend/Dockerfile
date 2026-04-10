FROM python:3.11-slim

WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода
COPY . .

# Создание директории для загрузок
RUN mkdir -p uploads

# Запуск (используем uvicorn напрямую, без gunicorn для простоты)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]