describe('Admin Dashboard & Operations', function() {
  beforeEach(function() {
    const email = Cypress.env('TEST_ADMIN_EMAIL')
    const password = Cypress.env('TEST_ADMIN_PASSWORD')
    if (!email || !password) {
      this.skip()
    }
    cy.login(email, password)
  })

  it('Positive: Admin Dashboard loads correctly', function() {
    cy.visit('/admin')
    cy.get('h1').contains('Admin Dashboard', { matchCase: false }).should('be.visible')
    
    // Check tabs exist (exact text from AdminDashboard.tsx)
    cy.contains('Non-Realtors').should('be.visible')
    cy.contains('Realtors').should('be.visible')
    cy.contains('Properties').should('be.visible')
  })

  it('Positive: Admin can search and filter the Non-Realtors table', function() {
    cy.visit('/admin?tab=non-realtors')
    
    // Type in search bar
    cy.get('input[placeholder="Search non-realtors..."]').type('test')
    
    // Table should still render
    cy.get('table').should('be.visible')
  })

  it('Positive: Admin can view Properties tab', function() {
    cy.visit('/admin?tab=properties')
    cy.get('table').should('be.visible')
    // Don't assert 'Delete' unless we're sure there's properties. Just check table.
  })
})
