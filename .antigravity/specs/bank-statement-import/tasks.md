# Plano de Implementação: bank-statement-import

## Visão Geral

Implementação incremental da feature de importação de extratos bancários. O trabalho é dividido em três frentes: (1) integração de rota e navegação no frontend existente, (2) criação da página `Importar.vue` com upload, validação e feedback, e (3) criação do workflow n8n `Importar Extrato` com processamento via Gemini e inserção no Supabase.

## Tasks

- [x] 1. Adicionar rota e link de navegação
  - Em `frontend/src/router.js`, adicionar a rota `{ path: '/importar', component: () => import('./views/Importar.vue') }` sem `meta: { public: true }` para que o guard de autenticação existente proteja a rota automaticamente
  - Em `frontend/src/App.vue`, adicionar `<RouterLink to="/importar">Importar</RouterLink>` no `<nav>`, após o link "Metas"
  - _Requirements: 1.1, 1.2_

- [x] 2. Criar a página `Importar.vue` — estrutura base e estado reativo
  - Criar o arquivo `frontend/src/views/Importar.vue`
  - Declarar todas as refs de estado: `file`, `isDragging`, `status` (`'idle' | 'loading' | 'success' | 'error'`), `importedCount`, `errorMessage`, `validationError`
  - Adicionar `onMounted` com `document.title = 'Importar Extrato — Finanças Pessoais'`
  - Renderizar o título da página e subtítulo seguindo o padrão visual de `Dashboard.vue` (classes `page-title`, `page-sub`, `container`)
  - _Requirements: 1.3, 1.4_

- [x] 3. Implementar seção de instruções de uso
  - Dentro de `Importar.vue`, adicionar um `<div class="panel">` com a seção de instruções acima da área de upload
  - Exibir os três tópicos: como exportar o extrato do banco (orientação genérica para CSV/PDF), como fazer o upload, e o que acontece após o processamento
  - Listar os formatos aceitos (`.csv` e `.pdf`) de forma visível
  - _Requirements: 2.1, 2.2_

- [x] 4. Implementar a Upload_Area com drag & drop e seleção manual
  - Adicionar o elemento de área de upload com handlers: `@dragover.prevent="onDragOver"`, `@dragleave="onDragLeave"`, `@drop.prevent="onDrop"`
  - Implementar `onDragOver` (ativa `isDragging`), `onDragLeave` (desativa `isDragging`), `onDrop` (captura `e.dataTransfer.files[0]`, chama `validateFile`)
  - Adicionar `<input type="file" accept=".csv,.pdf">` oculto e handler `onFileSelect` que captura `e.target.files[0]` e chama `validateFile`
  - No estado padrão (`file === null`), exibir ícone, texto instrucional e formatos aceitos
  - Quando `file` estiver definido, exibir nome e tamanho formatado do arquivo selecionado
  - Aplicar classe de destaque visual quando `isDragging === true`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Implementar `validateFile` e testes de propriedade
  - Implementar a função `validateFile(f)`:
    - Verificar extensão (case-insensitive): aceitar apenas `.csv` e `.pdf`; caso contrário, setar `validationError` com mensagem de erro e manter `file` como `null`
    - Verificar tamanho: rejeitar arquivos > 10.485.760 bytes (10 MB); setar `validationError` com mensagem de limite
    - Se válido: setar `file = f`, limpar `validationError`
  - Exibir `validationError` abaixo da Upload_Area quando não-vazio
  - O botão de envio deve estar desabilitado quando `file === null` ou `validationError` não-vazio
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]* 5.1 Escrever teste de propriedade P1 — Validação rejeita extensão ou tamanho inválidos
    - Instalar `fast-check` e `vitest` como devDependencies em `frontend/`
    - Criar `frontend/src/views/__tests__/Importar.test.js`
    - Usar `fc.string()` para gerar nomes de arquivo com extensões aleatórias e `fc.integer()` para tamanhos
    - Asserção: para extensão ≠ `.csv`/`.pdf` (case-insensitive) OU tamanho > 10.485.760, `validateFile` deve setar `validationError` não-vazio e manter `file` como `null`
    - **Property 1: Validação de arquivo rejeita extensão ou tamanho inválidos**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x]* 5.2 Escrever teste de propriedade P2 — Arquivo válido habilita envio
    - Gerar nomes com extensão `.csv` ou `.pdf` (case-insensitive) e tamanho ≤ 10.485.760 bytes
    - Asserção: `file` deve ser o objeto File recebido e `validationError` deve ser string vazia
    - **Property 2: Arquivo válido habilita envio sem erros**
    - **Validates: Requirements 4.5**

