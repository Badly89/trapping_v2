FROM node:18-alpine AS builder

WORKDIR /app

# Копирование package.json
COPY package*.json ./

# Установка зависимостей (вместо npm ci)
RUN npm install --production=false

# Копирование исходников
COPY . .

# Сборка
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 81

CMD ["nginx", "-g", "daemon off;"]