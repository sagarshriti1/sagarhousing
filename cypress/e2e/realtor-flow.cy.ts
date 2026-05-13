describe('Realtor Specific Workflows', function() {
  beforeEach(function() {
    const email = Cypress.env('TEST_REALTOR_EMAIL')
    const password = Cypress.env('TEST_REALTOR_PASSWORD')
    if (!email || !password) {
      this.skip()
    }
    cy.login(email, password)
  })

  it('Positive: Realtor Dashboard loads correctly', function() {
    cy.visit('/realtor-dashboard')
    cy.get('h1').contains('Realtor Dashboard').should('be.visible')
    cy.contains('My Listings').should('be.visible')
  })

  it('Positive: Realtor can navigate to My Listings', function() {
    cy.visit('/my-listings')
    cy.url().should('include', '/my-listings')
    cy.get('h1').contains('My Listings').should('be.visible')
  })

  it('Positive: Realtor can access List Property page', function() {
    cy.visit('/list-property')
    cy.get('h1').contains('List Your Property').should('be.visible')
    cy.get('form').should('be.visible')
  })

  it('Negative: List Property form validation fails with empty fields', function() {
    cy.visit('/my-listings')
    cy.contains('Add Property', { matchCase: false }).click()
    cy.url().should('include', '/list-property')

    // Click submit with empty form
    cy.get('button[type="submit"]').scrollIntoView().click()

    // The property will be saved as inactive — verify the form stays on the page
    cy.url().should('include', '/list-property')
    cy.contains('inactive', { matchCase: false }).should('be.visible')
  })

  it('Positive: Realtor can complete the List Property form and submit', function() {
    // Navigate FROM My Listings so navigate(-1) has a valid back entry
    cy.visit('/my-listings')
    cy.contains('Add Property', { matchCase: false }).click()
    cy.url().should('include', '/list-property')

    // Wait for the form to be ready
    cy.get('form').should('be.visible')

    // Fill out the form
    cy.get('#title').clear().type('[CYPRESS TEST] Modern Smart Home')
    cy.get('#description').clear().type('A wonderful modern home created by automated tests.')
    cy.get('#address').clear().type('123 Cypress Testing Avenue')

    // Handle SearchableCombobox for District:
    // The Combobox is a Popover with a Button[role="combobox"] trigger
    cy.get('[data-field="district"] button[role="combobox"]').click()
    // Wait for popover to open and type to filter
    cy.get('[cmdk-input]').should('be.visible').type('Kathmandu')
    // Select the option
    cy.get('[cmdk-item]').contains('Kathmandu').click()

    // Fill numeric details
    cy.get('#price').clear().type('25000000')
    cy.get('#bedrooms').clear().type('4')
    cy.get('#bathrooms').clear().type('3')
    cy.get('#sqft').clear().type('2500')

    // Select feature toggle buttons
    cy.contains('button', 'Smart Home').click()
    cy.contains('button', 'Garage').click()

    // Intercept the POST so we can wait for it
    cy.intercept('POST', '**/rest/v1/user_properties*').as('createProperty')

    // Submit
    cy.get('button[type="submit"]').scrollIntoView().click()

    // Wait for the DB insert to complete
    cy.wait('@createProperty', { timeout: 15000 }).its('response.statusCode').should('eq', 201)

    // navigate(-1) should take us back to /my-listings
    cy.url({ timeout: 10000 }).should('include', '/my-listings')
  })

  it('Positive: Realtor can edit an existing property', function() {
    cy.visit('/my-listings')

    // MyListingsPage renders card-style divs, not table rows.
    // Find the card containing our test property's title and click its edit (Pencil) icon
    cy.contains('[CYPRESS TEST] Modern Smart Home', { timeout: 8000 })
      .closest('[class*="bg-card"]')  // the card container div
      .find('button[title="Edit listing"]')
      .click()

    // Verify we are on edit page
    cy.url().should('include', '/edit-property/')
    cy.get('h1').contains('Edit Listing').should('be.visible')

    // Change price
    cy.get('#price').clear().type('26000000')

    // Intercept the PATCH so we can wait for it
    cy.intercept('PATCH', '**/rest/v1/user_properties*').as('updateProperty')

    // Save
    cy.get('button[type="submit"]').scrollIntoView().click()

    // Wait for the update to complete
    cy.wait('@updateProperty', { timeout: 15000 }).its('response.statusCode').should('be.oneOf', [200, 204])

    // Should redirect back
    cy.url({ timeout: 10000 }).should('include', '/my-listings')
    cy.contains('26,000,000').should('be.visible')
  })
})
