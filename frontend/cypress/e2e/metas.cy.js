describe('Fluxo de Minhas Metas', () => {
  beforeEach(() => {
    cy.mockSession()

    cy.intercept('GET', '**/rest/v1/goals?select=*', {
      statusCode: 200,
      body: []
    }).as('fetchEmptyGoals')

    cy.visit('/metas')
  })

  it('Deve carregar a página de metas vazia', () => {
    cy.wait('@fetchEmptyGoals')
    cy.contains('Minhas Metas')
    cy.contains('Nenhuma meta criada ainda')
  })

  it('Deve criar uma nova meta', () => {
    cy.intercept('POST', '**/rest/v1/goals*', {
      statusCode: 201,
      body: [{ id: 'goal-1' }]
    }).as('addGoal')

    cy.intercept('GET', '**/rest/v1/goals?select=*', {
      statusCode: 200,
      body: [{
        id: 'goal-1',
        name: 'Reserva Mock',
        target: 10000,
        category: 'Reserva',
        deadline: '2026-12',
        goal_progress: []
      }]
    }).as('fetchFilledGoals')

    cy.get('input#metaName').type('Reserva Mock')
    cy.get('input#metaTarget').type('10000')
    cy.get('select#metaCategory').select('Reserva')
    cy.contains('button', '+ Criar Meta').click()

    cy.wait('@addGoal')
    cy.wait('@fetchFilledGoals')

    cy.contains('.meta-name', 'Reserva Mock')
    cy.contains('.thermo-target', 'R$ 10.000,00')
    cy.contains('.thermo-pct', '0%')
  })

  it('Deve registrar um progresso financeiro na meta', () => {
    cy.intercept('GET', '**/rest/v1/goals?select=*', {
      statusCode: 200,
      body: [{
        id: 'goal-progress-1',
        name: 'Viagem Mock',
        target: 2000,
        category: 'Viagem',
        deadline: '2026-10',
        goal_progress: [{ id: 'p1', month: '2026-05', amount: 500 }]
      }]
    }).as('fetchInitialGoal')

    cy.visit('/metas')
    cy.wait('@fetchInitialGoal')

    cy.contains('.thermo-pct', '25%')
    cy.contains('.thermo-current', 'R$ 500,00')

    cy.intercept('POST', '**/rest/v1/goal_progress*', { statusCode: 201 }).as('addProgress')

    cy.intercept('GET', '**/rest/v1/goals?select=*', {
      statusCode: 200,
      body: [{
        id: 'goal-progress-1',
        name: 'Viagem Mock',
        target: 2000,
        category: 'Viagem',
        deadline: '2026-10',
        goal_progress: [
          { id: 'p1', month: '2026-05', amount: 500 },
          { id: 'p2', month: '2026-06', amount: 1500 }
        ]
      }]
    }).as('fetchCompleteGoal')

    cy.get('input[id^="prog-"]').type('1500')
    cy.contains('button', 'Registrar').click()

    cy.wait('@addProgress')
    cy.wait('@fetchCompleteGoal')

    cy.contains('.thermo-pct', '100%')
    cy.contains('.thermo-done', '✓ Meta atingida!')
  })
})
