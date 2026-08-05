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
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
LOCAL_ENV="$ROOT/.env.local"

echo "==> 1) Sunucuda Docker + firewall"
ssh "${SSH_OPTS[@]}" "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw --force enable || true
fi
mkdir -p /opt/cimcimkids/data
REMOTE

echo "==> 2) Kod gönder (rsync)"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude '.env*' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude 'assets' \
  "$ROOT/" "$SERVER:$REMOTE_DIR/"

# Gitignore'daki runtime JSON'ları varsa gönder (sipariş/müşteri taşınsın)
for f in orders.json customers.json analytics.json subscribers.json; do
  if [ -f "$ROOT/data/$f" ]; then
    rsync -az -e "ssh ${SSH_OPTS[*]}" "$ROOT/data/$f" "$SERVER:$REMOTE_DIR/data/$f"
  fi
done

echo "==> 3) .env oluştur / güncelle"
ssh "${SSH_OPTS[@]}" "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR

if [ ! -f .env ]; then
  PASS=\$(openssl rand -hex 24)
  cat > .env <<EOF
DOMAIN=$DOMAIN
POSTGRES_DB=cimcimkids
POSTGRES_USER=cimcim
POSTGRES_PASSWORD=\$PASS
EOF
fi

# DOMAIN her deploy'da güncellenir
sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env

PASS=\$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
SECRET=\$(openssl rand -hex 32)

if [ ! -f .env.production ]; then
  cp deploy/env.production.example .env.production
fi

# Temel production değerleri
sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env.production || echo "DOMAIN=$DOMAIN" >> .env.production
grep -q '^NEXTAUTH_URL=' .env.production && sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" .env.production || echo "NEXTAUTH_URL=https://$DOMAIN" >> .env.production
grep -q '^TRUST_PROXY=' .env.production && sed -i "s|^TRUST_PROXY=.*|TRUST_PROXY=true|" .env.production || echo "TRUST_PROXY=true" >> .env.production
grep -q '^POSTGRES_PASSWORD=' .env.production && sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=\$PASS|" .env.production || echo "POSTGRES_PASSWORD=\$PASS" >> .env.production

# NEXTAUTH_SECRET boşsa veya CHANGE_ME ise üret
if ! grep -q '^NEXTAUTH_SECRET=.\+' .env.production || grep -q 'CHANGE_ME' .env.production; then
  sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\$SECRET|" .env.production || echo "NEXTAUTH_SECRET=\$SECRET" >> .env.production
fi
REMOTE

# Local .env.local'den Google / mevcut secret taşı
if [ -f "$LOCAL_ENV" ]; then
  echo "==> 3b) .env.local anahtarlarını production'a aktar"
  for KEY in NEXTAUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM ORDER_NOTIFICATION_EMAIL ADMIN_EMAILS; do
    VAL=$(grep -E "^${KEY}=" "$LOCAL_ENV" | head -1 | cut -d= -f2- || true)
    if [ -n "${VAL:-}" ]; then
      # Escape for remote sed
      ESC=$(printf '%s' "$VAL" | sed -e 's/[\/&|]/\\&/g')
      ssh "${SSH_OPTS[@]}" "$SERVER" "cd $REMOTE_DIR && if grep -q '^${KEY}=' .env.production; then sed -i 's|^${KEY}=.*|${KEY}=${ESC}|' .env.production; else echo '${KEY}=${ESC}' >> .env.production; fi"
    fi
  done
fi

echo "==> 4) Build & start (birkaç dakika sürebilir)"
ssh "${SSH_OPTS[@]}" "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
docker compose --env-file .env up -d --build
docker compose ps
REMOTE

echo "==> 5) JSON → Postgres"
ssh "${SSH_OPTS[@]}" "$SERVER" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
PASS=\$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
docker compose --env-file .env exec -T \
  -e DATABASE_URL="postgresql://cimcim:\${PASS}@db:5432/cimcimkids" \
  app node --experimental-strip-types ./scripts/migrate-json-to-pg.ts \
  || echo "UYARI: JSON import başarısız — sonra tekrar dene"
REMOTE

echo ""
echo "========================================"
echo " Site: https://$DOMAIN"
echo " Admin: https://$DOMAIN/admin"
echo "========================================"
echo "DNS: A kaydı $DOMAIN → sunucu IP olmalı (yoksa HTTPS alınamaz)."
echo "Google Console redirect URI:"
echo "  https://$DOMAIN/api/auth/callback/google"
echo ""
echo "Log: ssh $SERVER 'cd $REMOTE_DIR && docker compose logs -f app'"
