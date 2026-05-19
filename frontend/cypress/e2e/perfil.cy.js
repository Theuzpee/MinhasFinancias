describe('Fluxo do Meu Perfil', () => {
  beforeEach(() => {
    cy.login()
    
    // Spies (Sem Mocks)
    cy.intercept('GET', '**/rest/v1/transactions*').as('getTransactions')
    cy.intercept('GET', '**/rest/v1/profiles*').as('getProfile')
    cy.intercept('POST', '**/rest/v1/profiles*').as('updateProfile')

    cy.visit('/perfil')
    cy.wait('@getProfile', { timeout: 10000 })
    cy.wait('@getTransactions', { timeout: 10000 })
  })

  it('Deve carregar a página de perfil', () => {
    cy.contains('Meu Perfil')
    cy.get('.profile-email').should('contain', '@')
    // Como é E2E real, o nome pode variar, mas os campos devem existir
    cy.get('input#profileName').should('exist')
    cy.get('input#profileLimit').should('exist')
  })

  it('Deve atualizar o nome e o limite', () => {
    const randomName = `E2E User ${Date.now()}`
    
    cy.get('input#profileName').clear().type(randomName)
    cy.get('input#profileLimit').clear().type('4000')
    
    cy.contains('button', 'Salvar').click()
    cy.wait('@updateProfile')

    cy.get('.save-msg').should('contain', '✓ Salvo com sucesso')
    cy.contains('.profile-name', randomName)
  })
})
