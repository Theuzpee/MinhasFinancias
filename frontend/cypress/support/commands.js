// Cypress Custom Commands para E2E Real

/**
 * Realiza o login real na aplicação através da interface (UI).
 * Substitua as credenciais pelas de um usuário de teste válido no seu Supabase.
 */
Cypress.Commands.add('login', (email = 'e2e@teste.com', password = 'SenhaForte123') => {
  // Limpa o estado local para garantir um login limpo
  cy.clearLocalStorage()
  
  cy.visit('/login')
  cy.get('input#email').clear().type(email)
  cy.get('input#password').clear().type(password)
  cy.get('button[type="submit"]').click()
  
  // Aguarda o redirecionamento para o Dashboard confirmando que o login real funcionou
  cy.url({ timeout: 15000 }).should('eq', Cypress.config().baseUrl + '/')
})