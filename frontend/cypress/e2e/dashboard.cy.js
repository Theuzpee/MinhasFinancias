describe('Fluxo do Dashboard Financeiro', () => {
  beforeEach(() => {
    cy.login()

    // Spies para aguardar a rede verdadeira (Sem Mocks)
    cy.intercept('GET', '**/rest/v1/transactions*').as('getTransactions')
    cy.intercept('POST', '**/rest/v1/transactions*').as('postTransaction')
    cy.intercept('DELETE', '**/rest/v1/transactions*').as('deleteTransaction')

    cy.visit('/')
    cy.wait('@getTransactions', { timeout: 10000 })
  })

  it('Deve carregar o layout inicial do Dashboard', () => {
    cy.contains('Painel Financeiro')
    cy.contains('Renda do Mês')
    cy.contains('Gastos Essenciais')
    cy.contains('Saldo Restante')
  })

  it('Deve registrar e remover uma transação de Entrada', () => {
    const desc = `E2E Salário ${Date.now()}`

    cy.get('input#desc').type(desc)
    cy.get('input#amount').type('5000')
    cy.get('select#type').select('income')
    cy.get('select#category').select('Salário')
    cy.contains('button', '+ Adicionar').click()

    cy.wait('@postTransaction')
    cy.wait('@getTransactions')

    // Verifica se apareceu na tabela real
    cy.contains(desc)
    cy.contains('R$ 5.000,00')

    // Remove para limpar o banco real
    cy.on('window:confirm', () => true)
    cy.contains('tr', desc).find('.btn-remove').click()

    cy.wait('@deleteTransaction', { timeout: 30000 })
    cy.wait('@getTransactions', { timeout: 30000 })

    cy.contains(desc).should('not.exist')
  })
})
