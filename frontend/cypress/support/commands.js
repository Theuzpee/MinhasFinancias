// Cypress Custom Commands

/**
 * Comando customizado para realizar o mock de uma sessão autenticada do Supabase.
 * Isso evita a necessidade de repetir os interceptors em todos os arquivos de teste.
 */
Cypress.Commands.add('mockSession', (userId = 'u1', email = 'test@mail.com', name = 'Usuário Teste') => {
  cy.intercept('GET', '**/auth/v1/session*', {
    statusCode: 200,
    body: {
      session: {
        access_token: 'fake-token',
        user: { id: userId, email }
      }
    }
  }).as('mockSession')

  cy.intercept('GET', '**/auth/v1/user*', {
    statusCode: 200,
    body: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: { provider: 'email' },
      user_metadata: { name },
    }
  }).as('mockUser')
})

/**
 * Comando customizado para realizar o mock do estado "Deslogado".
 */
Cypress.Commands.add('mockLoggedOut', () => {
  cy.intercept('GET', '**/auth/v1/session*', {
    statusCode: 200,
    body: { session: null }
  }).as('mockLoggedOutSession')
})