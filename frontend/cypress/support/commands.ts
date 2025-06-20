// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login
Cypress.Commands.add('login', (email = 'test@example.com', password = 'Test123!') => {
  cy.session([email, password], () => {
    cy.visit('/auth/signin')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.get('button[type="submit"]').click()
    
    // Wait for redirect to dashboard
    cy.url().should('include', '/dashboard')
    
    // Verify user is logged in
    cy.window().its('localStorage.accessToken').should('exist')
  })
})

// Custom command to create a project
Cypress.Commands.add('createProject', (name: string, description = '') => {
  cy.visit('/projects/new')
  cy.get('input[name="name"]').type(name)
  if (description) {
    cy.get('textarea[name="description"]').type(description)
  }
  cy.get('button[type="submit"]').click()
  
  // Wait for redirect to project page
  cy.url().should('match', /\/projects\/[a-f0-9-]+$/)
})

// Custom command to upload a file
Cypress.Commands.add('uploadFile', (fileName: string, fileContent: string) => {
  cy.get('[data-testid="new-file-button"]').click()
  cy.get('input[placeholder*="file name"]').type(fileName)
  cy.get('[data-testid="create-file-confirm"]').click()
  
  // Wait for file to be created and editor to load
  cy.get('[data-testid="code-editor"]').should('be.visible')
  
  // Type content into editor
  cy.get('[data-testid="code-editor"] textarea').type(fileContent, { delay: 0 })
  
  // Save file
  cy.get('[data-testid="save-file-button"]').click()
})

// Intercept API calls
beforeEach(() => {
  // Mock successful auth check
  cy.intercept('GET', '/api/v1/auth/me', {
    statusCode: 200,
    body: {
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      is_verified: true,
    },
  }).as('getMe')
  
  // Mock project list
  cy.intercept('GET', '/api/v1/projects/*', {
    statusCode: 200,
    body: {
      projects: [],
      total: 0,
      page: 1,
      page_size: 20,
    },
  }).as('getProjects')
})