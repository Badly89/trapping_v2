#!/bin/bash

# deploy.sh - оптимизированный скрипт деплоя (пересборка только измененных сервисов)
# .env файлы НЕ перезаписываются из Git

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для вывода
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_separator() {
    echo "========================================="
}

# Настройки
PROJECT_DIR="/opt/crm"
GIT_REPO_URL="https://github.com/Badly89/trapping_v2.git"
GIT_BRANCH="main"
BACKUP_DIR="/opt/crm_backups"
LOG_FILE="/var/log/crm-deploy.log"

# Список файлов, которые НЕ нужно перезаписывать из Git
PROTECTED_FILES=(".env" "backend/.env" "bot/.env" "frontend/.env")

# Создание необходимых директорий
mkdir -p $PROJECT_DIR
mkdir -p $BACKUP_DIR

# Функция логирования
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Функция проверки Docker
check_docker() {
    print_info "Проверка Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен!"
        return 1
    fi
    
    if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose не установлен!"
        return 1
    fi
    
    print_success "Docker и Docker Compose установлены"
    return 0
}

# Функция проверки Git
check_git() {
    print_info "Проверка Git..."
    if ! command -v git &> /dev/null; then
        print_error "Git не установлен!"
        return 1
    fi
    print_success "Git установлен"
    return 0
}

# Функция сохранения .env файлов перед обновлением
backup_env_files() {
    print_info "Сохранение .env файлов перед обновлением..."
    
    for env_file in "${PROTECTED_FILES[@]}"; do
        local full_path="$PROJECT_DIR/$env_file"
        if [ -f "$full_path" ]; then
            local backup_name="${env_file}.backup"
            cp "$full_path" "$PROJECT_DIR/$backup_name"
            print_info "  Сохранен: $env_file"
        fi
    done
}

# Функция восстановления .env файлов после обновления
restore_env_files() {
    print_info "Восстановление .env файлов..."
    
    for env_file in "${PROTECTED_FILES[@]}"; do
        local full_path="$PROJECT_DIR/$env_file"
        local backup_name="${env_file}.backup"
        
        # Если есть бэкап и файл из Git существует, восстанавливаем бэкап
        if [ -f "$PROJECT_DIR/$backup_name" ]; then
            # Удаляем файл из Git (если он есть)
            rm -f "$full_path" 2>/dev/null || true
            # Восстанавливаем из бэкапа
            cp "$PROJECT_DIR/$backup_name" "$full_path"
            rm -f "$PROJECT_DIR/$backup_name"
            print_info "  Восстановлен: $env_file"
        fi
    done
}

