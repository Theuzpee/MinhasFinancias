# Documento de Requisitos

## Introdução

Esta funcionalidade permite ao usuário importar extratos bancários de qualquer banco brasileiro para popular automaticamente as transações no painel financeiro. O usuário faz upload de um arquivo `.csv` ou `.pdf`, o frontend envia o conteúdo para um webhook n8n, o Google Gemini interpreta o formato do extrato (independente do banco), extrai as transações, classifica cada uma automaticamente e as salva no Supabase — exatamente como ocorre no fluxo de transação manual via `/webhook/financas`.

## Glossário

- **Import_Page**: Página Vue dedicada à importação de extratos, acessível via rota `/importar`.
- **Upload_Area**: Componente de área de upload com suporte a drag & drop e seleção manual de arquivo.
- **File_Validator**: Módulo frontend responsável por validar extensão e tamanho do arquivo antes do envio.
- **Import_Webhook**: Endpoint n8n (`/webhook/importar-extrato`) que recebe o conteúdo do arquivo e coordena o processamento.
- **Statement_Parser**: Nó n8n (código JavaScript) que prepara o conteúdo bruto do arquivo para envio ao Gemini.
- **Gemini_Extractor**: Chamada à API do Google Gemini responsável por interpretar o formato do extrato e extrair as transações.
- **Transaction_Classifier**: Nó n8n que reutiliza a lógica de classificação do workflow `/financas` para categorizar e marcar cada transação como essencial ou supérflua.
- **Import_Result**: Objeto JSON retornado pelo webhook ao frontend contendo o resultado da importação (contagem de transações importadas, erros, etc.).
- **Extrato**: Arquivo de extrato bancário nos formatos `.csv` ou `.pdf` exportado pelo banco do usuário.
- **Transação**: Registro financeiro com campos: `description`, `amount`, `type` (income/expense), `category`, `date`, `essential`, `user_id`.

---

## Requisitos

### Requisito 1: Página de Importação

**User Story:** Como usuário, quero ter uma página dedicada para importar extratos bancários, para que eu possa acessar a funcionalidade de forma clara e separada do painel principal.

#### Critérios de Aceitação

1. THE Import_Page SHALL ser acessível via rota `/importar` no frontend Vue.
2. THE Import_Page SHALL exigir autenticação, redirecionando para `/login` quando o usuário não estiver autenticado.
3. THE Import_Page SHALL exibir um título e subtítulo identificando a funcionalidade de importação de extratos.
4. THE Import_Page SHALL seguir o design system do projeto (paleta gold/amber escura, fontes DM Sans/Serif/Mono).

---

### Requisito 2: Instruções de Uso

**User Story:** Como usuário, quero ver instruções claras antes da área de upload, para que eu saiba como exportar o extrato do meu banco e o que esperar após o processamento.

#### Critérios de Aceitação

1. THE Import_Page SHALL exibir uma seção de instruções acima da Upload_Area com os seguintes tópicos:
   - Como exportar o extrato do banco (orientação genérica para CSV ou PDF).
   - Como realizar o upload do arquivo.
   - O que acontece após o processamento (classificação automática e adição ao painel).
2. THE Import_Page SHALL exibir a lista de formatos aceitos (`.csv` e `.pdf`) de forma visível nas instruções.

---

### Requisito 3: Área de Upload com Drag & Drop

**User Story:** Como usuário, quero uma área de upload intuitiva com suporte a arrastar e soltar arquivos, para que eu possa fazer o upload do extrato de forma rápida e sem fricção.

#### Critérios de Aceitação

1. THE Upload_Area SHALL aceitar arquivos arrastados e soltos diretamente sobre ela (drag & drop).
2. THE Upload_Area SHALL aceitar arquivos selecionados manualmente via diálogo do sistema operacional ao clicar na área.
3. WHEN um arquivo é arrastado sobre a Upload_Area, THE Upload_Area SHALL exibir um estado visual de destaque (highlight) indicando que o arquivo pode ser solto.
4. WHEN o arquivo é solto fora da Upload_Area, THE Upload_Area SHALL ignorar o evento e manter seu estado original.
5. THE Upload_Area SHALL exibir ícone, texto instrucional e indicação dos formatos aceitos em seu estado padrão.
6. WHEN um arquivo é selecionado, THE Upload_Area SHALL exibir o nome e o tamanho do arquivo selecionado.

