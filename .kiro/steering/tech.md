# Stack Tecnológica

## Runtime e Infraestrutura

- **Google Cloud Platform (GCP)** — hospedagem em VM e2-micro (free tier), recomendado adicionar swap devido ao limite de 1GB de RAM
- **Docker Compose** — orquestra todos os serviços localmente e em produção
- **n8n** (`n8nio/n8n`) — motor de automação de workflows, roda na porta 5678
- **nginx:alpine** — serve o frontend estático na porta 8080
- **Cloudflare Tunnel** (`cloudflared`) — serviço systemd para exposição HTTPS pública segura (não requer abertura de portas no firewall do GCP)
- **Supabase** — PostgreSQL gerenciado (externo, conectado via variáveis de ambiente)

## IA / LLM

- **Google Gemini** — acessado via variável de ambiente `GEMINI_API_KEY`, injetada no n8n

## Frontend

- Apenas arquivos estáticos (HTML/CSS/JS) — sem etapa de build, sem framework
- Servido do diretório `./frontend/` montado no container nginx

## Configuração de Ambiente

Todos os segredos e configurações ficam no `.env` (baseado no `.env.example`). Nunca commitar o `.env`.

Variáveis principais:
- `N8N_JWT_SECRET` — assinatura de tokens de sessão
- `GEMINI_API_KEY` — acesso ao Google Gemini
- `DB_POSTGRESDB_*` — conexão com o PostgreSQL do Supabase
- `WEBHOOK_URL` — URL pública do n8n (usada para webhooks e CORS)
- `N8N_CORS_ALLOWED_ORIGINS` — origem do frontend autorizada a chamar o n8n

## Comandos Comuns

```bash
# Iniciar todos os serviços
docker compose up -d

# Parar todos os serviços
docker compose down

# Ver logs
docker compose logs -f

# Ver logs apenas do n8n
docker compose logs -f n8n

# Reiniciar um serviço
docker compose restart n8n

# Configurar o Cloudflare Tunnel (executar uma vez no servidor, requer sudo)
sudo bash infra/cloudflared-setup.sh

# Verificar status do tunnel
systemctl status cloudflared

# Acompanhar logs do tunnel
journalctl -u cloudflared -f
```