# Функция клонирования или обновления репозитория (без перезаписи .env)
clone_or_update_repo() {
    print_info "Работа с Git репозиторием..."
    
    # Сохраняем .env файлы перед обновлением
    backup_env_files
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        cd $PROJECT_DIR
        
        # Сохраняем текущий коммит
        CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null)
        
        # Получаем обновления
        git fetch origin $GIT_BRANCH
        
        # Получаем последний коммит
        LATEST_COMMIT=$(git rev-parse origin/$GIT_BRANCH 2>/dev/null)
        
        if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
            print_success "Нет новых обновлений"
            return 1
        fi
        
        print_info "Доступны новые обновления!"
        print_info "Текущий коммит: ${CURRENT_COMMIT:0:8}"
        print_info "Новый коммит: ${LATEST_COMMIT:0:8}"
        
        # Показываем изменения
        print_info "Измененные файлы:"
        git diff --name-only $CURRENT_COMMIT..$LATEST_COMMIT | head -20
        
        # Сохраняем изменения перед pull
        git stash save "auto-stash-$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        
        # Pull последних изменений
        git pull origin $GIT_BRANCH
        
        # Восстанавливаем .env файлы
        restore_env_files
        
        print_success "Код обновлен (без перезаписи .env файлов)"
        log "Code updated from ${CURRENT_COMMIT:0:8} to ${LATEST_COMMIT:0:8}"
        
        # Экспортируем коммиты для других функций
        export CURRENT_COMMIT
        export LATEST_COMMIT
        return 0
    else
        print_info "Клонирование репозитория..."
        
        # Клонируем во временную директорию
        TEMP_DIR="/tmp/crm_temp_$$"
        git clone $GIT_REPO_URL $TEMP_DIR
        cd $TEMP_DIR
        git checkout $GIT_BRANCH
        
        # Удаляем .env файлы из клона (чтобы не перезаписывать существующие)
        for env_file in "${PROTECTED_FILES[@]}"; do
            rm -f "$TEMP_DIR/$env_file" 2>/dev/null || true
        done
        
        # Копируем все файлы, кроме .env
        cp -r $TEMP_DIR/* $PROJECT_DIR/ 2>/dev/null || true
        cp -r $TEMP_DIR/.[!.]* $PROJECT_DIR/ 2>/dev/null || true
        
        # Очищаем
        rm -rf $TEMP_DIR
        
        print_success "Репозиторий склонирован (.env файлы не перезаписаны)"
        log "Repository cloned (env files preserved)"
        return 0
    fi
}

# Функция создания бэкапа
create_backup() {
    print_info "Создание бэкапа конфигурации..."
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p $backup_path
    
    # Бэкапим .env файлы
    for env_file in "${PROTECTED_FILES[@]}"; do
        if [ -f "$PROJECT_DIR/$env_file" ]; then
            # Создаем поддиректорию если нужно
            local backup_subdir=$(dirname "$backup_path/$env_file")
            mkdir -p "$backup_subdir"
            cp "$PROJECT_DIR/$env_file" "$backup_path/$env_file"
        fi
    done
    
    # Бэкап загруженных файлов
    if [ -d "$PROJECT_DIR/backend/uploads" ]; then
        cp -r "$PROJECT_DIR/backend/uploads" "$backup_path/uploads" 2>/dev/null || true
    fi
    
    print_success "Бэкап создан: $backup_path"
    log "Backup created: $backup_name"
}

# Функция проверки .env файла
check_env() {
    print_info "Проверка .env файла..."
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_error ".env файл не найден!"
        print_info "Создайте .env файл в корне проекта"
        return 1
    fi
    
    export $(cat $PROJECT_DIR/.env | grep -v '^#' | xargs)
    print_success ".env файл проверен"
    return 0
}

# Функция пересборки конкретного сервиса
rebuild_service() {
    local service=$1
    print_info "Пересборка $service..."
    
    case $service in
        backend)
            docker compose stop backend 2>/dev/null || true
            docker rm crm_backend 2>/dev/null || true
            docker compose build backend --no-cache
            docker compose up -d backend
            ;;
        frontend)
            docker compose stop frontend 2>/dev/null || true
            docker rm crm_frontend 2>/dev/null || true
            docker compose build frontend --no-cache
            docker compose up -d frontend
            ;;
        bot)
            docker compose stop bot 2>/dev/null || true
            docker rm crm_bot 2>/dev/null || true
            docker compose build bot --no-cache
            docker compose up -d bot
            ;;
        all)
            docker compose down
            docker compose build --no-cache
            docker compose up -d
            ;;
    esac
    
    print_success "$service пересобран"
}

# Функция получения измененных файлов
get_changed_files() {
    cd $PROJECT_DIR
    git diff --name-only $CURRENT_COMMIT..$LATEST_COMMIT 2>/dev/null || echo ""
}

# Функция определения, какие сервисы изменились (игнорируя .env)
get_changed_services() {
    local changed_files=$(get_changed_files)
    local services=""
    
    echo "$changed_files" | while read -r file; do
        # Пропускаем .env файлы
        if [[ "$file" == *.env* ]]; then
            continue
        fi
        
        case "$file" in
            backend/*|requirements.txt|auth.py|models.py|schemas.py)
                echo "backend"
                ;;
            frontend/*|package.json|package-lock.json)
                echo "frontend"
                ;;
            bot/*)
                echo "bot"
                ;;
            docker-compose.yml)
                echo "all"
                ;;
        esac
    done | sort | uniq
}

# Функция сборки и запуска (только измененных сервисов)
smart_build_and_run() {
    print_info "Анализ изменений..."
    
    local changed_services=$(get_changed_services | sort | uniq)
    
    if [ -z "$changed_services" ]; then
        print_info "Нет изменений в сервисах, просто перезапуск..."
        docker compose restart
        return
    fi
    
    print_info "Измененные сервисы: $changed_services"
    
    # Пересобираем каждый измененный сервис
    for service in $changed_services; do
        rebuild_service $service
    done
    
    # Если изменился бэкенд, нужно подождать его готовности
    if echo "$changed_services" | grep -q "backend"; then
        print_info "Ожидание готовности бэкенда..."
        for i in {1..30}; do
            if curl -s http://10.87.0.59:6005/health > /dev/null 2>&1; then
                print_success "Бэкенд готов"
                break
            fi
            sleep 2
        done
    fi
}

# Функция проверки статуса
check_status() {
    print_info "Проверка статуса сервисов..."
    
    cd $PROJECT_DIR
    docker compose ps
    
    local all_ok=true
    
    # Проверка бэкенда
    if ! curl -s http://10.87.0.59:6005/health > /dev/null 2>&1; then
        print_error "Бэкенд не отвечает!"
        all_ok=false
    else
        print_success "Бэкенд работает"
    fi
    
    # Проверка фронтенда
    if ! curl -s http://10.87.0.59:85 > /dev/null 2>&1; then
        print_error "Фронтенд не отвечает!"
        all_ok=false
    else
        print_success "Фронтенд работает"
    fi
    
    # Проверка бота
    if docker ps | grep -q crm_bot; then
        print_success "Бот работает"
    else
        print_warning "Бот не запущен"
    fi
    
    $all_ok
}

# Функция очистки
cleanup() {
    print_info "Очистка старых Docker образов..."
    docker image prune -f 2>/dev/null || true
    print_success "Очистка завершена"
}

cleanup_old_backups() {
    print_info "Очистка старых бэкапов..."
    cd $BACKUP_DIR && ls -t 2>/dev/null | tail -n +6 | xargs -r rm -rf
    print_success "Старые бэкапы удалены"
}

# Основная функция
main() {
    print_separator
    print_info "НАЧАЛО ОПТИМИЗИРОВАННОГО ДЕПЛОЯ"
    print_info "⚠️  .env файлы НЕ будут перезаписаны из Git"
    print_separator
    
    # Проверка зависимостей
    check_docker || exit 1
    check_git || exit 1
    
    # Работа с репозиторием
    if clone_or_update_repo; then
        create_backup
    else
        print_info "Обновлений нет, выход"
        exit 0
    fi
    
    # Проверка .env
    check_env || exit 1
    
    # Умная сборка (только измененные сервисы)
    smart_build_and_run
    
    # Проверка статуса
    if check_status; then
        cleanup
        cleanup_old_backups
        
        print_separator
        print_success "ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!"
        print_separator
        print_info "📱 Фронтенд: http://10.87.0.59:85"
        print_info "📚 API Docs: http://10.87.0.59:6005/docs"
        print_info "🏥 Health: http://10.87.0.59:6005/health"
        print_separator
        print_info "👤 Логин: admin / admin123"
        print_separator
        
        log "Deploy completed successfully"
    else
        print_error "ДЕПЛОЙ ЗАВЕРШЕН С ОШИБКАМИ!"
        log "Deploy failed"
        exit 1
    fi
}

# Запуск
main "$@"