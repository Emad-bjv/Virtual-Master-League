#!/bin/bash
# =============================================================
# Virtual Master League - Server Setup Script
# Run this ONCE on the ArvanCloud server after first SSH login
# Usage: bash setup_server.sh
# =============================================================

set -e  # Exit on error

echo "========================================"
echo "  VML Server Setup - ArvanCloud"
echo "========================================"

# 1. Update system
echo "[1/6] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install Docker
echo "[2/6] Installing Docker..."
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Start Docker
echo "[3/6] Starting Docker service..."
systemctl enable docker
systemctl start docker

# 4. Install Git
echo "[4/6] Installing Git..."
apt-get install -y -qq git

# 5. Create project directory
echo "[5/6] Creating project directory..."
mkdir -p /opt/vml
cd /opt/vml

# 6. Done
echo "[6/6] ✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your project: git clone <YOUR_REPO_URL> /opt/vml"
echo "  2. Create .env.production file (copy from .env.production.example)"
echo "  3. Run: cd /opt/vml && docker compose up -d --build"
echo ""
echo "Server IP: $(curl -s ifconfig.me)"
