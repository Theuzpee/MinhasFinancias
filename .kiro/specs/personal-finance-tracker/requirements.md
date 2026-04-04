# Documento de Requisitos

## Introdução

O Personal Finance Tracker é um sistema de controle financeiro pessoal que utiliza n8n como backend (automações e fluxos de trabalho) e uma interface frontend simples. O objetivo principal é ajudar o usuário a monitorar receitas e despesas, identificar padrões de gastos e tomar decisões que contribuam para economizar dinheiro.

## Glossário

- **Sistema**: O Personal Finance Tracker como um todo
- **Frontend**: Interface web simples para interação do usuário
- **Backend_n8n**: Instância do n8n responsável por automações, persistência e processamento de dados financeiros
- **Transação**: Registro de uma movimentação financeira (receita ou despesa)
- **Categoria**: Classificação de uma transação (ex: alimentação, transporte, salário)
- **Meta_de_Economia**: Valor alvo que o usuário deseja poupar em um período
- **Relatório**: Resumo consolidado de transações e indicadores financeiros
- **Alerta**: Notificação gerada automaticamente pelo Backend_n8n com base em regras definidas pelo usuário
- **Comprovante_Bancário**: E-mail enviado automaticamente pelo banco ao usuário após uma transação (ex: Pix, TED, DOC)
- **Gmail_Monitor**: Fluxo do Backend_n8n responsável por monitorar periodicamente a caixa de entrada do Gmail em busca de novos Comprovantes_Bancários
- **OAuth2_Google**: Protocolo de autenticação utilizado pelo Backend_n8n para acessar a API do Gmail com permissão do usuário
- **VPS**: Servidor virtual privado provisionado na Oracle Cloud Free Tier (instância ARM Ampere)
- **Servidor**: A VPS Ubuntu onde o Docker, Docker Compose e o n8n são executados
- **Administrador**: Pessoa responsável por provisionar e manter a infraestrutura do Sistema
- **Gemini_API**: API do Google Gemini (plano gratuito, limite de 1500 requisições/dia) utilizada pelo Backend_n8n para extração inteligente de dados de texto não estruturado
- **Cloudflare_Tunnel**: Serviço gratuito da Cloudflare que cria um túnel seguro entre a VPS e a rede da Cloudflare, expondo serviços via HTTPS sem necessidade de abrir portas no firewall ou configurar certificados SSL manualmente
- **cloudflared**: Daemon cliente do Cloudflare Tunnel instalado na VPS, responsável por manter a conexão do túnel ativa

---

## Requisitos

### Requisito 1: Registro de Transações

**User Story:** Como usuário, quero registrar minhas receitas e despesas, para que eu possa acompanhar para onde meu dinheiro está indo.

#### Critérios de Aceitação

1. WHEN o usuário submete um formulário com valor, data, descrição e categoria, THE Frontend SHALL enviar os dados ao Backend_n8n via webhook.
2. WHEN o Backend_n8n recebe os dados de uma nova transação, THE Backend_n8n SHALL validar os campos obrigatórios (valor, data, tipo, categoria) e persistir o registro.
3. IF o Backend_n8n receber uma transação com campos obrigatórios ausentes ou inválidos, THEN THE Backend_n8n SHALL retornar uma mensagem de erro descritiva ao Frontend.
4. THE Frontend SHALL exibir uma confirmação visual ao usuário após o registro bem-sucedido de uma transação.
5. THE Sistema SHALL suportar os tipos de transação: "receita" e "despesa".

---

### Requisito 2: Listagem e Visualização de Transações

**User Story:** Como usuário, quero visualizar minhas transações registradas, para que eu possa revisar meu histórico financeiro.

#### Critérios de Aceitação

1. WHEN o usuário acessa a tela de histórico, THE Frontend SHALL solicitar ao Backend_n8n a lista de transações do período selecionado.
2. THE Backend_n8n SHALL retornar as transações ordenadas por data, da mais recente para a mais antiga.
3. THE Frontend SHALL exibir para cada transação: data, descrição, categoria, tipo (receita/despesa) e valor.
4. WHEN o usuário aplica um filtro por categoria ou tipo, THE Frontend SHALL exibir somente as transações correspondentes ao filtro selecionado.
5. IF não houver transações no período selecionado, THEN THE Frontend SHALL exibir uma mensagem informando que não há registros para o período.

---

### Requisito 3: Categorização de Transações

**User Story:** Como usuário, quero categorizar minhas transações, para que eu possa entender em quais áreas estou gastando mais.

#### Critérios de Aceitação

1. THE Sistema SHALL disponibilizar as categorias padrão: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Salário, Outros.
2. WHEN o usuário registra uma transação, THE Frontend SHALL exibir a lista de categorias disponíveis para seleção.
3. THE Backend_n8n SHALL associar cada transação a exatamente uma categoria.
4. WHERE a funcionalidade de categorias personalizadas estiver habilitada, THE Backend_n8n SHALL permitir que o usuário crie, edite e remova categorias adicionais.