- [x] 6. Implementar `sendFile` — leitura, codificação e envio ao webhook
  - Implementar `async sendFile()`:
    - Ler o arquivo com `FileReader`: CSV → `readAsText` (UTF-8), PDF → `readAsDataURL` e extrair a parte Base64 após a vírgula
    - Obter `user_id` via `supabase.auth.getUser()`
    - Montar payload `{ user_id, file_name: file.value.name, file_type: 'csv'|'pdf', content }`
    - Fazer `fetch` para `${import.meta.env.VITE_N8N_URL}/webhook/importar-extrato` com `Content-Type: application/json` e `x-webhook-secret: import.meta.env.VITE_WEBHOOK_SECRET`
    - Durante o envio: `status = 'loading'`, botão e Upload_Area desabilitados
    - Em sucesso (`res.ok`): parsear JSON, setar `importedCount = data.imported`, `status = 'success'`
    - Em erro HTTP: setar `status = 'error'`, `errorMessage` com o campo `error` do body JSON
    - Em erro de rede (catch): setar `status = 'error'`, `errorMessage` com mensagem de conectividade
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x]* 6.1 Escrever teste de propriedade P3 — Codificação do conteúdo por tipo de arquivo
    - Extrair a lógica de codificação de `sendFile` para uma função pura `encodeFileContent(file)` testável
    - Gerar strings de conteúdo aleatórias com `fc.string()`
    - Asserção CSV: `content` é a string UTF-8 original; Asserção PDF: `atob(content)` não lança erro (round-trip válido)
    - **Property 3: Codificação do conteúdo é determinada pelo tipo de arquivo**
    - **Validates: Requirements 5.2, 5.3**

  - [x]* 6.2 Escrever teste de propriedade P4 — Payload sempre contém todos os campos obrigatórios
    - Gerar `user_id` (UUID), `file_name` e conteúdo aleatórios com `fc.uuid()`, `fc.string()`
    - Asserção: o objeto payload deve conter `user_id`, `file_name`, `file_type` e `content` todos não-nulos e não-vazios
    - **Property 4: Payload de envio sempre contém todos os campos obrigatórios**
    - **Validates: Requirements 5.4**

- [x] 7. Implementar feedback visual de resultado e `resetState`
  - Implementar `resetState()`: setar `status = 'idle'`, `file = null`, `validationError = ''`, `errorMessage = ''`
  - No template, usar `v-if`/`v-else-if` para renderizar os três estados de resultado:
    - **`status === 'success'` com `importedCount > 0`**: mensagem de sucesso com contagem de transações + `<RouterLink to="/">Ver no Painel</RouterLink>`
    - **`status === 'success'` com `importedCount === 0`**: mensagem "Nenhuma transação encontrada no arquivo"
    - **`status === 'error'`**: exibir `errorMessage`, botão "Tentar novamente" que chama `resetState()`
  - Exibir spinner/loading quando `status === 'loading'`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x]* 7.1 Escrever teste de propriedade P6 — Erros HTTP sempre disponibilizam retry
    - Simular respostas HTTP com códigos 400–599 usando `fc.integer({ min: 400, max: 599 })`
    - Asserção: após qualquer erro HTTP, `status === 'error'` e `errorMessage` não-vazio
    - **Property 6: Erros HTTP do webhook sempre disponibilizam retry**
    - **Validates: Requirements 6.3**

  - [x]* 7.2 Escrever teste de propriedade P7 — Reset restaura estado inicial após qualquer erro
    - Gerar estados de erro arbitrários (extensão inválida, tamanho excedido, erro de rede, erro HTTP)
    - Asserção: após `resetState()`, `status === 'idle'`, `file === null`, `validationError === ''`, `errorMessage === ''`
    - **Property 7: Reset restaura estado inicial após qualquer erro**
    - **Validates: Requirements 6.6**

