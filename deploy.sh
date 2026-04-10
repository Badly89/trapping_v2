#!/bin/bash

# deploy.sh - скрипт для деплоя с GitHub (без очистки БД)

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
GIT_REPO_URL="https://github.com/ваш-username/ваш-репозиторий.git"  # Замените на ваш URL
GIT_BRANCH="main"  # или master
BACKUP_DIR="/opt/crm_backups"
LOG_FILE="/var/log/crm-deploy.log"

# Создание необходимых директорий
mkdir -p $PROJECT_DIR
mkdir -p $BACKUP_DIR

# Функция логирования
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Функция проверки портов
check_ports() {
    print_info "Проверка свободных портов..."
    local ports=(6005 81 3306)
    for port in "${ports[@]}"; do
        if sudo lsof -i :$port > /dev/null 2>&1; then
            print_warning "Порт $port занят, но продолжаем..."
            log "Port $port is busy"
        fi
    done
    print_success "Проверка портов завершена"
}

# Функция проверки Docker
check_docker() {
    print_info "Проверка Docker..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен!"
        print_info "Установите Docker: curl -fsSL https://get.docker.com | sudo sh"
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
        print_info "Установите Git: sudo apt install git -y"
        return 1
    fi
    print_success "Git установлен"
    return 0
}

# Функция клонирования или обновления репозитория
clone_or_update_repo() {
    print_info "Работа с Git репозиторием..."
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        print_info "Репозиторий уже существует, обновляем..."
        cd $PROJECT_DIR
        
        # Сохраняем текущий коммит
        CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
        
        # Получаем обновления
        git fetch origin $GIT_BRANCH
        
        # Получаем последний коммит
        LATEST_COMMIT=$(git rev-parse origin/$GIT_BRANCH 2>/dev/null || echo "none")
        
        if [ "$CURRENT_COMMIT" = "$LATEST_COMMIT" ]; then
            print_success "Нет новых обновлений. Текущая версия актуальна."
            return 1
        fi
        
        print_info "Доступны новые обновления!"
        print_info "Текущий коммит: ${CURRENT_COMMIT:0:8}"
        print_info "Новый коммит: ${LATEST_COMMIT:0:8}"
        
        # Показываем изменения
        print_info "Изменения:"
        git log --oneline $CURRENT_COMMIT..$LATEST_COMMIT | head -10
        
        # Сохраняем изменения перед pull
        git stash save "auto-stash-$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        
        # Pull последних изменений
        git pull origin $GIT_BRANCH
        
        print_success "Код обновлен"
        log "Code updated from commit ${CURRENT_COMMIT:0:8} to ${LATEST_COMMIT:0:8}"
        return 0
    else
        print_info "Клонирование репозитория..."
        rm -rf $PROJECT_DIR
        git clone $GIT_REPO_URL $PROJECT_DIR
        cd $PROJECT_DIR
        git checkout $GIT_BRANCH
        print_success "Репозиторий склонирован"
        log "Repository cloned from $GIT_REPO_URL"
        return 0
    fi
}

# Функция создания бэкапа (только .env и uploads, без БД)
create_backup() {
    print_info "Создание бэкапа конфигурации..."
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p $backup_path
    
    # Бэкап .env файла
    if [ -f "$PROJECT_DIR/.env" ]; then
        cp "$PROJECT_DIR/.env" "$backup_path/.env"
        print_success "Бэкап .env файла создан"
    fi
    
    # Бэкап загруженных файлов
    if [ -d "$PROJECT_DIR/backend/uploads" ]; then
        cp -r "$PROJECT_DIR/backend/uploads" "$backup_path/uploads" 2>/dev/null || true
        print_success "Бэкап загруженных файлов создан"
    fi
    
    print_success "Бэкап конфигурации создан: $backup_path"
    log "Backup created: $backup_name"
}