---

### Requisito 4: Validação de Arquivo no Frontend

**User Story:** Como usuário, quero receber feedback imediato sobre arquivos inválidos, para que eu não precise aguardar o processamento para descobrir que o arquivo está errado.

#### Critérios de Aceitação

1. WHEN o usuário seleciona ou solta um arquivo, THE File_Validator SHALL verificar se a extensão é `.csv` ou `.pdf`.
2. IF a extensão do arquivo não for `.csv` nem `.pdf`, THEN THE File_Validator SHALL exibir uma mensagem de erro informando os formatos aceitos e SHALL impedir o envio.
3. WHEN o usuário seleciona ou solta um arquivo, THE File_Validator SHALL verificar se o tamanho do arquivo é menor ou igual a 10 MB.
4. IF o tamanho do arquivo exceder 10 MB, THEN THE File_Validator SHALL exibir uma mensagem de erro informando o limite de tamanho e SHALL impedir o envio.
5. WHEN o arquivo passa em todas as validações, THE File_Validator SHALL habilitar o botão de envio.

---

### Requisito 5: Envio do Arquivo ao Webhook

**User Story:** Como usuário, quero que o arquivo seja enviado ao backend de forma segura e com feedback de progresso, para que eu saiba que o processamento está ocorrendo.

#### Critérios de Aceitação

1. WHEN o usuário confirma o envio, THE Import_Page SHALL ler o conteúdo do arquivo localmente usando a File API do navegador.
2. WHEN o arquivo é do tipo `.csv`, THE Import_Page SHALL enviar o conteúdo como texto UTF-8 para o Import_Webhook.
3. WHEN o arquivo é do tipo `.pdf`, THE Import_Page SHALL enviar o conteúdo codificado em Base64 para o Import_Webhook.
4. THE Import_Page SHALL incluir no payload de envio: `user_id`, `file_name`, `file_type` (csv ou pdf) e `content` (texto ou Base64).
5. THE Import_Page SHALL incluir o header `x-webhook-secret` com o valor de `VITE_WEBHOOK_SECRET` em todas as requisições ao Import_Webhook.
6. WHILE o arquivo está sendo enviado e processado, THE Import_Page SHALL exibir um estado de carregamento (loading) desabilitando o botão de envio e a Upload_Area.

---

### Requisito 6: Feedback Visual de Resultado

**User Story:** Como usuário, quero receber feedback claro sobre o resultado da importação, para que eu saiba quantas transações foram importadas ou o que deu errado.

#### Critérios de Aceitação

1. WHEN o Import_Webhook retorna sucesso, THE Import_Page SHALL exibir uma mensagem de sucesso contendo a contagem de transações importadas.
2. WHEN o Import_Webhook retorna sucesso com zero transações identificadas, THE Import_Page SHALL exibir uma mensagem informando que nenhuma transação foi encontrada no arquivo.
3. IF o Import_Webhook retornar um erro HTTP (4xx ou 5xx), THEN THE Import_Page SHALL exibir uma mensagem de erro descritiva e SHALL permitir que o usuário tente novamente.
4. IF ocorrer um erro de rede durante o envio, THEN THE Import_Page SHALL exibir uma mensagem de erro de conectividade e SHALL permitir que o usuário tente novamente.
5. WHEN a importação é concluída com sucesso, THE Import_Page SHALL exibir um link de navegação para o Dashboard (`/`) para que o usuário visualize as transações importadas.
6. WHEN o usuário clica em "tentar novamente" após um erro, THE Import_Page SHALL restaurar o estado inicial da Upload_Area.

---

