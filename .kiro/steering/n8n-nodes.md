---
inclusion: manual
---

# Configuração de Nodes n8n

Guia especializado para configuração de nodes com consciência de operação e dependências de propriedades.

---

## Filosofia de Configuração

**Divulgação progressiva**: Comece mínimo, adicione complexidade conforme necessário

Boas práticas:
- `get_node_essentials` é o padrão de descoberta mais utilizado
- Taxa de sucesso de 91,7% com configuração baseada em essentials

**Insight principal**: A maioria das configurações precisa apenas dos essentials, não do schema completo!

---

## Conceitos Fundamentais

### 1. Configuração Orientada a Operação

**Nem todos os campos são sempre obrigatórios** — depende da operação!

**Exemplo**: Node Slack
```javascript
// Para operation='post'
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",  // Obrigatório para post
  "text": "Olá!"          // Obrigatório para post
}

// Para operation='update'
{
  "resource": "message",
  "operation": "update",
  "messageId": "123",     // Obrigatório para update (diferente!)
  "text": "Atualizado!"   // Obrigatório para update
  // channel NÃO é obrigatório para update
}
```

**Chave**: Resource + operation determinam quais campos são obrigatórios!

### 2. Dependências de Propriedades

**Campos aparecem/desaparecem com base em outros valores**

**Exemplo**: Node HTTP Request
```javascript
// Quando method='GET'
{
  "method": "GET",
  "url": "https://api.exemplo.com"
  // sendBody não aparece (GET não tem body)
}

// Quando method='POST'
{
  "method": "POST",
  "url": "https://api.exemplo.com",
  "sendBody": true,       // Agora visível!
  "body": {               // Obrigatório quando sendBody=true
    "contentType": "json",
    "content": {...}
  }
}
```

**Mecanismo**: `displayOptions` controla a visibilidade dos campos

### 3. Descoberta Progressiva

**Use a ferramenta certa para cada situação**:

1. **get_node_essentials** (91,7% de sucesso)
   - Visão geral rápida
   - Campos obrigatórios
   - Opções comuns
   - **Use primeiro** — cobre 90% das necessidades

2. **get_property_dependencies** (para nodes complexos)
   - Mostra quais campos dependem de outros
   - Revela requisitos condicionais
   - Use quando essentials não for suficiente

3. **get_node_info** (schema completo)
   - Documentação completa
   - Todos os campos possíveis
   - Use quando essentials + dependencies forem insuficientes

---

## Fluxo de Configuração

### Processo Padrão

```
1. Identificar tipo de node e operação
   ↓
2. Usar get_node_essentials
   ↓
3. Configurar campos obrigatórios
   ↓
4. Validar configuração
   ↓
5. Se dependências não estiverem claras → get_property_dependencies
   ↓
6. Adicionar campos opcionais conforme necessário
   ↓
7. Validar novamente
   ↓
8. Deploy
```

### Exemplo: Configurando HTTP Request

**Passo 1**: Identificar o objetivo
```javascript
// Objetivo: POST JSON para uma API
```

**Passo 2**: Obter essentials
```javascript
const info = get_node_essentials({
  nodeType: "nodes-base.httpRequest"
});
// Retorna: method, url, sendBody, body, authentication obrigatório/opcional
```

**Passo 3**: Config mínima
```javascript
{
  "method": "POST",
  "url": "https://api.exemplo.com/criar",
  "authentication": "none"
}
```

**Passo 4**: Validar
```javascript
validate_node_operation({...});
// → Erro: "sendBody obrigatório para POST"
```

**Passo 5**: Adicionar campo obrigatório
```javascript
{
  "method": "POST",
  "url": "https://api.exemplo.com/criar",
  "authentication": "none",
  "sendBody": true
}
```

**Passo 6**: Validar novamente
```javascript
validate_node_operation({...});
// → Erro: "body obrigatório quando sendBody=true"
```

**Passo 7**: Configuração completa
```javascript
{
  "method": "POST",
  "url": "https://api.exemplo.com/criar",
  "authentication": "none",
  "sendBody": true,
  "body": {
    "contentType": "json",
    "content": {
      "name": "={{$json.name}}",
      "email": "={{$json.email}}"
    }
  }
}
```

**Passo 8**: Validação final
```javascript
validate_node_operation({...});
// → Válido! ✅
```

---

## get_node_essentials vs get_node_info

### Use get_node_essentials Quando:

**✅ Iniciando configuração** (91,7% de sucesso)
- Campos obrigatórios, opções comuns, exemplos básicos, lista de operações
- Rápido: ~18 segundos em média

### Use get_node_info Quando:

**✅ Essentials insuficiente**
- Schema completo, todas as propriedades, documentação avançada
- Mais lento: mais dados para processar

### Árvore de Decisão

