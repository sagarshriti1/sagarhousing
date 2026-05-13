describe('Payment and Bypass Workflows', function() {
  const cardInfo = {
    name: 'Sam Smith',
    number: '1111111111111111',
    expiry: '1130', // Will be formatted as 11/30
    cvc: '333'
  }

  describe('Realtor Listing Payment', function() {
    beforeEach(function() {
      const email = Cypress.env('TEST_REALTOR_EMAIL')
      const password = Cypress.env('TEST_REALTOR_PASSWORD')
      cy.login(email, password)
    })

    it('Positive: Realtor can pay for a pending listing', function() {
      cy.visit('/my-listings')
      
      // Select the first listing that needs activation
      cy.contains('button', /Pay Rs\..*to Activate/i).first().click()

      // The payment form is in a dialog. Let's be specific.
      cy.contains('Simulated Payment').closest('div.p-4').within(() => {
        cy.get('input[placeholder="John Doe"]').type(cardInfo.name)
        cy.get('input[placeholder="4242 4242 4242 4242"]').type(cardInfo.number)
        cy.get('input[placeholder="MM/YY"]').type(cardInfo.expiry)
        cy.get('input[placeholder="123"]').type(cardInfo.cvc)

        // Submit Payment - using force click to be sure
        cy.get('button').contains(/Pay Rs\./).click({ force: true })
        
        // Check for processing state
        cy.contains('Processing...', { timeout: 5000 }).should('be.visible')
      })

      // Verify success toast (outside the form)
      cy.contains(/Payment successful/i, { timeout: 15000 }).should('be.visible')
      
      // Verify listing becomes active
      cy.contains('active', { matchCase: false, timeout: 10000 }).should('be.visible')
    })
  })

  describe('Admin Bypass Logic', function() {
    beforeEach(function() {
      const email = Cypress.env('TEST_ADMIN_EMAIL')
      const password = Cypress.env('TEST_ADMIN_PASSWORD')
      cy.login(email, password)
    })

    it('Positive: Admin can bypass payment for a new listing', function() {
      cy.visit('/my-listings')
      cy.contains('Add Property', { matchCase: false }).click()
      
      const bypassTitle = `[BYPASS TEST] Admin House ${Date.now()}`
      cy.get('#title').type(bypassTitle)
      cy.get('#address').type('Admin Bypass Road')
      cy.get('[data-field="district"] button[role="combobox"]').click()
      cy.get('[cmdk-input]').type('Lalitpur')
      cy.get('[cmdk-item]').contains('Lalitpur').click()
      cy.get('#price').type('5000000')

      // Check Bypass Payment
      cy.contains('Bypass Payment')
        .parents('.flex')
        .find('button[role="checkbox"]')
        .click()
      
      // Enter Reason
      cy.get('textarea[placeholder*="Explain why"]').type('Partner agreement - complimentary listing')

      // Fill Dates (Required for Admin)
      cy.contains('button', 'Pick start date').click()
      cy.get('[role="grid"] button').contains('12').click({ force: true })

      // Intercept creation
      cy.intercept('POST', '**/rest/v1/user_properties*').as('createPropertyAdmin')

      // Submit
      cy.get('button[type="submit"]').scrollIntoView().click()
      
      cy.wait('@createPropertyAdmin', { timeout: 15000 })

      // Should be active immediately
      cy.url().should('include', '/my-listings')
      cy.contains(bypassTitle, { timeout: 10000 })
        .closest('[class*="bg-card"]')
        .within(() => {
          cy.contains('active', { matchCase: false }).should('be.visible')
        })
    })
  })
})