### Requisito 7: Processamento no Backend (n8n)

**User Story:** Como sistema, quero que o backend interprete automaticamente o formato do extrato de qualquer banco, para que o usuário não precise configurar mapeamentos manuais.

#### Critérios de Aceitação

1. WHEN o Import_Webhook recebe uma requisição, THE Import_Webhook SHALL validar a presença dos campos `user_id`, `file_type` e `content` no payload.
2. IF algum campo obrigatório estiver ausente, THEN THE Import_Webhook SHALL retornar HTTP 400 com mensagem descritiva do campo faltante.
3. WHEN o payload é válido, THE Statement_Parser SHALL preparar o conteúdo bruto e enviar ao Gemini_Extractor com um prompt instruindo a extração de transações no formato JSON.
4. WHEN o Gemini_Extractor processa o conteúdo, THE Gemini_Extractor SHALL retornar um array JSON de transações, cada uma contendo: `description`, `amount`, `type` (income/expense) e `date` (formato ISO 8601).
5. IF o Gemini_Extractor não conseguir identificar transações no conteúdo, THEN THE Import_Webhook SHALL retornar HTTP 200 com `{ "success": true, "imported": 0 }`.
6. WHEN as transações são extraídas, THE Transaction_Classifier SHALL classificar cada transação com `category` e `essential` usando o mesmo critério do workflow `/financas`.
7. WHEN as transações são classificadas, THE Import_Webhook SHALL inserir todas as transações no Supabase na tabela `transactions` associadas ao `user_id` recebido.
8. WHEN todas as transações são salvas, THE Import_Webhook SHALL retornar HTTP 200 com `{ "success": true, "imported": N }` onde N é o número de transações inseridas.

---

### Requisito 8: Parser e Serialização de Dados

**User Story:** Como sistema, quero que o conteúdo do extrato seja corretamente interpretado e as transações extraídas sejam validadas antes de salvar, para que dados corrompidos ou mal formatados não entrem no banco de dados.

#### Critérios de Aceitação

1. WHEN o Statement_Parser recebe conteúdo CSV, THE Statement_Parser SHALL enviar o texto bruto ao Gemini_Extractor sem transformações adicionais.
2. WHEN o Statement_Parser recebe conteúdo PDF em Base64, THE Statement_Parser SHALL decodificar o Base64 e extrair o texto antes de enviar ao Gemini_Extractor.
3. THE Gemini_Extractor SHALL retornar JSON válido e parseável; IF o JSON retornado for inválido, THEN THE Import_Webhook SHALL retornar HTTP 422 com mensagem de erro de parsing.
4. FOR ALL transações extraídas pelo Gemini_Extractor, THE Statement_Parser SHALL validar que `amount` é um número positivo, `type` é "income" ou "expense", e `date` é uma data válida.
5. IF uma transação extraída falhar na validação de campos, THEN THE Statement_Parser SHALL descartar essa transação e continuar processando as demais.
6. THE Import_Webhook SHALL retornar no campo `imported` apenas a contagem de transações efetivamente salvas no Supabase (excluindo as descartadas por validação).

---

### Requisito 9: Suporte a Múltiplos Bancos

**User Story:** Como usuário, quero importar extratos de qualquer banco brasileiro, para que eu não fique limitado a um único formato ou instituição financeira.

#### Critérios de Aceitação

1. THE Gemini_Extractor SHALL interpretar extratos de qualquer banco brasileiro sem configuração prévia de mapeamento de colunas.
2. THE Gemini_Extractor SHALL identificar corretamente transações de débito como `type: "expense"` e créditos como `type: "income"` independente da nomenclatura usada pelo banco no arquivo.
3. THE Gemini_Extractor SHALL normalizar datas para o formato ISO 8601 (`YYYY-MM-DD`) independente do formato de data presente no extrato original.
4. THE Gemini_Extractor SHALL normalizar valores monetários para número decimal (ex: `1234.56`) independente do formato de moeda presente no extrato (ex: `R$ 1.234,56`).
