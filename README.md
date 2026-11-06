# Citizens' Bastion — Online Multiplayer Card Game

Implementación completa de **[docs/Reglas 2026 v1.md](docs/Reglas%202026%20v1.md)** con un servidor backend en **Golang** (motor de reglas autoritativo, creación de salas con nombre de partida, opciones configurables de reglas, servidor de archivos estáticos integrado y CORS totalmente permisivo) y un cliente frontend en **Node (React + TypeScript + Vite + Tailwind CSS)** sincronizado por **polling** y respaldado por `localStorage`.

---

## Uso con `Makefile` (Compilar Juntos o por Separado)

Podés usar los comandos de [Makefile](Makefile) desde la raíz del proyecto:

```bash
# 1. Compilar AMBOS (genera el build del front, lo copia a backend/static y compila el binario Go)
make build

# 2. Compilar y levantar el servidor Go unificado (sirve la Web estática + API en http://localhost:8080)
make run

# 3. Compilar por separado
make build-front      # Compila solo el frontend en frontend/dist
make sync-static      # Copia frontend/dist hacia backend/static
make build-back       # Compila solo el binario Go en backend/bin/server

# 4. Ejecutar por separado en modo desarrollo
make run-back         # Levanta solo el backend en :8080
make run-front        # Levanta solo Vite en :5173

# 5. Ejecutar todos los tests (Go + Vitest)
make test
```

---

## Despliegue en Render (Proyecto Único o Separado)

### Opción A: Proyecto Único en Render (Docker Unificado — Recomendado)
1. En Render, creá un nuevo **Web Service** (o **Blueprint** usando [render.yaml](render.yaml)) conectado a este repositorio.
2. Seleccioná **Runtime: Docker** (usa el [Dockerfile](Dockerfile) de la raíz).
3. El `Dockerfile` compila automáticamente el frontend con Node, el backend con Go, copia el contenido estático a `/app/static` y levanta el servidor en el `$PORT` asignado por Render sirviendo tanto la página web como `/api/*`.

### Opción B: Despliegue por Separado en Render (Static Site + Backend Web Service)
1. **Backend (Web Service)**:
   - Creá un **Web Service** con **Runtime: Docker** apuntando a `backend/Dockerfile` (o `Root Directory: backend`).
   - Copiá la URL pública que te asigne Render (por ejemplo: `https://citizens-bastion-api.onrender.com`).
2. **Frontend (Static Site)**:
   - Creá un **Static Site** apuntando al repositorio:
     - **Root Directory**: `frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`
   - En **Environment Variables**, agregá:
     - `BACKEND_URL` = `https://citizens-bastion-api.onrender.com` (o `VITE_API_BASE_URL` = `https://citizens-bastion-api.onrender.com`).
   - Nota: Incluso si servís los archivos estáticos desde el servidor Go y querés que apunten a otra URL de backend, podés definir `BACKEND_URL` como variable de entorno en el servidor Go y este la inyectará dinámicamente en `/config.js`.
   - El servidor Go tiene **CORS 100% permisivo** (refleja cualquier `Origin` y cualquier `Access-Control-Request-Headers`, permitiendo `GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`), por lo que no tendrás bloqueos de CORS entre dominios distintos.