---

### Requisito 4: Relatório Financeiro Mensal

**User Story:** Como usuário, quero visualizar um relatório mensal das minhas finanças, para que eu possa entender meu saldo e padrões de consumo.

#### Critérios de Aceitação

1. WHEN o usuário solicita o relatório de um mês, THE Backend_n8n SHALL calcular e retornar: total de receitas, total de despesas, saldo do período e total gasto por categoria.
2. THE Frontend SHALL exibir o relatório com gráfico de distribuição de despesas por categoria.
3. THE Frontend SHALL exibir o saldo do período com destaque visual diferenciado para saldo positivo e negativo.
4. IF o total de despesas de uma categoria no mês exceder 50% do total de despesas, THEN THE Backend_n8n SHALL sinalizar essa categoria como destaque no relatório.

---

### Requisito 5: Meta de Economia

**User Story:** Como usuário, quero definir uma meta de economia mensal, para que eu possa acompanhar meu progresso em direção ao objetivo de poupar dinheiro.

#### Critérios de Aceitação

1. WHEN o usuário define uma Meta_de_Economia com valor e prazo, THE Backend_n8n SHALL persistir a meta e associá-la ao período correspondente.
2. WHILE uma Meta_de_Economia estiver ativa, THE Frontend SHALL exibir o progresso atual (valor economizado vs. valor alvo) em formato de barra de progresso.
3. WHEN o saldo do período atingir ou superar o valor da Meta_de_Economia, THE Backend_n8n SHALL marcar a meta como concluída.
4. IF o usuário submeter uma meta com valor menor ou igual a zero, THEN THE Backend_n8n SHALL retornar um erro de validação.

---

### Requisito 6: Alertas Automáticos de Gastos

**User Story:** Como usuário, quero receber alertas quando meus gastos ultrapassarem limites definidos, para que eu possa agir antes de comprometer meu orçamento.

#### Critérios de Aceitação

1. WHEN o usuário configura um limite de gasto por categoria, THE Backend_n8n SHALL persistir a regra de alerta associada à categoria e ao período.
2. WHEN uma nova despesa é registrada, THE Backend_n8n SHALL verificar se o total acumulado da categoria no período ultrapassa o limite configurado.
3. IF o total acumulado de uma categoria ultrapassar o limite configurado, THEN THE Backend_n8n SHALL gerar um Alerta e exibi-lo no Frontend na próxima consulta do usuário.
4. THE Frontend SHALL exibir os alertas ativos de forma destacada na tela principal.

---

### Requisito 7: Exportação de Dados

**User Story:** Como usuário, quero exportar meus dados financeiros, para que eu possa analisá-los em outras ferramentas ou guardar um backup.

#### Critérios de Aceitação

1. WHEN o usuário solicita a exportação de um período, THE Backend_n8n SHALL gerar um arquivo CSV contendo todas as transações do período com os campos: data, descrição, categoria, tipo e valor.
2. THE Frontend SHALL disponibilizar o arquivo gerado para download imediato após a conclusão da exportação.
3. IF não houver transações no período selecionado para exportação, THEN THE Backend_n8n SHALL retornar um erro informando que não há dados para exportar.
4. FOR ALL conjuntos de transações exportados, a reimportação dos dados SHALL produzir registros equivalentes aos originais (propriedade de round-trip).

---

### Requisito 8: Infraestrutura e Deploy

**User Story:** Como administrador, quero provisionar e configurar a infraestrutura do sistema na Oracle Cloud Free Tier com acesso HTTPS via Cloudflare Tunnel, para que o n8n e o Frontend estejam disponíveis de forma segura via internet sem custo de hospedagem e sem necessidade de abrir portas no firewall.

#### Critérios de Aceitação

