---
name: n8n-expression-syntax
description: Valida sintaxe de expressões n8n e corrige erros comuns. Use ao escrever expressões n8n, usar sintaxe {{}}, acessar variáveis $json/$node, solucionar erros de expressão ou trabalhar com dados de webhook em workflows.
---

# Sintaxe de Expressões n8n

Guia especializado para escrever expressões corretas em workflows n8n.

---

## Formato de Expressão

Todo conteúdo dinâmico no n8n usa **chaves duplas**:

```
{{expressão}}
```

**Exemplos**:
```
✅ {{$json.email}}
✅ {{$json.body.name}}
✅ {{$node["HTTP Request"].json.data}}
❌ $json.email  (sem chaves - tratado como texto literal)
❌ {$json.email}  (chave simples - inválido)
```

---

## Variáveis Principais

### $json - Saída do Nó Atual

Acessa dados do nó atual:

```javascript
{{$json.fieldName}}
{{$json['campo com espaços']}}
{{$json.nested.property}}
{{$json.items[0].name}}
```

### $node - Referenciar Outros Nós

Acessa dados de qualquer nó anterior:

```javascript
{{$node["Nome do Nó"].json.fieldName}}
{{$node["HTTP Request"].json.data}}
{{$node["Webhook"].json.body.email}}
```

**Importante**:
- Nomes de nós **devem** estar entre aspas
- Nomes de nós são **case-sensitive**
- Deve corresponder exatamente ao nome do nó no workflow

### $now - Timestamp Atual

Acessa data/hora atual:

```javascript
{{$now}}
{{$now.toFormat('yyyy-MM-dd')}}
{{$now.toFormat('HH:mm:ss')}}
{{$now.plus({days: 7})}}
```

### $env - Variáveis de Ambiente

Acessa variáveis de ambiente:

```javascript
{{$env.API_KEY}}
{{$env.DATABASE_URL}}
```

---

## 🚨 CRÍTICO: Estrutura de Dados do Webhook

**Erro Mais Comum**: Dados do webhook **NÃO** estão na raiz!

### Estrutura de Saída do Nó Webhook

```javascript
{
  "headers": {...},
  "params": {...},
  "query": {...},
  "body": {           // ⚠️ DADOS DO USUÁRIO ESTÃO AQUI!
    "name": "João",
    "email": "joao@exemplo.com",
    "message": "Olá"
  }
}
```

### Acesso Correto aos Dados do Webhook

```javascript
❌ ERRADO: {{$json.name}}
❌ ERRADO: {{$json.email}}
✅ CORRETO: {{$json.body.name}}
✅ CORRETO: {{$json.body.email}}
✅ CORRETO: {{$json.body.message}}
```

**Por quê**: O nó Webhook encapsula os dados recebidos sob a propriedade `.body` para preservar headers, params e query parameters.

---

## Padrões Comuns

### Acessar Campos Aninhados

```javascript
// Aninhamento simples
{{$json.user.email}}

// Acesso a array
{{$json.data[0].name}}
{{$json.items[0].id}}

// Notação de colchetes para espaços
{{$json['nome do campo']}}
{{$json['dados do usuario']['primeiro nome']}}
```

### Referenciar Outros Nós

```javascript
// Nó sem espaços
{{$node["Set"].json.value}}

// Nó com espaços (comum!)
{{$node["HTTP Request"].json.data}}
{{$node["Respond to Webhook"].json.message}}

// Nó Webhook
{{$node["Webhook"].json.body.email}}
```

### Combinar Variáveis

```javascript
// Concatenação (automática)
Olá {{$json.body.name}}!

// Em URLs
https://api.exemplo.com/users/{{$json.body.user_id}}

// Em propriedades de objeto
{
  "name": "={{$json.body.name}}",
  "email": "={{$json.body.email}}"
}
```

---

## Quando NÃO Usar Expressões

### ❌ Nós de Código (Code Nodes)

Nós de código usam **acesso direto JavaScript**, NÃO expressões!

```javascript
// ❌ ERRADO no nó Code
const email = '={{$json.email}}';
const name = '{{$json.body.name}}';

// ✅ CORRETO no nó Code
const email = $json.email;
const name = $json.body.name;

// Ou usando a API do nó Code
const email = $input.item.json.email;
const allItems = $input.all();
```

### ❌ Caminhos de Webhook

```javascript
// ❌ ERRADO
path: "{{$json.user_id}}/webhook"

// ✅ CORRETO
path: "user-webhook"  // Apenas caminhos estáticos
```

### ❌ Campos de Credenciais

```javascript
// ❌ ERRADO
apiKey: "={{$env.API_KEY}}"

// ✅ CORRETO
// Use o sistema de credenciais do n8n, não expressões
```

---

## Regras de Validação

### 1. Sempre Use {{}}

Expressões **devem** ser envolvidas em chaves duplas.

```javascript
❌ $json.field
✅ {{$json.field}}
```

### 2. Use Aspas para Espaços

Nomes de campos ou nós com espaços requerem **notação de colchetes**:

```javascript
❌ {{$json.nome do campo}}
✅ {{$json['nome do campo']}}

❌ {{$node.HTTP Request.json}}
✅ {{$node["HTTP Request"].json}}
```

### 3. Corresponder Nomes Exatos de Nós

Referências de nós são **case-sensitive**:

```javascript
❌ {{$node["http request"].json}}  // minúsculo
❌ {{$node["Http Request"].json}}  // capitalização errada
✅ {{$node["HTTP Request"].json}}  // correspondência exata
```

### 4. Sem {{}} Aninhados

Não duplique o encapsulamento de expressões:

```javascript
❌ {{{$json.field}}}
✅ {{$json.field}}
```

---

## Erros Comuns

### Correções Rápidas

