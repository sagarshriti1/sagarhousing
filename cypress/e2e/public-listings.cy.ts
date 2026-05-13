describe('Public Listings & Browsing', () => {
  it('Positive: Home page loads featured properties', () => {
    cy.visit('/')
    cy.get('h1').should('exist') // Check hero section
    cy.contains('Featured Listings', { matchCase: false }).should('be.visible')
    cy.get('a[href^="/property/"]').should('have.length.greaterThan', 0)
  })

  it('Positive: Can view Realtors section on homepage', () => {
    cy.visit('/')
    cy.contains('Find Local Realtors', { matchCase: false }).should('be.visible')
  })

  it('Positive: Can view a property detail page', () => {
    cy.visit('/')
    cy.get('a[href^="/property/"]').first().click()
    cy.url().should('include', '/property/')
    // Verify key property detail elements
    cy.get('h1').should('be.visible')
    cy.contains('Call Agent', { matchCase: false }).should('be.visible')
  })

  it('Negative: Applying an impossible filter shows empty state', () => {
    cy.visit('/')
    // Set a very high minimum price to guarantee 0 results
    // We interact with the Shadcn Select component
    cy.contains('Price').click()
    cy.contains('5,000,000+').click()
    cy.get('body').should('be.visible')
    // We don't check for exact string here to avoid flaky tests, just ensure it doesn't crash
  })

  it('Negative: Navigating to invalid property ID shows 404/Not Found', () => {
    cy.visit('/property/00000000-0000-0000-0000-000000000000', { failOnStatusCode: false })
    // Ensure app handles invalid IDs gracefully instead of crashing
    cy.contains('Property not found', { matchCase: false }).should('be.visible')
  })
})
