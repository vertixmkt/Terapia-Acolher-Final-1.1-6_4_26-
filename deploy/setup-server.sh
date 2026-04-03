#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-server.sh — Configura o servidor para o App Terapia Acolher
# Rodar como root na primeira vez: bash setup-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  App Terapia Acolher — Setup do Servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Atualizar sistema ───────────────────────────────────────────────────
echo ""
echo "▸ Atualizando sistema..."
apt-get update -y && apt-get upgrade -y

# ─── 2. Instalar dependências base ─────────────────────────────────────────
echo ""
echo "▸ Instalando dependências base..."
apt-get install -y curl git unzip nginx ufw

# ─── 3. Instalar Node.js 22 ────────────────────────────────────────────────
echo ""
echo "▸ Instalando Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v && npm -v

# ─── 4. Instalar PM2 ───────────────────────────────────────────────────────
echo ""
echo "▸ Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ─── 5. Instalar MySQL ────────────────────────────────────────────────────
echo ""
echo "▸ Instalando MySQL..."
apt-get install -y mysql-server

# Iniciar e habilitar MySQL
systemctl start mysql
systemctl enable mysql

# Criar banco e usuário da aplicação
echo ""
echo "▸ Configurando banco de dados..."
read -rsp "Digite a senha para o usuário MySQL 'acolher': " DB_PASS
echo ""

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS terapia_acolher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'acolher'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON terapia_acolher.* TO 'acolher'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "✅ Banco de dados configurado."
echo ""
echo "  DATABASE_URL que você usará no .env:"
echo "  mysql://acolher:${DB_PASS}@localhost:3306/terapia_acolher"

# ─── 6. Criar estrutura de diretórios ────────────────────────────────────
echo ""
echo "▸ Criando estrutura de diretórios..."
mkdir -p /var/www/acolher/backend
mkdir -p /var/www/acolher/frontend
mkdir -p /var/log/acolher

# ─── 7. Configurar Firewall ───────────────────────────────────────────────
echo ""
echo "▸ Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup do servidor concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Execute o script de deploy: bash deploy.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
