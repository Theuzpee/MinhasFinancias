describe('Fluxo de Autenticação (Login e Registro)', () => {
  beforeEach(() => {
    // Intercepta e simula a checagem de sessão inicial como deslogado
    cy.mockLoggedOut()
  })

  describe('Tela de Login', () => {
    beforeEach(() => {
      cy.visit('/login')
    })

    it('Deve renderizar a tela de login corretamente', () => {
      cy.contains('h1', 'Finanças')
      cy.contains('p', 'Acesse sua conta')
      cy.get('input#email').should('be.visible')
      cy.get('input#password').should('be.visible')
      cy.get('button[type="submit"]').contains('Entrar')
    })

    it('Deve permitir alternar a visibilidade da senha', () => {
      cy.get('input#password').should('have.attr', 'type', 'password')
      cy.get('.eye-btn').click()
      cy.get('input#password').should('have.attr', 'type', 'text')
      cy.get('.eye-btn').click()
      cy.get('input#password').should('have.attr', 'type', 'password')
    })

    it('Deve exibir erro ao tentar login com credenciais inválidas', () => {
      cy.intercept('POST', '**/auth/v1/token?grant_type=password', {
        statusCode: 400,
        body: { error: 'invalid_grant', error_description: 'Invalid login credentials' }
      }).as('loginFail')

      cy.get('input#email').type('usuario@invalido.com')
      cy.get('input#password').type('senhaerrada')
      cy.get('button[type="submit"]').click()

      cy.wait('@loginFail')
      cy.get('.error-msg').should('contain', 'Invalid login credentials')
    })

    it('Deve redirecionar para o dashboard após login com sucesso', () => {
      cy.intercept('POST', '**/auth/v1/token?grant_type=password', {
        statusCode: 200,
        body: {
          access_token: 'fake-token',
          user: { id: 'test-user', email: 'certo@teste.com' }
        }
      }).as('loginSuccess')

      // Mock da sessão após login
      cy.mockSession('test-user', 'certo@teste.com')

      // Mock de transações para que o dashboard carregue sem travar
      cy.intercept('GET', '**/rest/v1/transactions*', {
        statusCode: 200,
        body: []
      })

      cy.get('input#email').type('certo@teste.com')
      cy.get('input#password').type('senhacerta123')
      cy.get('button[type="submit"]').click()

      cy.wait('@loginSuccess')
      cy.url().should('eq', Cypress.config().baseUrl + '/')
      cy.contains('Painel Financeiro')
    })
  })

  describe('Tela de Registro', () => {
    beforeEach(() => {
      cy.visit('/register')
    })

    it('Deve renderizar a tela de registro corretamente', () => {
      cy.contains('h1', 'Finanças')
      cy.contains('p', 'Crie sua conta gratuita')
      cy.get('input#name').should('be.visible')
      cy.get('input#whatsapp').should('be.visible')
    })

    it('Deve validar se as senhas coincidem', () => {
      cy.get('input#password').type('minhasenha')
      cy.get('input#confirm').type('senhaerrada')
      cy.get('.field-error').should('contain', 'As senhas não coincidem')
      
      cy.get('input#confirm').clear().type('minhasenha')
      cy.get('.field-ok').should('contain', 'Senhas coincidem')
    })

    it('Deve registrar um novo usuário com sucesso', () => {
      cy.intercept('POST', '**/auth/v1/signup', {
        statusCode: 200,
        body: {
          user: { id: 'new-user', email: 'novo@teste.com' }
        }
      }).as('signupSuccess')

      cy.get('input#name').type('Usuário Novo')
      cy.get('input#email').type('novo@teste.com')
      cy.get('input#whatsapp').type('11999999999')
      cy.get('input#password').type('senhacerta')
      cy.get('input#confirm').type('senhacerta')
      cy.get('button[type="submit"]').click()

      cy.wait('@signupSuccess')
      cy.get('.success-msg').should('contain', 'Conta criada! Verifique seu email para confirmar.')
    })
  })
})
