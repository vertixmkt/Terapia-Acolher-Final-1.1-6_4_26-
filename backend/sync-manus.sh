#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# sync-manus.sh — Sincroniza terapeutas do sistema Manus para o sistema novo
# Roda via cron no servidor: */30 * * * * /var/www/acolher/backend/sync-manus.sh
# ─────────────────────────────────────────────────────────────────────────────

MANUS_API="https://cerebroterapiaacolher.manus.space/api/trpc/terapeutas.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D"
LOCAL_API="http://localhost:3000/api/internal/sync-manus"
ADMIN_SECRET="ac0lh3r-admin-s3cr3t-2026"
LOG="/var/log/acolher/sync-manus.log"
TMP="/tmp/manus-sync-data.json"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] Sync iniciado" >> "$LOG"

# 1. Baixar dados do Manus para arquivo temporário
curl -s --max-time 30 -o "$TMP" "$MANUS_API"

if [ ! -s "$TMP" ]; then
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] ERRO: Falha ao buscar dados do Manus" >> "$LOG"
  rm -f "$TMP"
  exit 1
fi

# 2. Enviar pro endpoint local via arquivo
RESULT=$(curl -s --max-time 60 -X POST "$LOCAL_API" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d @"$TMP")

echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] Resultado: $RESULT" >> "$LOG"

rm -f "$TMP"
