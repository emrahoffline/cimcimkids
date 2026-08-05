#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL eksik"
  exit 1
fi

echo "[entrypoint] Prisma migrate deploy..."
if [ -f ./node_modules/prisma/build/index.js ]; then
  node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
elif [ -x ./node_modules/.bin/prisma ]; then
  ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
else
  echo "[entrypoint] prisma CLI bulunamadı"
  exit 1
fi

echo "[entrypoint] Starting Next.js..."
exec node server.js
