describe('Fluxo de Minhas Metas', () => {
  beforeEach(() => {
    cy.login()
    
    // Spies para aguardar a rede verdadeira
    cy.intercept('GET', '**/rest/v1/goals*').as('getGoals')
    cy.intercept('POST', '**/rest/v1/goals*').as('postGoal')
    cy.intercept('POST', '**/rest/v1/goal_progress*').as('postProgress')

    cy.visit('/metas')
    cy.wait('@getGoals', { timeout: 10000 })
  })

  it('Deve criar uma nova meta e registrar progresso', () => {
    const goalName = `E2E Viagem ${Date.now()}`
    
    // 1. Criar a Meta
    cy.get('input#metaName').type(goalName)
    cy.get('input#metaTarget').type('2000')
    cy.get('select#metaCategory').select('Viagem')
    cy.contains('button', '+ Criar Meta').click()

    cy.wait('@postGoal')
    cy.wait('@getGoals')

    cy.contains('.meta-name', goalName)
    cy.contains('.thermo-target', 'R$ 2.000,00')
    cy.contains('.thermo-pct', '0%')

    // 2. Registrar Progresso
    cy.get('.meta-card').contains(goalName).parents('.meta-card').within(() => {
      cy.get('input[id^="prog-"]').type('2000')
      cy.contains('button', 'Registrar').click()
    })

    cy.wait('@postProgress')
    cy.wait('@getGoals')

    // 3. Validar Conclusão
    cy.get('.meta-card').contains(goalName).parents('.meta-card').within(() => {
      cy.contains('.thermo-pct', '100%')
      cy.contains('.thermo-done', '✓ Meta atingida!')
    })
  })
})
