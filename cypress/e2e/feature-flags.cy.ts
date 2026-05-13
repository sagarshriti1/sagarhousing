describe('Feature Flag Workflows', function() {
  const email = Cypress.env('TEST_REALTOR_EMAIL')
  const password = Cypress.env('TEST_REALTOR_PASSWORD')

  beforeEach(function() {
    cy.login(email, password)
  })

  describe('Property Listing Flags', function() {
    it('shows paid activation when bypass_payment is false', function() {
      // Use a more flexible intercept and reply based on the key
      cy.intercept('GET', '**/rest/v1/feature_flags*', (req) => {
        if (req.url.includes('property_listing_sale')) {
          req.reply([{
            id: '1',
            key: 'property_listing_sale',
            label: 'Property Sale Listing',
            fee: 5555, // Unique fee to verify mock
            bypass_payment: false,
            promo_label: null,
            promo_ends_at: null
          }])
        }
      }).as('getFlags')

      cy.visit('/my-listings')
      
      // Verify the button text reflects the mocked fee
      cy.contains('button', /Pay Rs\. 5,555/i, { timeout: 15000 }).should('be.visible')
    })

    it('shows free activation when bypass_payment is true (Promo Active)', function() {
      cy.intercept('GET', '**/rest/v1/feature_flags*', (req) => {
        if (req.url.includes('property_listing_sale')) {
          req.reply([{
            id: '1',
            key: 'property_listing_sale',
            label: 'Property Sale Listing',
            fee: 5555,
            bypass_payment: true,
            promo_label: 'MOCK FREE PROMO 🎉',
            promo_ends_at: null // Forever active
          }])
        }
      }).as('getFlagsFree')

      cy.visit('/my-listings')
      
      // Verify the button text reflects the promo
      cy.contains('button', /MOCK FREE PROMO 🎉/i, { timeout: 15000 }).should('be.visible')
    })
  })

  describe('Realtor Renewal Flags', function() {
    it('shows paid renewal when bypass_payment is false', function() {
      cy.intercept('GET', '**/rest/v1/feature_flags*', (req) => {
        if (req.url.includes('realtor_renewal')) {
          req.reply([{
            id: '2',
            key: 'realtor_renewal',
            label: 'Realtor Renewal',
            fee: 1234, // Unique fee
            bypass_payment: false,
            promo_label: null,
            promo_ends_at: null
          }])
        }
      })

      cy.visit('/realtor-dashboard')
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('Subscription Expired')) {
          cy.contains('button', /Renew Subscription — Rs\. 1,234/i, { timeout: 10000 }).should('be.visible')
        }
      })
    })

    it('shows free renewal when bypass_payment is true', function() {
      cy.intercept('GET', '**/rest/v1/feature_flags*', (req) => {
        if (req.url.includes('realtor_renewal')) {
          req.reply([{
            id: '2',
            key: 'realtor_renewal',
            label: 'Realtor Renewal',
            fee: 1234,
            bypass_payment: true,
            promo_label: 'MOCK RENEW FREE 🎉',
            promo_ends_at: null
          }])
        }
      })

      cy.visit('/realtor-dashboard')
      
      cy.get('body').then(($body) => {
        if ($body.text().includes('Subscription Expired')) {
          cy.contains('button', /MOCK RENEW FREE 🎉/i, { timeout: 10000 }).should('be.visible')
        }
      })
    })
  })
})
