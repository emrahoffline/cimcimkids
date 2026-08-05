#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL eksik"
  exit 1
fi

echo "[entrypoint] Prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting Next.js..."
exec node server.js
