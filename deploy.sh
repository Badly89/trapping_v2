#!/bin/bash

# deploy.sh - скрипт для деплоя на сервер

set -e

echo "🚀 Начинаем деплой CRM системы..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env файл из шаблона .env.production"
    exit 1
fi

# Загрузка переменных окружения
export $(cat .env | grep -v '^#' | xargs)

# Проверка обязательных переменных
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your-secret-key-change-me" ]; then
    echo "❌ SECRET_KEY не установлен или используется значение по умолчанию!"
    echo "Установите SECRET_KEY в .env файле"
    exit 1
fi

if [ -z "$MAX_BOT_TOKEN" ]; then
    echo "⚠️ ВНИМАНИЕ: MAX_BOT_TOKEN не установлен!"
    echo "Бот не будет работать без токена"
fi

# Остановка старых контейнеров
echo "🛑 Остановка старых контейнеров..."
docker compose down || docker-compose down

# Сборка образов
echo "🔨 Сборка Docker образов..."
docker compose build --no-cache || docker-compose build --no-cache

# Запуск контейнеров
echo "▶️ Запуск контейнеров..."
docker compose up -d || docker-compose up -d

# Ожидание готовности бэкенда
echo "⏳ Ожидание готовности бэкенда..."
sleep 15

# Проверка статуса
echo "🔍 Проверка статуса..."
docker compose ps || docker-compose ps

# Проверка health бэкенда
echo "🏥 Проверка health бэкенда..."
curl -f http://localhost:8000/health || echo "⚠️ Бэкенд не отвечает"

echo "✅ Деплой завершен!"
echo "📱 CRM доступна по адресу: http://$(hostname -I | awk '{print $1}')"
echo "📚 Документация API: http://$(hostname -I | awk '{print $1}')/docs"