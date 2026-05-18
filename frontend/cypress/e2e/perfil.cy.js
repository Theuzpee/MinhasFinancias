describe('Fluxo do Meu Perfil', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/perfil')
  })

  it('Deve carregar os dados do perfil e exibir no layout', () => {
    cy.wait('@fetchTransactions')
    cy.wait('@fetchProfile')

    cy.contains('Meu Perfil')
    cy.contains('.profile-name', 'Usuário Teste')
    cy.contains('.profile-email', 'test@mail.com')
    
    // Testa os valores calculados nos insights
    cy.contains('.insight-label', 'Uso do limite mensal').parent().should('contain', '25%') // 500/2000
    cy.contains('.insight-label', 'Categoria mais cara').parent().should('contain', 'Alimentação')
  })

  it('Deve atualizar os dados do perfil e salvar com sucesso', () => {
    cy.intercept('POST', '**/rest/v1/profiles*', {
      statusCode: 200,
      body: []
    }).as('saveProfile')

    cy.get('input#profileName').clear().type('Novo Nome Atualizado')
    cy.get('input#profileLimit').clear().type('4000')
    
    // Ativa o toggle de whatsapp
    cy.get('.toggle-btn').click()
    
    cy.contains('button', 'Salvar').click()
    cy.wait('@saveProfile')

    cy.get('.save-msg').should('contain', '✓ Salvo com sucesso')
    cy.contains('.profile-name', 'Novo Nome Atualizado')
  })
})
