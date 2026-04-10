# ============================================
# СТАДИЯ 1: Сборка приложения
# ============================================
FROM node:18-alpine AS builder

# Установка переменных сборки
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_WS_URL=$REACT_APP_WS_URL \
    NODE_ENV=production \
    GENERATE_SOURCEMAP=false

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей (чистая установка без devDependencies)
RUN npm ci --only=production --no-audit --no-fund

# Копирование исходного кода
COPY . .

# Сборка приложения с оптимизациями
RUN npm run build

# ============================================
# СТАДИЯ 2: Сервер Nginx
# ============================================
FROM nginx:alpine

# Установка переменных для Nginx
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1

# Копирование собранного приложения
COPY --from=builder /app/build /usr/share/nginx/html

# Копирование конфигурации Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создание скрипта для подстановки переменных окружения
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-env.sh && \
    echo 'echo "🔧 Подстановка переменных окружения..."' >> /docker-entrypoint.d/40-env.sh && \
    echo 'for file in /usr/share/nginx/html/static/js/*.js; do' >> /docker-entrypoint.d/40-env.sh && \
    echo '    if [ -f "$file" ]; then' >> /docker-entrypoint.d/40-env.sh && \
    echo '        sed -i "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL:-}|g" "$file"' >> /docker-entrypoint.d/40-env.sh && \
    echo '        sed -i "s|REACT_APP_WS_URL_PLACEHOLDER|${REACT_APP_WS_URL:-}|g" "$file"' >> /docker-entrypoint.d/40-env.sh && \
    echo '    fi' >> /docker-entrypoint.d/40-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-env.sh && \
    chmod +x /docker-entrypoint.d/40-env.sh

# Оптимизация Nginx
RUN echo 'client_max_body_size 10M;' >> /etc/nginx/conf.d/default.conf && \
    echo 'proxy_read_timeout 300s;' >> /etc/nginx/conf.d/default.conf && \
    echo 'proxy_connect_timeout 75s;' >> /etc/nginx/conf.d/default.conf

# Проверка конфигурации Nginx
RUN nginx -t

# Очистка кэша apt (экономит место)
RUN rm -rf /var/cache/apk/*

# Здоровье контейнера
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80

USER nginx

CMD ["nginx", "-g", "daemon off;"]