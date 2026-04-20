# syntax=docker/dockerfile:1

# Build static assets
FROM node:20-alpine AS builder
WORKDIR /app

# Vite bakes VITE_* env vars into the bundle at build time.
# Coolify (when "Available at Buildtime" is checked) passes them as --build-arg,
# so we must declare each one as ARG and promote to ENV before `npm run build`.
ARG VITE_SIETE_API_KEY
ARG VITE_SIETE_API_URL
ARG VITE_BRIEF_WEBHOOK_URL
ARG VITE_BRIEF_WEBHOOK_SHADOW_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

ENV VITE_SIETE_API_KEY=$VITE_SIETE_API_KEY \
    VITE_SIETE_API_URL=$VITE_SIETE_API_URL \
    VITE_BRIEF_WEBHOOK_URL=$VITE_BRIEF_WEBHOOK_URL \
    VITE_BRIEF_WEBHOOK_SHADOW_URL=$VITE_BRIEF_WEBHOOK_SHADOW_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

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