```
┌─────────────────────────────────────┐
│ Iniciando nova config de node?      │
├─────────────────────────────────────┤
│ SIM → get_node_essentials           │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Essentials tem o que precisa?       │
├─────────────────────────────────────┤
│ SIM → Configurar com essentials     │
│ NÃO → Continuar                     │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Precisa de info de dependências?    │
├─────────────────────────────────────┤
│ SIM → get_property_dependencies     │
│ NÃO → Continuar                     │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Ainda precisa de mais detalhes?     │
├─────────────────────────────────────┤
│ SIM → get_node_info                 │
└─────────────────────────────────────┘
```

---

## Dependências de Propriedades

### Mecanismo displayOptions

```javascript
{
  "name": "body",
  "displayOptions": {
    "show": {
      "sendBody": [true],
      "method": ["POST", "PUT", "PATCH"]
    }
  }
}
// "body" aparece quando: sendBody = true E method = POST, PUT ou PATCH
```

### Padrões Comuns de Dependência

**Padrão 1 — Toggle Booleano**: `sendBody: true` → campo `body` aparece

**Padrão 2 — Troca de Operação**: Slack `operation: "post"` → mostra `channel, text`; `operation: "update"` → mostra `messageId, text`

**Padrão 3 — Seleção de Tipo**: IF node `type: "string"` → operadores de string; `type: "boolean"` → operadores booleanos

---

## Padrões Comuns de Nodes

### Nodes Resource/Operation (Slack, Google Sheets, Airtable)
```javascript
{
  "resource": "<entidade>",
  "operation": "<ação>",
  // ... campos específicos da operação
}
```

### Nodes HTTP (HTTP Request, Webhook)
```javascript
{
  "method": "<MÉTODO_HTTP>",
  "url": "<endpoint>",
  "authentication": "<tipo>",
  // POST/PUT/PATCH → sendBody disponível
  // sendBody=true → body obrigatório
}
```

### Nodes de Banco de Dados (Postgres, MySQL, MongoDB)
```javascript
{
  "operation": "<query|insert|update|delete>",
  // executeQuery → query obrigatório
  // insert → table + values obrigatório
  // update → table + values + where obrigatório
}
```

### Nodes de Lógica Condicional (IF, Switch, Merge)
```javascript
{
  "conditions": {
    "<tipo>": [{
      "operation": "<operador>",
      "value1": "...",
      "value2": "..."  // Apenas para operadores binários
    }]
  }
  // Operadores binários (equals, contains) → value1 + value2
  // Operadores unários (isEmpty, isNotEmpty) → value1 + singleValue: true
}
```

---

## Exemplos por Node

### Slack

```javascript
// Postar mensagem
{ "resource": "message", "operation": "post", "channel": "#geral", "text": "Olá!" }

// Atualizar mensagem
{ "resource": "message", "operation": "update", "messageId": "123", "text": "Atualizado!" }

// Criar canal
{ "resource": "channel", "operation": "create", "name": "novo-canal", "isPrivate": false }
```

### HTTP Request

```javascript
// GET com query params
{ "method": "GET", "url": "https://api.exemplo.com/users", "sendQuery": true,
  "queryParameters": { "parameters": [{ "name": "limit", "value": "100" }] } }

// POST com JSON
{ "method": "POST", "url": "https://api.exemplo.com/users", "authentication": "none",
  "sendBody": true, "body": { "contentType": "json", "content": { "name": "João" } } }
```

### IF Node

```javascript
// Comparação de string (binário)
{ "conditions": { "string": [{ "value1": "={{$json.status}}", "operation": "equals", "value2": "ativo" }] } }

// Verificação de vazio (unário)
{ "conditions": { "string": [{ "value1": "={{$json.email}}", "operation": "isEmpty", "singleValue": true }] } }
```

---

## Anti-Padrões

❌ **Não**: Configurar todos os campos de uma vez — comece mínimo, adicione conforme necessário

❌ **Não**: Fazer deploy sem validar — sempre use `validate_node_operation` antes

❌ **Não**: Ignorar o contexto da operação — ao trocar de operação, verifique os novos campos obrigatórios

❌ **Não**: Corrigir manualmente problemas de auto-sanitização — deixe o sistema cuidar da estrutura dos operadores

---

## Boas Práticas

✅ Comece sempre com `get_node_essentials`

✅ Valide iterativamente: Configurar → Validar → Corrigir → Repetir (média de 2-3 ciclos)

✅ Use `get_property_dependencies` quando um campo parecer estar faltando

✅ Respeite o contexto da operação — configs não são transferíveis entre operações

✅ Confie na auto-sanitização para estrutura de operadores

---

## Resumo

**Estratégia**:
1. `get_node_essentials` (91,7% de sucesso)
2. Configurar campos obrigatórios para a operação
3. Validar
4. Verificar dependências se travado
5. Iterar até válido
6. Deploy com confiança

**Skills Relacionadas**:
- n8n MCP Tools Expert — uso correto das ferramentas de descoberta
- n8n Validation Expert — interpretar erros de validação
- n8n Expression Syntax — configurar campos de expressão
- n8n Workflow Patterns — aplicar padrões com configuração correta
