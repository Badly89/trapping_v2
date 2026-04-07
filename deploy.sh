#!/bin/bash

# deploy.sh - скрипт для деплоя на сервер 10.87.0.59

set -e

echo "========================================="
echo "🚀 ДЕПЛОЙ CRM СИСТЕМЫ"
echo "📍 Сервер: 10.87.0.59"
echo "========================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "Установите Docker: curl -fsSL https://get.docker.com | sudo sh"
    exit 1
fi

# Проверка наличия Docker Compose
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env файл из шаблона"
    exit 1
fi

# Загрузка переменных окружения
export $(cat .env | grep -v '^#' | xargs)

# Проверка обязательных переменных
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "your-super-secret-key-change-me-to-random-string-12345" ]; then
    echo "❌ SECRET_KEY не установлен или используется значение по умолчанию!"
    echo "Установите SECRET_KEY в .env файле"
    exit 1
fi

if [ -z "$MAX_BOT_TOKEN" ]; then
    echo "⚠️ ВНИМАНИЕ: MAX_BOT_TOKEN не установлен!"
    echo "Бот не будет работать без токена"
fi

# Остановка старых контейнеров
echo ""
echo "🛑 Остановка старых контейнеров..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# Очистка неиспользуемых томов (опционально)
# echo "🗑️ Очистка неиспользуемых томов..."
# docker volume prune -f

# Сборка образов
echo ""
echo "🔨 Сборка Docker образов..."
docker compose build --no-cache 2>/dev/null || docker-compose build --no-cache

# Запуск контейнеров
echo ""
echo "▶️ Запуск контейнеров..."
docker compose up -d 2>/dev/null || docker-compose up -d

# Ожидание готовности бэкенда
echo ""
echo "⏳ Ожидание готовности бэкенда..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Бэкенд готов"
        break
    fi
    echo "   Ожидание... ($i/30)"
    sleep 2
done

# Инициализация базы данных
echo ""
echo "🗄️ Инициализация базы данных..."
docker exec crm_backend python -c "
from models import Base, engine
Base.metadata.create_all(bind=engine)
print('✅ Таблицы созданы')
" 2>/dev/null || echo "⚠️ Ошибка инициализации БД (возможно уже создана)"

# Создание тестовых пользователей
echo ""
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
        hashed_password=get_password_hash('Yjz,hmcr89'),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    print('✅ Администратор создан (admin)')

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
    print('✅ Оператор создан (operator)')

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
    print('✅ Исполнитель создан (executor)')

db.commit()
db.close()
" 2>/dev/null || echo "⚠️ Пользователи уже существуют"

# Проверка статуса
echo ""
echo "🔍 Статус контейнеров:"
docker compose ps 2>/dev/null || docker-compose ps

# Вывод информации
echo ""
echo "========================================="
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "========================================="
echo "📱 CRM доступна по адресу: http://10.87.0.59"
echo "📚 Документация API: http://10.87.0.59/docs"
echo "🏠 Health check: http://10.87.0.59/health"
echo ""
echo "👤 Тестовые пользователи:"
echo "   Администратор: admin / admin123"
echo "   Оператор: operator / operator123"
echo "   Исполнитель: executor / executor123"
echo ""
echo "📋 Полезные команды:"
echo "   Просмотр логов: docker compose logs -f"
echo "   Перезапуск: docker compose restart"
echo "   Остановка: docker compose down"
echo "========================================="