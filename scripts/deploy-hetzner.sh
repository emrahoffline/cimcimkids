#!/usr/bin/env bash
# CimcimKids → Hetzner deploy
# Kullanım:
#   export SERVER=root@YOUR_IP
#   export DOMAIN=cimcimkids.com
#   ./scripts/deploy-hetzner.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="${SERVER:?SERVER gerekli, örn: export SERVER=root@1.2.3.4}"
DOMAIN="${DOMAIN:-cimcimkids.com}"
REMOTE_DIR="${REMOTE_DIR:-/opt/cimcimkids}"

echo "==> 1) Sunucuda Docker kurulumu kontrol"
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true
mkdir -p /opt/cimcimkids
REMOTE

echo "==> 2) Dosyaları gönder (rsync)"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude '.env*' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude 'assets' \
  "$ROOT/" "$SERVER:$REMOTE_DIR/"

echo "==> 3) .env dosyaları"
if ssh "$SERVER" "test -f $REMOTE_DIR/.env && test -f $REMOTE_DIR/.env.production"; then
  echo "    Mevcut .env korunuyor"
else
  echo "    İlk kurulum: env şablonları kopyalanıyor — şifreleri düzenle!"
  ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
if [ ! -f .env ]; then
  cat > .env <<EOF
DOMAIN=$DOMAIN
POSTGRES_DB=cimcimkids
POSTGRES_USER=cimcim
POSTGRES_PASSWORD=\$(openssl rand -hex 24)
EOF
fi
if [ ! -f .env.production ]; then
  SECRET=\$(openssl rand -hex 32)
  PASS=\$(grep POSTGRES_PASSWORD .env | cut -d= -f2)
  cp deploy/env.production.example .env.production
  sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN|" .env .env.production
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" .env.production
  sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\$SECRET|" .env.production
  sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\$PASS|" .env.production
  sed -i "s|CHANGE_ME_STRONG_PASSWORD|\$PASS|" .env.production || true
fi
REMOTE
fi

echo "==> 4) Build & start"
ssh "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
docker compose --env-file .env up -d --build
docker compose ps
REMOTE

echo ""
echo "Tamam. Site: https://$DOMAIN"
echo "DNS A kaydı $DOMAIN → sunucu IP olmalı."
echo "Google OAuth redirect: https://$DOMAIN/api/auth/callback/google"
echo ""
echo "JSON veri aktarımı (bir kez, sunucuda):"
echo "  ssh $SERVER"
echo "  cd $REMOTE_DIR && docker compose exec app sh"
echo "  # veya localden: DATABASE_URL=... npm run db:migrate-json"
echo ""
echo "Env düzenle:"
echo "  ssh $SERVER nano $REMOTE_DIR/.env.production"
echo "  ssh $SERVER 'cd $REMOTE_DIR && docker compose up -d --build'"
