FROM node:18-alpine AS builder

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование исходников
COPY . .

# Сборка с переменными окружения
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=builder /app/build /usr/share/nginx/html

# Копирование конфигурации nginx (теперь с портом 89)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создание скрипта для замены переменных окружения
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-env.sh && \
    echo 'echo "Setting up environment variables..."' >> /docker-entrypoint.d/40-env.sh && \
    echo 'for file in /usr/share/nginx/html/static/js/*.js; do' >> /docker-entrypoint.d/40-env.sh && \
    echo '    if [ -n "$REACT_APP_API_URL" ]; then' >> /docker-entrypoint.d/40-env.sh && \
    echo '        sed -i "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL}|g" $file' >> /docker-entrypoint.d/40-env.sh && \
    echo '    fi' >> /docker-entrypoint.d/40-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-env.sh && \
    chmod +x /docker-entrypoint.d/40-env.sh

# Изменяем порт в nginx.conf на 89 (уже сделано выше)

EXPOSE 89

CMD ["nginx", "-g", "daemon off;"]