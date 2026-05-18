describe('Fluxo de Importação de Extratos', () => {
  beforeEach(() => {
    // Utiliza o custom command para realizar o mock da sessão do usuário
    cy.mockSession('test-user-id', 'teste@exemplo.com', 'Usuário Teste')

    // Visitar a rota de importação
    cy.visit('/importar')
  })

  it('Deve renderizar a tela corretamente', () => {
    cy.contains('h2', 'Importar Extrato')
    cy.contains('Como exportar seu extrato')
    cy.get('button.btn-send').should('be.disabled')
  })

  it('Deve mostrar erro se o formato for inválido (arquivo TXT)', () => {
    // Simula a seleção de um arquivo txt
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('Teste de texto plano'),
      fileName: 'extrato.txt',
      mimeType: 'text/plain'
    }, { force: true })

    cy.get('.validation-error').should('contain', 'Formato inválido. Apenas arquivos .csv e .pdf são aceitos.')
    cy.get('button.btn-send').should('be.disabled')
  })

  it('Deve habilitar o botão de envio se o formato for CSV ou PDF válido', () => {
    // Simula a seleção de um arquivo CSV válido
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('data,descricao,valor\n01/01/2026,Mercado,-100.00'),
      fileName: 'meu_extrato.csv',
      mimeType: 'text/csv'
    }, { force: true })

    // O erro não deve estar visível e o nome do arquivo deve aparecer
    cy.get('.validation-error').should('not.exist')
    cy.get('.upload-file-name').should('contain', 'meu_extrato.csv')
    
    // O botão deve estar habilitado
    cy.get('button.btn-send').should('not.be.disabled')
  })

  it('Deve simular o sucesso do Webhook do n8n (Importação Completa)', () => {
    // Intercepta a chamada para o n8n e simula sucesso
    cy.intercept('POST', '**/webhook/importar-extrato', {
      statusCode: 200,
      body: { success: true, imported: 12 }
    }).as('n8nWebhook')

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('data,descricao,valor\n01/01/2026,Mercado,-100.00'),
      fileName: 'extrato_mes.csv',
      mimeType: 'text/csv'
    }, { force: true })

    cy.get('button.btn-send').click()

    // O status deve mudar para loading
    cy.contains('Processando seu extrato…')

    // Espera a interceptação do webhook
    cy.wait('@n8nWebhook')

    // Valida a tela de sucesso
    cy.contains('Importação concluída!')
    cy.contains('12 transações importadas com sucesso.')
    
    // Verifica o link de volta para o dashboard
    cy.get('.btn-result-link').should('have.attr', 'href', '/')
  })

  it('Deve exibir o erro retornado pelo n8n se falhar no backend', () => {
    // Simula uma alucinação da IA ou payload inválido capturado pelo n8n
    cy.intercept('POST', '**/webhook/importar-extrato', {
      statusCode: 422,
      body: { error: 'O extrato PDF está ilegível ou corrompido.' }
    }).as('n8nWebhookFail')

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('PDF_FAKEDATA_BLABLA'),
      fileName: 'extrato.pdf',
      mimeType: 'application/pdf'
    }, { force: true })

    cy.get('button.btn-send').click()
    cy.wait('@n8nWebhookFail')

    // Deve renderizar o painel de erro com a mensagem customizada
    cy.contains('Erro na importação')
    cy.contains('O extrato PDF está ilegível ou corrompido.')
    
    // Deve permitir tentar novamente
    cy.contains('button.btn-retry', 'Tentar novamente').click()
    
    // O estado deve ser "idle" novamente, botão bloqueado e input vazio
    cy.get('button.btn-send').should('be.disabled')
    cy.contains('Arraste seu extrato aqui')
  })
})
