#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Rodar LOCALMENTE no seu Mac para fazer deploy no servidor
# Uso: bash deploy/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SERVER="root@76.13.70.229"
BACKEND_SRC="$(cd "$(dirname "$0")/../backend" && pwd)"
FRONTEND_SRC="$(cd "$(dirname "$0")/../frontend-novo" && pwd)"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  App Terapia Acolher — Deploy"
echo "  Servidor: $SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Build do Frontend ─────────────────────────────────────────────────
echo ""
echo "▸ [1/5] Build do Frontend..."
cd "$FRONTEND_SRC"
npm install --silent
VITE_API_URL="" npm run build
echo "✅ Frontend buildado em: $FRONTEND_SRC/dist"

# ─── 2. Build do Backend ──────────────────────────────────────────────────
echo ""
echo "▸ [2/5] Build do Backend..."
cd "$BACKEND_SRC"
npm install --silent
npm run build
echo "✅ Backend buildado em: $BACKEND_SRC/dist"

# ─── 3. Enviar Frontend para o servidor ──────────────────────────────────
echo ""
echo "▸ [3/5] Enviando frontend para o servidor..."
rsync -az --delete \
  --exclude='.DS_Store' \
  "$FRONTEND_SRC/dist/" \
  "$SERVER:/var/www/acolher/frontend/"
echo "✅ Frontend enviado."

# ─── 4. Enviar Backend para o servidor ───────────────────────────────────
echo ""
echo "▸ [4/5] Enviando backend para o servidor..."
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='src' \
  --exclude='drizzle' \
  "$BACKEND_SRC/" \
  "$SERVER:/var/www/acolher/backend/"

# Enviar ecosystem e instalar deps no servidor
scp "$DEPLOY_DIR/ecosystem.config.cjs" "$SERVER:/var/www/acolher/backend/"

echo "✅ Backend enviado."

# ─── 5. Aplicar configurações e reiniciar serviços ───────────────────────
echo ""
echo "▸ [5/5] Reiniciando serviços no servidor..."
ssh "$SERVER" bash << 'REMOTE'
set -euo pipefail

# Instalar deps do backend (só produção)
cd /var/www/acolher/backend
npm install --omit=dev --silent

# Aplicar nginx config (só se mudou)
cp /var/www/acolher/backend/../nginx.conf /etc/nginx/sites-available/acolher 2>/dev/null || true

# Rodar migrations do banco
echo "  → Rodando migrations..."
NODE_ENV=production node -e "
  import('./dist/index.js').catch(e => { console.error(e); process.exit(1); })
" 2>/dev/null || true
npm run db:push 2>/dev/null || echo "  (migrations: verifique manualmente se necessário)"

# PM2 restart (ou start se primeira vez)
if pm2 list | grep -q 'acolher-backend'; then
  pm2 reload acolher-backend --update-env
else
  pm2 start /var/www/acolher/backend/ecosystem.config.cjs
fi
pm2 save

# Nginx
nginx -t && systemctl reload nginx

echo "✅ Serviços reiniciados."
REMOTE

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy concluído!"
echo ""
echo "  App: http://76.13.70.229"
echo "  Health: http://76.13.70.229/health"
echo "  Logs: ssh $SERVER 'pm2 logs acolher-backend'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