- [x] 8. Checkpoint — Verificar frontend
  - Garantir que todos os testes do frontend passam. Verificar que a rota `/importar` está acessível apenas para usuários autenticados, que a navegação exibe o link "Importar" e que a página renderiza corretamente nos estados `idle`, `loading`, `success` e `error`.
  - Perguntar ao usuário se há ajustes antes de prosseguir para o workflow n8n.

- [x] 9. Criar o workflow n8n `Importar Extrato`
  - Criar o arquivo `n8n/workflow-importar-extrato.json` com a estrutura completa do workflow
  - Incluir os 15 nós descritos no design na ordem correta de execução:
    1. **Webhook** — `POST /webhook/importar-extrato`, modo `respondMode: lastNode`
    2. **Validar Payload** — nó Code: verificar presença de `user_id`, `file_type`, `content`; retornar 400 se ausente
    3. **Preparar Conteúdo** — nó Code: decodificar Base64 (PDF) ou passar texto direto (CSV)
    4. **Gemini — Extrair Transações** — HTTP Request para a API Gemini com o prompt de extração
    5. **Parsear Resposta Gemini** — nó Code: `JSON.parse`, validar array; retornar 422 se inválido
    6. **Validar Transações** — nó Code: filtrar transações com `amount > 0`, `type` em `['income','expense']`, `date` parseável
    7. **Tem Transações?** — nó IF: bifurcar se array vazio
    8. **Split em Itens** — `SplitInBatches` para iterar sobre cada transação
    9. **Gemini — Classificar** — HTTP Request para Gemini com prompt de classificação (reutilizar do workflow `/financas`)
    10. **Extrair Classificação** — nó Code: extrair `category` e `essential`; fallback `{ category: 'Outros', essential: false }`
    11. **Agregar Transações** — nó Code: coletar todas as transações classificadas em array
    12. **Inserir no Supabase** — HTTP Request: POST na Supabase REST API com insert em lote
    13. **Responder Sucesso** — `respondToWebhook`: `{ success: true, imported: N }`
    14. **Responder Zero** — `respondToWebhook`: `{ success: true, imported: 0 }`
    15. **Responder Erro** — `respondToWebhook`: erro HTTP 400/422 com mensagem
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 10. Implementar nós de validação e parsing do workflow n8n
  - No nó **Validar Payload** (nó 2): implementar o código JavaScript que verifica `user_id`, `file_type` e `content`; retornar `{ success: false, error: "Campo 'X' ausente" }` com status 400 via `$response`
  - No nó **Preparar Conteúdo** (nó 3): implementar decodificação Base64 para PDF usando `Buffer.from(content, 'base64').toString('utf-8')` e passagem direta para CSV
  - No nó **Parsear Resposta Gemini** (nó 5): implementar `JSON.parse` com try/catch; retornar 422 se falhar ou se resultado não for array
  - No nó **Validar Transações** (nó 6): implementar filtro com as três regras de validação (`amount`, `type`, `date`)
  - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 10.1 Escrever teste de propriedade P5 — Descarte seletivo preserva transações válidas
    - Criar `n8n/__tests__/statement-parser.test.js` com fast-check
    - Extrair a lógica de validação do nó 6 para uma função pura `filterValidTransactions(transactions)`
    - Gerar arrays mistos com `fc.array(fc.record({ amount: fc.oneof(fc.float({min:0.01}), fc.constant(-1)), type: fc.oneof(fc.constant('income'), fc.constant('expense'), fc.string()), date: fc.oneof(fc.date(), fc.constant('invalid')) }))`
    - Asserção: apenas transações inválidas são descartadas; as válidas são preservadas intactas; `imported === N - K`
    - **Property 5: Descarte seletivo preserva transações válidas e conta apenas as salvas**
    - **Validates: Requirements 8.4, 8.5, 8.6, 7.8**

  - [x]* 10.2 Escrever teste de propriedade P8 — Webhook rejeita payload com campos ausentes
    - Gerar subconjuntos não-vazios dos campos obrigatórios para omitir com `fc.subarray(['user_id', 'file_type', 'content'], { minLength: 1 })`
    - Asserção: para qualquer combinação de campos ausentes, a função de validação retorna objeto com `success: false` e `error` não-vazio
    - **Property 8: Webhook rejeita payload com campos obrigatórios ausentes**
    - **Validates: Requirements 7.1, 7.2**

  - [x]* 10.3 Escrever teste de propriedade P9 — Resposta Gemini inválida resulta em HTTP 422
    - Gerar strings que não são JSON válido com `fc.string()` filtrado para excluir JSON arrays válidos
    - Asserção: a função de parsing retorna `{ success: false, error: "..." }` para qualquer entrada não-parseável como array
    - **Property 9: Resposta Gemini inválida resulta em HTTP 422**
    - **Validates: Requirements 8.3**

