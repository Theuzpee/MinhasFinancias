#!/usr/bin/env bash
# Cloudflare Tunnel setup script
# Installs cloudflared and registers it as a systemd service with two ingress rules.
#
# Usage: sudo bash cloudflared-setup.sh
# Requires: systemd, curl, a valid Cloudflare Tunnel token (run `cloudflared tunnel login` first)

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
DOMAIN="myfinancias.duckdns.org"
API_DOMAIN="myfinancias-api.duckdns.org"
# ──────────────────────────────────────────────────────────────────────────────

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  CF_ARCH="amd64" ;;
  aarch64) CF_ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"

echo "==> Downloading cloudflared (${CF_ARCH})..."
curl -fsSL "$CLOUDFLARED_URL" -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
echo "    cloudflared $(cloudflared --version) installed."

echo "==> Creating /etc/cloudflared/config.yml..."
mkdir -p /etc/cloudflared
cat > /etc/cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: ${API_DOMAIN}
    service: http://localhost:5678
  - hostname: ${DOMAIN}
    service: http://localhost:8080
  - service: http_status:404
EOF
echo "    Config written to /etc/cloudflared/config.yml"
echo "    NOTE: Replace <TUNNEL_ID> with your actual tunnel ID after running:"
echo "          cloudflared tunnel create <tunnel-name>"

echo "==> Installing cloudflared as a systemd service..."
cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cloudflared
systemctl start cloudflared

echo ""
echo "==> Done! cloudflared is running as a systemd service."
echo "    Check status: systemctl status cloudflared"
echo "    View logs:    journalctl -u cloudflared -f"
