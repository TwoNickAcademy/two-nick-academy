# ── Two-Nick Academy API ──────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@10.30.3

# Copiar manifiestos de dependencias (capa cacheada)
COPY package.json pnpm-lock.yaml ./

# Instalar TODAS las dependencias (dev incluido → prisma CLI necesario en entrypoint)
RUN pnpm install --frozen-lockfile

# Copiar código fuente (node_modules excluido via .dockerignore)
COPY . .

# Generar Prisma client + compilar TypeScript
RUN pnpm exec prisma generate && pnpm build

EXPOSE 3000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