| Erro | Correção |
|------|----------|
| `$json.field` | `{{$json.field}}` |
| `{{$json.nome do campo}}` | `{{$json['nome do campo']}}` |
| `{{$node.HTTP Request}}` | `{{$node["HTTP Request"]}}` |
| `{{{$json.field}}}` | `{{$json.field}}` |
| `{{$json.name}}` (webhook) | `{{$json.body.name}}` |
| `'={{$json.email}}'` (nó Code) | `$json.email` |

---

## Exemplos Práticos

### Exemplo 1: Webhook para Slack

**Webhook recebe**:
```json
{
  "body": {
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "message": "Olá!"
  }
}
```

**No campo de texto do nó Slack**:
```
Nova submissão de formulário!
Nome: {{$json.body.name}}
Email: {{$json.body.email}}
Mensagem: {{$json.body.message}}
```

### Exemplo 2: HTTP Request para Email

**HTTP Request retorna**:
```json
{
  "data": {
    "items": [{"name": "Produto 1", "price": 29.99}]
  }
}
```

**No nó Email** (referenciando HTTP Request):
```
Produto: {{$node["HTTP Request"].json.data.items[0].name}}
Preço: R${{$node["HTTP Request"].json.data.items[0].price}}
```

### Exemplo 3: Formatar Timestamp

```javascript
// Data atual
{{$now.toFormat('yyyy-MM-dd')}}
// Resultado: 2025-10-20

// Hora
{{$now.toFormat('HH:mm:ss')}}
// Resultado: 14:30:45

// Data e hora completas
{{$now.toFormat('yyyy-MM-dd HH:mm')}}
// Resultado: 2025-10-20 14:30
```

---

## Manipulação de Tipos de Dados

### Arrays

```javascript
// Primeiro item
{{$json.users[0].email}}

// Tamanho do array
{{$json.users.length}}

// Último item
{{$json.users[$json.users.length - 1].name}}
```

### Objetos

```javascript
// Notação de ponto (sem espaços)
{{$json.user.email}}

// Notação de colchetes (com espaços ou dinâmico)
{{$json['dados do usuario'].email}}
```

### Strings

```javascript
// Concatenação (automática)
Olá {{$json.name}}!

// Métodos de string
{{$json.email.toLowerCase()}}
{{$json.name.toUpperCase()}}
```

### Números

```javascript
// Uso direto
{{$json.price}}

// Operações matemáticas
{{$json.price * 1.1}}  // Adicionar 10%
{{$json.quantity + 5}}
```

---

## Padrões Avançados

### Conteúdo Condicional

```javascript
// Operador ternário
{{$json.status === 'active' ? 'Usuário Ativo' : 'Usuário Inativo'}}

// Valores padrão
{{$json.email || 'sem-email@exemplo.com'}}
```

### Manipulação de Datas

```javascript
// Adicionar dias
{{$now.plus({days: 7}).toFormat('yyyy-MM-dd')}}

// Subtrair horas
{{$now.minus({hours: 24}).toISO()}}

// Data específica
{{DateTime.fromISO('2025-12-25').toFormat('MMMM dd, yyyy')}}
```

### Manipulação de Strings

```javascript
// Substring
{{$json.email.substring(0, 5)}}

// Substituir
{{$json.message.replace('antigo', 'novo')}}

// Dividir e juntar
{{$json.tags.split(',').join(', ')}}
```

---

## Depurando Expressões

### Testar no Editor de Expressões

1. Clique no campo com a expressão
2. Abra o editor de expressões (clique no ícone "fx")
3. Veja a prévia do resultado em tempo real
4. Verifique erros destacados em vermelho

### Mensagens de Erro Comuns

**"Cannot read property 'X' of undefined"**
→ O objeto pai não existe
→ Verifique o caminho dos dados

**"X is not a function"**
→ Tentando chamar método em não-função
→ Verifique o tipo da variável

**Expressão aparece como texto literal**
→ Faltam {{ }}
→ Adicione as chaves

---

## Helpers de Expressão

### Métodos Disponíveis

**String**:
- `.toLowerCase()`, `.toUpperCase()`
- `.trim()`, `.replace()`, `.substring()`
- `.split()`, `.includes()`

**Array**:
- `.length`, `.map()`, `.filter()`
- `.find()`, `.join()`, `.slice()`

**DateTime** (Luxon):
- `.toFormat()`, `.toISO()`, `.toLocal()`
- `.plus()`, `.minus()`, `.set()`

**Número**:
- `.toFixed()`, `.toString()`
- Operações matemáticas: `+`, `-`, `*`, `/`, `%`

---

## Boas Práticas

### ✅ Faça
- Sempre use {{ }} para conteúdo dinâmico
- Use notação de colchetes para nomes de campos com espaços
- Referencie dados de webhook a partir de `.body`
- Use $node para dados de outros nós
- Teste expressões no editor de expressões

### ❌ Não Faça
- Não use expressões em nós Code
- Não esqueça aspas em nomes de nós com espaços
- Não duplique o encapsulamento com {{ }} extras
- Não assuma que dados do webhook estão na raiz (estão em .body!)
- Não use expressões em caminhos de webhook ou credenciais

---

## Resumo

**Regras Essenciais**:
1. Envolva expressões em {{ }}
2. Dados de webhook estão em `.body`
3. Sem {{ }} em nós Code
4. Coloque aspas em nomes de nós com espaços
5. Nomes de nós são case-sensitive

**Erros Mais Comuns**:
- Faltam {{ }} → Adicione as chaves
- `{{$json.name}}` em webhooks → Use `{{$json.body.name}}`
- `{{$json.email}}` em Code → Use `$json.email`
- `{{$node.HTTP Request}}` → Use `{{$node["HTTP Request"]}}`
