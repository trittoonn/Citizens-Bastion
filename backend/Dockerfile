# ==============================================================================
# Dockerfile exclusivo para desplegar solo el Backend en Go (Modo Separado)
# ==============================================================================
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /out/server /app/server
# Si existe carpeta static pre-generada, también se copia
COPY --from=builder /app/ ./source_check/
RUN if [ -d "./source_check/static" ]; then cp -r ./source_check/static /app/static; fi && rm -rf ./source_check

ENV PORT=8080
ENV STATIC_DIR=/app/static
EXPOSE 8080

CMD ["/app/server"]
