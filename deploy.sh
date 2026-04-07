#!/bin/bash

# deploy.sh - скрипт для деплоя на сервер

set -e

echo "🚀 Начинаем деплой CRM системы..."

# Загрузка переменных окружения
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Остановка старых контейнеров
echo "🛑 Остановка старых контейнеров..."
docker-compose down

# Сборка образов
echo "🔨 Сборка Docker образов..."
docker-compose build --no-cache

# Запуск контейнеров
echo "▶️ Запуск контейнеров..."
docker-compose up -d

# Ожидание готовности бэкенда
echo "⏳ Ожидание готовности бэкенда..."
sleep 10

# Инициализация базы данных
echo "🗄️ Инициализация базы данных..."
docker exec crm_backend python -c "
from models import Base, engine
Base.metadata.create_all(bind=engine)
print('✅ Таблицы созданы')
"

# Создание тестовых пользователей
echo "👤 Создание тестовых пользователей..."
docker exec crm_backend python -c "
from models import SessionLocal, User, UserRole
from auth import get_password_hash

db = SessionLocal()

# Администратор
if not db.query(User).filter(User.username == 'admin').first():
    admin = User(
        username='admin',
        email='admin@example.com',
        full_name='Администратор',
        hashed_password=get_password_hash('admin123'),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)

# Оператор
if not db.query(User).filter(User.username == 'operator').first():
    operator = User(
        username='operator',
        email='operator@example.com',
        full_name='Оператор',
        hashed_password=get_password_hash('operator123'),
        role=UserRole.OPERATOR,
        is_active=True
    )
    db.add(operator)

# Исполнитель
if not db.query(User).filter(User.username == 'executor').first():
    executor = User(
        username='executor',
        email='executor@example.com',
        full_name='Исполнитель',
        hashed_password=get_password_hash('executor123'),
        role=UserRole.EXECUTOR,
        is_active=True
    )
    db.add(executor)

db.commit()
db.close()
print('✅ Пользователи созданы')
"

# Проверка статуса
echo "🔍 Проверка статуса..."
docker-compose ps

echo "✅ Деплой завершен!"
echo "📱 CRM доступна по адресу: http://$(hostname -I | awk '{print $1}')"
echo "📚 Документация API: http://$(hostname -I | awk '{print $1}')/docs"