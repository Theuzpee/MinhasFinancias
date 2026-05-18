# Produto

Este projeto é uma **plataforma de automação baseada em n8n** com um frontend estático simples, exposto publicamente via Cloudflare Tunnel. Foi projetado para rodar self-hosted em uma VM Linux no Google Cloud Platform (GCP free tier) usando Docker Compose.

## Objetivo Principal

- Hospedar workflows n8n que alimentam automações de backend e lógica de agentes de IA
- Servir um frontend estático (HTML/JS/CSS via nginx)
- Expor ambos os serviços com segurança via HTTPS usando Cloudflare Tunnel (sem portas abertas para entrada)

## Integrações Principais

- **n8n** — motor de automação de workflows (webhooks, agentes de IA, integrações)
- **Google Gemini** — capacidades de IA/LLM via chave de API
- **Supabase (PostgreSQL)** — banco de dados persistente para o n8n
- **Cloudflare Tunnel** — acesso público seguro sem expor portas

## Endpoints Públicos

- `https://api.seudominio.com` → n8n (porta 5678)
- `https://app.seudominio.com` → Frontend (porta 8080)
