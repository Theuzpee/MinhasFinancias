# Estrutura do Projeto

```
.
├── .env                        # Segredos locais (nunca commitar)
├── .env.example                # Template com as variáveis de ambiente necessárias
├── docker-compose.yml          # Definição dos serviços (n8n + nginx)
├── frontend/                   # Arquivos estáticos do frontend (HTML/CSS/JS)
│   └── ...                     # Servido pelo nginx na porta 8080
├── infra/
│   └── cloudflared-setup.sh    # Script de instalação única do Cloudflare Tunnel
├── agents/
│   └── agent-n8n.md            # Skill do Kiro para configuração de nodes n8n
└── .kiro/
    ├── specs/                  # Specs de funcionalidades (requisitos, design, tarefas)
    └── steering/               # Arquivos de orientação para o assistente de IA (este diretório)
```

## Convenções

- **Sem código de backend** — toda lógica server-side vive em workflows n8n, não em arquivos
- **Sem pipeline de build** — o frontend são arquivos estáticos simples, deploy é feito editando os arquivos diretamente
- **Infraestrutura declarativa** — `docker-compose.yml` é a fonte da verdade para os serviços
- **Segredos via `.env`** — toda configuração específica de ambiente vai no `.env`, nunca hardcoded
- **`infra/` para scripts do servidor** — scripts bash de configuração única para a máquina host
- **`agents/` para skills do Kiro** — arquivos markdown de orientação para o agente, com escopo em ferramentas específicas
