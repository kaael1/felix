# syntax=docker/dockerfile:1.7

############################
# Frontend build stage
############################
FROM node:20-bookworm AS frontend-builder

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Install frontend deps and build the Next.js app
COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --include=dev

# Copy the remaining source to build the production bundle
COPY . .
RUN npm run build && npm prune --omit=dev

############################
# Runtime stage
############################
FROM node:20-bookworm

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PYTHONUNBUFFERED=1 \
    PYTHON_PORT=8000 \
    PORT=3000 \
    HOST=0.0.0.0 \
    PYTHON_SERVICE_URL=http://127.0.0.1:8000

WORKDIR /app

# Install Python runtime for the FastAPI agent
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-venv python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Create an isolated virtualenv to avoid PEP 668 issues
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip

ENV PATH="/opt/venv/bin:${PATH}"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and built frontend artifacts
COPY backend ./backend
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/next.config.ts ./next.config.ts
COPY --from=frontend-builder /app/node_modules ./node_modules

# Entry script that starts both FastAPI and Next.js
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000 8000

CMD ["./docker-entrypoint.sh"]