# Функция проверки .env файла
check_env() {
    print_info "Проверка .env файла..."
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        print_warning ".env файл не найден, создаем из шаблона..."
        
        cat > "$PROJECT_DIR/.env" << 'EOF'
# База данных
MYSQL_ROOT_PASSWORD=<fhvfktq12
MYSQL_DATABASE=crm_db
MYSQL_USER=crm_user
MYSQL_PASSWORD=Yjz,hmcr89

# JWT Секрет
SECRET_KEY=lyAHMpXPxcphF74dwSX99RY7xyaJUqBWS9RBapGser4

# MAX Bot Token
MAX_BOT_TOKEN=f9LHodD0cOJJ6K-QVRL1eXxKJBfVXYDFENDws89pE-tZKLjpxzyv_d2WHogalf_JsaKuX4td6ICUIf8b2Vg7

# URL для фронтенда
REACT_APP_API_URL=http://10.87.0.59:6005/api
EOF
        print_warning "Пожалуйста, отредактируйте .env файл и установите правильные значения!"
        print_warning "Особенно важно: SECRET_KEY и MAX_BOT_TOKEN"
        return 1
    fi
    
    # Загрузка переменных окружения
    export $(cat $PROJECT_DIR/.env | grep -v '^#' | xargs)
    
    print_success ".env файл проверен"
    return 0
}

# Функция сборки и запуска контейнеров (только backend и frontend, БЕЗ очистки БД)
build_and_run() {
    print_info "Сборка Docker образов..."
    cd $PROJECT_DIR
    
    # Остановка только backend и frontend (БД не трогаем)
    print_info "Остановка backend и frontend..."
    docker stop crm_backend crm_frontend 2>/dev/null || true
    docker rm crm_backend crm_frontend 2>/dev/null || true
    
    # Пересборка backend и frontend
    print_info "Пересборка backend..."
    docker compose build backend --no-cache
    
    print_info "Пересборка frontend..."
    docker compose build frontend --no-cache
    
    # Запуск backend и frontend
    print_info "Запуск backend и frontend..."
    docker compose up -d backend frontend
    
    print_success "Backend и frontend обновлены и запущены"
}

# Функция проверки статуса
check_status() {
    print_info "Проверка статуса сервисов..."
    
    cd $PROJECT_DIR
    docker compose ps
    
    # Проверка бэкенда
    for i in {1..30}; do
        if curl -s http://10.87.0.59:6005/health > /dev/null 2>&1; then
            print_success "Бэкенд работает (порт 6005)"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Бэкенд не отвечает!"
            docker compose logs backend --tail=20
            return 1
        fi
        sleep 2
    done
    
    # Проверка фронтенда
    if curl -s http://10.87.0.59:81 > /dev/null 2>&1; then
        print_success "Фронтенд работает (порт 81)"
    else
        print_error "Фронтенд не отвечает!"
        docker compose logs frontend --tail=20
        return 1
    fi
    
    return 0
}

# Функция очистки старых образов (без удаления данных)
cleanup() {
    print_info "Очистка старых Docker образов..."
    docker image prune -f 2>/dev/null || true
    print_success "Очистка завершена"
}

# Функция очистки старых бэкапов
cleanup_old_backups() {
    print_info "Очистка старых бэкапов (оставляем последние 5)..."
    cd $BACKUP_DIR && ls -t 2>/dev/null | tail -n +6 | xargs -r rm -rf
    print_success "Старые бэкапы удалены"
}

# Основная функция
main() {
    print_separator
    print_info "НАЧАЛО ДЕПЛОЯ CRM СИСТЕМЫ (БЕЗ ОЧИСТКИ БД)"
    print_info "Обновляются только фронтенд и бэкенд"
    print_separator
    
    # Проверка зависимостей
    check_docker || exit 1
    check_git || exit 1
    check_ports
    
    # Работа с репозиторием
    if clone_or_update_repo; then
        # Создание бэкапа конфигурации
        create_backup
    else
        print_info "Обновление не требуется"
    fi
    
    # Проверка .env файла
    check_env || exit 1
    
    # Сборка и запуск (БЕЗ очистки БД)
    build_and_run
    
    # Проверка статуса
    if check_status; then
        # Очистка старых образов
        cleanup
        cleanup_old_backups
        
        print_separator
        print_success "ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН!"
        print_separator
        print_info "📱 Фронтенд: http://10.87.0.59:81"
        print_info "📚 API Docs: http://10.87.0.59:6005/docs"
        print_info "🏥 Health: http://10.87.0.59:6005/health"
        print_separator
        print_info "👤 Тестовые пользователи:"
        print_info "   Администратор: admin"
        print_info "   Оператор: operator "
        print_info "   Исполнитель: executor"
        print_separator
        print_warning "База данных НЕ БЫЛА затронута - все данные сохранены!"
        print_separator
        
        log "Deploy completed successfully (without DB cleanup)"
    else
        print_error "ДЕПЛОЙ ЗАВЕРШЕН С ОШИБКАМИ!"
        log "Deploy failed"
        exit 1
    fi
}

# Запуск
main "$@"