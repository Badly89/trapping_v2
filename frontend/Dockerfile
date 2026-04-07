FROM node:18-alpine AS builder

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходников и сборка
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=builder /app/build /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создание скрипта для замены переменных окружения
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-env.sh && \
    echo 'for file in /usr/share/nginx/html/static/js/*.js; do' >> /docker-entrypoint.d/40-env.sh && \
    echo '    sed -i "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL:-http://10.87.0.59/api}|g" $file' >> /docker-entrypoint.d/40-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-env.sh && \
    chmod +x /docker-entrypoint.d/40-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]