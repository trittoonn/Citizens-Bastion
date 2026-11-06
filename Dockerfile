# ==============================================================================
# Stage 1: Build Frontend Static Assets (Node)
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Permite inyectar opcionalmente la URL del backend en tiempo de build
ARG BACKEND_URL=""
ARG VITE_API_BASE_URL=""
ENV BACKEND_URL=${BACKEND_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Build Backend Binary (Golang)
# ==============================================================================
FROM golang:1.22-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/go.mod ./
COPY backend/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

# ==============================================================================
# Stage 3: Minimal Production Runtime (Serves API + Static Web UI)
# ==============================================================================
FROM alpine:3.20

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copiar binario compilado en Go
COPY --from=backend-builder /out/server /app/server

# Copiar el build estático del frontend para que el servidor Go lo sirva en "/"
COPY --from=frontend-builder /app/frontend/dist /app/static

# Variables de entorno por defecto (Render inyecta PORT automáticamente)
ENV PORT=8080
ENV STATIC_DIR=/app/static
ENV BACKEND_URL=""

EXPOSE 8080

CMD ["/app/server"]
