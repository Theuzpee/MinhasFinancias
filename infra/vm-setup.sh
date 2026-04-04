#!/usr/bin/env bash
# VM setup script — Oracle Cloud Ubuntu 22.04 ARM
# Installs Docker, Docker Compose, configures swap, and clones the project.
#
# Usage: bash infra/vm-setup.sh

set -euo pipefail

echo "==> Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

echo "==> Configuring 2GB swap (recommended for 1GB RAM instances)..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "    Swap configured."
else
  echo "    Swap already exists, skipping."
fi

echo "==> Installing Docker..."
sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -qq
sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker

# Allow current user to run docker without sudo
sudo usermod -aG docker "$USER"

echo "==> Docker $(docker --version) installed."
echo "==> Docker Compose $(docker compose version) installed."

echo "==> Opening firewall ports (n8n + nginx)..."
# Oracle Cloud uses iptables, not ufw by default
sudo iptables -I INPUT -p tcp --dport 5678 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
# Persist rules
sudo apt-get install -y -qq iptables-persistent
sudo netfilter-persistent save

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your project:  git clone <repo-url>"
echo "  2. Copy env file:       cp .env.example .env && nano .env"
echo "  3. Build frontend:      cd frontend && npm install && npm run build && cd .."
echo "  4. Start services:      docker compose up -d"
echo "  5. Setup tunnel:        sudo bash infra/cloudflared-setup.sh"
echo ""
echo "NOTE: Log out and back in for docker group to take effect."
