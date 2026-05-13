describe('Authentication & Authorization', () => {
  beforeEach(() => {
    // We clear cookies and local storage before each test to ensure a clean slate
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('Positive: User can navigate to the Auth page', () => {
    cy.visit('/auth')
    cy.get('h1').should('contain', 'Welcome Back')
    cy.get('form').should('be.visible')
  })

  it('Negative: Login with invalid credentials shows an error', () => {
    cy.visit('/auth')
    // Assuming you have inputs for email and password. Adjust selectors as needed.
    cy.get('input[type="email"]').type('invalid@example.com')
    cy.get('input[type="password"]').type('wrongpassword123')
    cy.get('button[type="submit"]').click()
    
    // Adjust error message text based on your app's actual error handling
    cy.contains('Invalid login credentials').should('be.visible')
  })

  it('Negative: Cannot access admin pages without authentication', () => {
    cy.visit('/admin', { failOnStatusCode: false })
    // Verify it redirects to login or shows a forbidden message
    cy.url().should('include', '/auth')
  })

  it('Positive: Can navigate to Reset Password page', () => {
    cy.visit('/auth')
    cy.contains('Forgot Password?').click()
    cy.get('h1').should('contain', 'Reset Password')
    cy.get('input[type="email"]').should('be.visible')
  })
})
