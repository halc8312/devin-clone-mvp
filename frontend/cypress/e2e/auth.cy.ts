describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should redirect to signin when not authenticated', () => {
    cy.visit('/dashboard')
    cy.url().should('include', '/auth/signin')
  })

  it('should allow user to sign up', () => {
    cy.visit('/auth/signup')
    
    // Fill signup form
    cy.get('input[name="email"]').type('newuser@example.com')
    cy.get('input[name="password"]').type('NewUser123!')
    cy.get('input[name="full_name"]').type('New User')
    
    // Mock successful signup
    cy.intercept('POST', '/api/v1/auth/signup', {
      statusCode: 201,
      body: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      },
    }).as('signup')
    
    // Submit form
    cy.get('button[type="submit"]').click()
    
    // Wait for signup and redirect
    cy.wait('@signup')
    cy.url().should('include', '/dashboard')
  })

  it('should allow user to sign in', () => {
    cy.visit('/auth/signin')
    
    // Fill signin form
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('Test123!')
    
    // Mock successful signin
    cy.intercept('POST', '/api/v1/auth/signin', {
      statusCode: 200,
      body: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      },
    }).as('signin')
    
    // Submit form
    cy.get('button[type="submit"]').click()
    
    // Wait for signin and redirect
    cy.wait('@signin')
    cy.url().should('include', '/dashboard')
  })

  it('should show error for invalid credentials', () => {
    cy.visit('/auth/signin')
    
    // Fill signin form with invalid credentials
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('WrongPassword')
    
    // Mock failed signin
    cy.intercept('POST', '/api/v1/auth/signin', {
      statusCode: 401,
      body: {
        detail: 'Invalid credentials',
      },
    }).as('signinFailed')
    
    // Submit form
    cy.get('button[type="submit"]').click()
    
    // Wait for error
    cy.wait('@signinFailed')
    cy.contains('Invalid credentials').should('be.visible')
  })

  it('should allow user to sign out', () => {
    // Login first
    cy.login()
    cy.visit('/dashboard')
    
    // Mock successful logout
    cy.intercept('POST', '/api/v1/auth/logout', {
      statusCode: 200,
      body: {
        message: 'Successfully logged out',
      },
    }).as('logout')
    
    // Open user menu and click sign out
    cy.get('[data-testid="user-menu-button"]').click()
    cy.contains('Sign Out').click()
    
    // Wait for logout and redirect
    cy.wait('@logout')
    cy.url().should('include', '/auth/signin')
  })

  it('should validate email format', () => {
    cy.visit('/auth/signin')
    
    // Enter invalid email
    cy.get('input[name="email"]').type('invalid-email')
    cy.get('input[name="password"]').type('Test123!')
    
    // Try to submit
    cy.get('button[type="submit"]').click()
    
    // Should show validation error
    cy.get('input[name="email"]:invalid').should('exist')
  })

  it('should validate password requirements on signup', () => {
    cy.visit('/auth/signup')
    
    // Enter weak password
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('weak')
    cy.get('input[name="full_name"]').type('Test User')
    
    // Try to submit
    cy.get('button[type="submit"]').click()
    
    // Should show validation error
    cy.contains('Password must be at least 8 characters').should('be.visible')
  })
})