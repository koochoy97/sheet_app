# syntax=docker/dockerfile:1

# Build static assets
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build production bundle
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:1.27-alpine AS runner

# Copy custom nginx config for SPA routing
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
