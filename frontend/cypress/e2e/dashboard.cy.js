describe('Fluxo do Dashboard Financeiro', () => {
  beforeEach(() => {
    // Autenticação Real para as rotas protegidas
    cy.login()
    cy.visit('/')
  })

  it('Deve carregar o layout inicial do Dashboard sem transações', () => {
    cy.wait('@fetchEmptyTransactions')
    cy.contains('Painel Financeiro')
    cy.contains('Renda do Mês')
    cy.contains('Gastos Essenciais')
    cy.contains('Saldo Restante')
    cy.contains('Nenhuma transação neste período')
  })

  it('Deve registrar uma transação de Entrada', () => {
    // Mock a inserção do supabase
    cy.intercept('POST', '**/rest/v1/transactions*', {
      statusCode: 201,
      body: [{ id: 'tx-1' }]
    }).as('addTransaction')

    // Intercepta e ignora a chamada do webhook do n8n para focar só na UI
    cy.intercept('POST', '**/webhook/financas', { statusCode: 200, body: { success: true } })

    // Intercepta a re-busca de transações retornando o que acabou de ser "inserido"
    cy.intercept('GET', '**/rest/v1/transactions?select=*&date=gte.*', {
      statusCode: 200,
      body: [{
        id: 'tx-1',
        description: 'Salário Mock',
        amount: 5000,
        type: 'income',
        category: 'Salário',
        date: new Date().toISOString().slice(0, 10)
      }]
    }).as('fetchFilledTransactions')

    cy.get('input#desc').type('Salário Mock')
    cy.get('input#amount').type('5000')
    cy.get('select#type').select('income')
    cy.get('select#category').select('Salário')
    cy.contains('button', '+ Adicionar').click()

    cy.wait('@addTransaction')
    cy.wait('@fetchFilledTransactions')

    // Verifica se apareceu na tabela
    cy.contains('Salário Mock')
    cy.contains('Entrada')
    cy.contains('R$ 5.000,00')
    
    // Verifica se o card de renda foi atualizado
    cy.get('.card-income').should('contain', 'R$ 5.000,00')
  })

  it('Deve remover uma transação', () => {
    // Inicializa o state do mock já com uma transação
    cy.intercept('GET', '**/rest/v1/transactions?select=*&date=gte.*', {
      statusCode: 200,
      body: [{
        id: 'tx-delete-1',
        description: 'Compra Cancelada',
        amount: 200,
        type: 'expense',
        category: 'Outros',
        date: new Date().toISOString().slice(0, 10)
      }]
    }).as('fetchOneTransaction')

    cy.visit('/')
    cy.wait('@fetchOneTransaction')
    
    cy.contains('Compra Cancelada')

    // Mock da deleção
    cy.intercept('DELETE', '**/rest/v1/transactions?id=eq.tx-delete-1*', { statusCode: 204 }).as('deleteTx')
    
    // Mock da busca pós-deleção (retornando vazio)
    cy.intercept('GET', '**/rest/v1/transactions?select=*&date=gte.*', { statusCode: 200, body: [] }).as('fetchEmpty')

    // Permite que o window.confirm retorne true
    cy.on('window:confirm', () => true)

    cy.get('.btn-remove').click()
    
    cy.wait('@deleteTx')
    cy.wait('@fetchEmpty')
    cy.contains('Nenhuma transação neste período')
  })
})
