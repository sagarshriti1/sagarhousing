describe('Role-Based Access Control (RBAC) Security', function() {
  it('Negative: Unauthenticated user cannot access Profile', function() {
    cy.clearLocalStorage()
    cy.visit('/profile', { failOnStatusCode: false })
    // In many apps, visiting a protected route unauthenticated redirects to /auth
    cy.url().should('include', '/auth')
  })

  it('Negative: Standard User cannot access Realtor Dashboard', function() {
    const email = Cypress.env('TEST_USER_EMAIL')
    const password = Cypress.env('TEST_USER_PASSWORD')
    if (!email || !password) this.skip()
    
    cy.login(email, password)
    cy.visit('/realtor-dashboard', { failOnStatusCode: false })
    cy.contains('Realtor Dashboard').should('not.exist')
  })

  it('Negative: Standard User cannot access Admin pages', function() {
    const email = Cypress.env('TEST_USER_EMAIL')
    const password = Cypress.env('TEST_USER_PASSWORD')
    if (!email || !password) this.skip()
    
    cy.login(email, password)
    cy.visit('/admin', { failOnStatusCode: false })
    cy.contains('Admin Dashboard').should('not.exist')
  })

  it('Negative: Realtor cannot access Admin pages', function() {
    const email = Cypress.env('TEST_REALTOR_EMAIL')
    const password = Cypress.env('TEST_REALTOR_PASSWORD')
    if (!email || !password) this.skip()
    
    cy.login(email, password)
    cy.visit('/admin', { failOnStatusCode: false })
    cy.contains('Admin Dashboard').should('not.exist')
  })
})
