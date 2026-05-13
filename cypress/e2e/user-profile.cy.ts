describe('User Profile & Dashboard Workflows', function() {
  beforeEach(function() {
    const email = Cypress.env('TEST_USER_EMAIL')
    const password = Cypress.env('TEST_USER_PASSWORD')
    if (!email || !password) {
      this.skip()
    }
    cy.login(email, password)
  })

  it('Positive: Can view and update Profile page', function() {
    cy.visit('/profile')
    cy.get('h1').contains('My Profile').should('be.visible')
    
    // Update display name
    cy.contains('label', 'Display Name').parent().find('input')
      .clear()
      .type('[CYPRESS TEST] User Name')
      
    // Save changes
    cy.contains('button', 'Save Changes').click()
    
    // After save, the button should become disabled again (dirty = false)
    cy.contains('button', 'Save Changes').should('be.disabled')
  })

  it('Positive: Can navigate to Favorites page', function() {
    cy.visit('/')
    // Find first property card and click heart
    cy.get('.lucide-heart').first().click({ force: true })
    
    cy.visit('/favorites')
    cy.get('h1').contains('Favorites').should('be.visible')
    cy.get('.lucide-heart').should('exist') // Should show at least one favorite
  })

  it('Positive: Can navigate to Saved Realtors page', function() {
    cy.visit('/realtors')
    // Click save button on first realtor (assuming there's a Bookmark/Save button, let's just test navigation first and assume they can save)
    // Actually we can just visit the page
    cy.visit('/saved-realtors')
    cy.get('h1').contains('Saved Realtors').should('be.visible')
  })
})
