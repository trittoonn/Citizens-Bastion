# Citizens' Bastion — Makefile
# Permite compilar y ejecutar el frontend, el backend o ambos integrados (sirviendo el front estático desde Go).

GO ?= $(shell which go 2>/dev/null || echo /usr/local/go/bin/go)
NPM ?= npm
PORT ?= 8080
BACKEND_URL ?=

FRONTEND_DIR := frontend
BACKEND_DIR := backend
STATIC_DIR := $(BACKEND_DIR)/static
BIN_DIR := $(BACKEND_DIR)/bin
SERVER_BIN := $(BIN_DIR)/server

.PHONY: all build build-front sync-static build-back run run-back run-front test test-back test-front clean help

## all / build: Compila el frontend, copia el build estático a backend/static y compila el binario en Go
all: build

build: build-front sync-static build-back
	@echo "✅ Build completo (Frontend en $(STATIC_DIR) + Backend en $(SERVER_BIN))"

## build-front: Instala dependencias y genera el bundle estático del frontend (frontend/dist)
build-front:
	@echo "📦 Compilando Frontend (Node/Vite)..."
	cd $(FRONTEND_DIR) && $(NPM) install && BACKEND_URL="$(BACKEND_URL)" VITE_API_BASE_URL="$(BACKEND_URL)" $(NPM) run build

## sync-static: Copia el build del frontend (frontend/dist) hacia backend/static para que el server Go lo sirva
sync-static:
	@echo "📂 Copiando archivos estáticos de $(FRONTEND_DIR)/dist a $(STATIC_DIR)..."
	rm -rf $(STATIC_DIR)
	mkdir -p $(STATIC_DIR)
	cp -r $(FRONTEND_DIR)/dist/* $(STATIC_DIR)/

## build-back: Compila únicamente el servidor backend en Go
build-back:
	@echo "🔨 Compilando Backend (Golang)..."
	mkdir -p $(BIN_DIR)
	cd $(BACKEND_DIR) && $(GO) build -o bin/server ./cmd/server

## run: Compila todo (front + back) y levanta el servidor Go sirviendo tanto la web como la API en :8080
run: build
	@echo "🚀 Iniciando servidor unificado (Web + API) en http://localhost:$(PORT)"
	STATIC_DIR=$(STATIC_DIR) PORT=$(PORT) BACKEND_URL="$(BACKEND_URL)" $(SERVER_BIN)

## run-back: Ejecuta únicamente el servidor backend en Go
run-back:
	cd $(BACKEND_DIR) && STATIC_DIR=./static PORT=$(PORT) BACKEND_URL="$(BACKEND_URL)" $(GO) run ./cmd/server

## run-front: Ejecuta el servidor de desarrollo de Vite en :5173
run-front:
	cd $(FRONTEND_DIR) && $(NPM) run dev

## test: Ejecuta los tests del backend y del frontend
test: test-back test-front

test-back:
	cd $(BACKEND_DIR) && $(GO) test -v -race ./...

test-front:
	cd $(FRONTEND_DIR) && $(NPM) run test -- --run

## clean: Elimina artefactos de compilación
clean:
	rm -rf $(FRONTEND_DIR)/dist $(STATIC_DIR) $(BIN_DIR)

help:
	@echo "Comandos disponibles en Makefile:"
	@echo "  make build        - Compila el front, lo copia al back ($(STATIC_DIR)) y compila el server Go"
	@echo "  make build-front  - Compila solo el frontend (acepta BACKEND_URL=https://...)"
	@echo "  make build-back   - Compila solo el backend en Go"
	@echo "  make sync-static  - Copia $(FRONTEND_DIR)/dist dentro de $(STATIC_DIR)"
	@echo "  make run          - Compila ambos y levanta el server Go sirviendo la web y la API"
	@echo "  make run-back     - Levanta solo el backend en Go"
	@echo "  make run-front    - Levanta el entorno dev de Vite"
	@echo "  make test         - Corre todos los tests (Go + Vitest)"
	@echo "  make clean        - Limpia archivos generados"