- [x] 11. Configurar prompts Gemini no workflow n8n
  - No nó **Gemini — Extrair Transações** (nó 4): configurar o HTTP Request para `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` com o prompt de extração definido no design, substituindo `<CONTENT>` pelo conteúdo preparado no nó 3
  - No nó **Gemini — Classificar** (nó 9): configurar o HTTP Request reutilizando o prompt de classificação do workflow `/financas`, substituindo `<description>`, `<type>` e `<amount>` pelos valores da transação atual
  - No nó **Extrair Classificação** (nó 10): implementar o código de extração com fallback `{ category: 'Outros', essential: false }` para falhas de classificação
  - _Requirements: 7.3, 7.4, 7.6, 9.1, 9.2, 9.3, 9.4_

- [x] 12. Implementar inserção em lote no Supabase e resposta final
  - No nó **Agregar Transações** (nó 11): implementar código que coleta todas as transações classificadas do loop em um único array, adicionando `user_id` a cada item
  - No nó **Inserir no Supabase** (nó 12): configurar HTTP Request para `POST ${SUPABASE_URL}/rest/v1/transactions` com headers `apikey`, `Authorization` e `Prefer: return=representation`; body com o array de transações classificadas
  - No nó **Responder Sucesso** (nó 13): retornar `{ success: true, imported: N }` onde N é o `length` do array inserido
  - No nó **Responder Zero** (nó 14): retornar `{ success: true, imported: 0 }`
  - No nó **Responder Erro** (nó 15): retornar o objeto de erro com o status HTTP apropriado (400 ou 422)
  - _Requirements: 7.7, 7.8, 8.6_

- [x] 13. Checkpoint final — Garantir que todos os testes passam
  - Executar todos os testes unitários e de propriedade: `cd frontend && npx vitest --run`
  - Verificar que o arquivo `n8n/workflow-importar-extrato.json` é JSON válido e importável no n8n
  - Confirmar que todos os nós do workflow estão conectados corretamente e sem nós órfãos
  - Perguntar ao usuário se há ajustes antes de considerar a implementação concluída.

## Notas

- Tasks marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada task referencia os requisitos específicos para rastreabilidade
- O design usa JavaScript puro (sem TypeScript) para manter consistência com o frontend existente
- Os testes de propriedade usam **fast-check** com mínimo de 100 iterações cada
- O workflow n8n deve ser importado manualmente via UI do n8n após criação do JSON
- Nenhuma alteração de schema no Supabase é necessária — a tabela `transactions` já existe
