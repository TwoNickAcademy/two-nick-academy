#!/bin/sh
set -e

echo "▶ Aplicando migraciones Prisma..."
node_modules/.bin/prisma migrate deploy

echo "▶ Iniciando Two-Nick Academy API..."
exec node dist/src/index.js
