# Стадия сборки
FROM node:20-alpine AS builder

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Удаляем package-lock.json если есть конфликты
RUN rm -f package-lock.json

# Установка зависимостей (сначала dev зависимости для сборки)
RUN npm install

# Копирование исходного кода
COPY . .

# Сборка приложения
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# Стадия сервера
FROM nginx:alpine

# Установка curl для healthcheck
RUN apk add --no-cache curl

# Копирование собранного приложения
COPY --from=builder /app/build /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создание скрипта для подстановки переменных
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-env.sh && \
    echo 'for file in /usr/share/nginx/html/static/js/*.js; do' >> /docker-entrypoint.d/40-env.sh && \
    echo '    sed -i "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL:-}|g" "$file"' >> /docker-entrypoint.d/40-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-env.sh && \
    chmod +x /docker-entrypoint.d/40-env.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

USER nginx

CMD ["nginx", "-g", "daemon off;"]