1. THE Administrador SHALL provisionar uma instância ARM Ampere (Always Free) na Oracle Cloud com sistema operacional Ubuntu.
2. WHEN a VPS for provisionada, THE Administrador SHALL configurar o acesso SSH com par de chaves (chave pública/privada), desabilitando autenticação por senha.
3. WHEN o acesso SSH estiver configurado, THE Administrador SHALL instalar Docker Engine e Docker Compose no Servidor Ubuntu.
4. WHEN o Docker e o Docker Compose estiverem instalados, THE Administrador SHALL realizar o deploy do Backend_n8n utilizando um arquivo docker-compose.yml no Servidor.
5. THE docker-compose.yml SHALL definir o serviço n8n com volume persistente para dados e variáveis de ambiente para configuração de credenciais.
6. WHEN o container do Backend_n8n estiver em execução, THE Backend_n8n SHALL estar acessível via navegador pelo IP público da VPS na porta configurada.
7. IF o Servidor for reiniciado, THEN THE Backend_n8n SHALL reiniciar automaticamente por meio da política restart: unless-stopped definida no docker-compose.yml.
8. THE Frontend SHALL consumir os webhooks do Backend_n8n utilizando o domínio Cloudflare como base da URL.
9. WHEN a VPS estiver configurada, THE Administrador SHALL instalar o cloudflared e configurar um Cloudflare_Tunnel para expor o Backend_n8n e o Frontend via HTTPS através de um domínio Cloudflare.
10. THE Administrador SHALL configurar o cloudflared como serviço systemd no Servidor para que o Cloudflare_Tunnel reinicie automaticamente após falhas ou reinicializações do Servidor.
11. WHEN o Cloudflare_Tunnel estiver ativo, THE Backend_n8n e o Frontend SHALL ser acessíveis exclusivamente via HTTPS pelo domínio Cloudflare, sem necessidade de configuração manual de certificados SSL.
12. IF o Cloudflare_Tunnel for interrompido, THEN THE cloudflared SHALL tentar reconectar automaticamente por meio do mecanismo de reconexão nativo do serviço systemd.

---

### Requisito 9: Importação Automática de Transações via Gmail

**User Story:** Como usuário, quero que o sistema monitore meu Gmail e registre automaticamente as transações a partir dos comprovantes bancários recebidos, para que eu não precise inserir manualmente cada movimentação.

#### Critérios de Aceitação

1. THE Backend_n8n SHALL autenticar-se na API do Gmail utilizando OAuth 2.0 com as credenciais do usuário.
2. THE Gmail_Monitor SHALL verificar periodicamente a caixa de entrada do Gmail em busca de novos Comprovantes_Bancários (ex: Pix, TED, DOC).
3. WHEN o Gmail_Monitor detectar um novo e-mail de Comprovante_Bancário, THE Backend_n8n SHALL extrair os campos: valor, descrição e tipo de transação (débito ou crédito).
4. WHEN os dados forem extraídos com sucesso de um Comprovante_Bancário, THE Backend_n8n SHALL criar automaticamente uma Transação no Sistema com os dados extraídos.
5. THE Backend_n8n SHALL registrar o identificador único de cada e-mail processado para garantir idempotência no processamento.
6. WHILE um e-mail de Comprovante_Bancário já tiver sido processado, THE Backend_n8n SHALL ignorar esse e-mail em verificações subsequentes, não criando Transações duplicadas.
7. IF o Gmail_Monitor não conseguir extrair os campos obrigatórios de um e-mail, THEN THE Backend_n8n SHALL registrar o e-mail como não processado e disponibilizar o registro para revisão manual.
8. IF a autenticação OAuth 2.0 com a API do Gmail falhar, THEN THE Backend_n8n SHALL registrar o erro e interromper o ciclo de monitoramento até que as credenciais sejam revalidadas.

---

### Requisito 10: Extração de Dados com IA (Gemini)

**User Story:** Como usuário, quero que o sistema utilize inteligência artificial para extrair dados dos comprovantes bancários recebidos no Gmail, para que a identificação de valor, descrição, tipo e categoria seja mais precisa do que expressões regulares fixas.

#### Critérios de Aceitação

1. WHEN o Gmail_Monitor detectar um novo Comprovante_Bancário, THE Backend_n8n SHALL enviar o corpo do e-mail à Gemini_API solicitando a extração dos campos: valor, descrição, tipo (débito ou crédito) e categoria sugerida.
2. WHEN a Gemini_API retornar uma resposta com confiança suficiente, THE Backend_n8n SHALL utilizar o JSON estruturado retornado para criar a Transação no Sistema.
3. IF a Gemini_API indicar baixa confiança na extração ou retornar campos obrigatórios ausentes, THEN THE Backend_n8n SHALL sinalizar o e-mail para revisão manual, sem criar a Transação automaticamente.
4. IF a Gemini_API retornar um erro ou estiver indisponível, THEN THE Backend_n8n SHALL registrar o erro, sinalizar o e-mail para revisão manual e não interromper o ciclo de monitoramento do Gmail_Monitor.
5. THE docker-compose.yml SHALL definir a chave de API do Gemini como variável de ambiente (GEMINI_API_KEY), sem incluir o valor da chave diretamente no arquivo versionado.
6. WHILE o limite diário gratuito da Gemini_API (1500 requisições/dia) for atingido, THE Backend_n8n SHALL registrar um aviso e sinalizar os e-mails pendentes para processamento no ciclo seguinte.
7. FOR ALL e-mails processados com sucesso pela Gemini_API, a Transação criada SHALL conter os quatro campos extraídos: valor, descrição, tipo e categoria sugerida.
