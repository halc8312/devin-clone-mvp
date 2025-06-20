describe('Project Management', () => {
  beforeEach(() => {
    cy.login()
  })

  it('should display project list', () => {
    // Mock project list
    cy.intercept('GET', '/api/v1/projects/*', {
      statusCode: 200,
      body: {
        projects: [
          {
            id: 'proj-1',
            name: 'Test Project 1',
            description: 'First test project',
            language: 'python',
            template: 'blank',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
          {
            id: 'proj-2',
            name: 'Test Project 2',
            description: 'Second test project',
            language: 'javascript',
            template: 'react',
            created_at: '2024-01-02',
            updated_at: '2024-01-02',
          },
        ],
        total: 2,
        page: 1,
        page_size: 20,
      },
    }).as('getProjects')
    
    cy.visit('/dashboard')
    cy.wait('@getProjects')
    
    // Check projects are displayed
    cy.contains('Test Project 1').should('be.visible')
    cy.contains('Test Project 2').should('be.visible')
    cy.contains('First test project').should('be.visible')
    cy.contains('Second test project').should('be.visible')
  })

  it('should create a new project', () => {
    // Mock project creation
    cy.intercept('POST', '/api/v1/projects/', {
      statusCode: 201,
      body: {
        id: 'new-proj-id',
        name: 'My New Project',
        description: 'A brand new project',
        language: 'python',
        template: 'blank',
        created_at: '2024-01-03',
        updated_at: '2024-01-03',
      },
    }).as('createProject')
    
    cy.visit('/projects/new')
    
    // Fill form
    cy.get('input[name="name"]').type('My New Project')
    cy.get('textarea[name="description"]').type('A brand new project')
    cy.get('select[name="language"]').select('python')
    cy.get('select[name="template"]').select('blank')
    
    // Submit
    cy.get('button[type="submit"]').click()
    
    // Wait for creation and redirect
    cy.wait('@createProject')
    cy.url().should('include', '/projects/new-proj-id')
  })

  it('should navigate to project details', () => {
    // Mock project details
    cy.intercept('GET', '/api/v1/projects/proj-1', {
      statusCode: 200,
      body: {
        id: 'proj-1',
        name: 'Test Project 1',
        description: 'First test project',
        language: 'python',
        template: 'blank',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    }).as('getProject')
    
    // Mock file tree
    cy.intercept('GET', '/api/v1/projects/proj-1/files/tree', {
      statusCode: 200,
      body: [],
    }).as('getFileTree')
    
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getFileTree'])
    
    // Check project details are displayed
    cy.contains('Test Project 1').should('be.visible')
    cy.contains('First test project').should('be.visible')
  })

  it('should update project details', () => {
    // Mock get project
    cy.intercept('GET', '/api/v1/projects/proj-1', {
      statusCode: 200,
      body: {
        id: 'proj-1',
        name: 'Test Project 1',
        description: 'First test project',
        language: 'python',
        template: 'blank',
      },
    }).as('getProject')
    
    // Mock update project
    cy.intercept('PUT', '/api/v1/projects/proj-1', {
      statusCode: 200,
      body: {
        id: 'proj-1',
        name: 'Updated Project Name',
        description: 'Updated description',
        language: 'python',
        template: 'blank',
      },
    }).as('updateProject')
    
    cy.visit('/projects/proj-1/settings')
    cy.wait('@getProject')
    
    // Update fields
    cy.get('input[name="name"]').clear().type('Updated Project Name')
    cy.get('textarea[name="description"]').clear().type('Updated description')
    
    // Save
    cy.get('button[type="submit"]').click()
    
    // Wait for update
    cy.wait('@updateProject')
    cy.contains('Project updated successfully').should('be.visible')
  })

  it('should delete a project', () => {
    // Mock project list with one project
    cy.intercept('GET', '/api/v1/projects/*', {
      statusCode: 200,
      body: {
        projects: [
          {
            id: 'proj-to-delete',
            name: 'Project to Delete',
            description: 'This will be deleted',
          },
        ],
        total: 1,
      },
    }).as('getProjects')
    
    // Mock delete
    cy.intercept('DELETE', '/api/v1/projects/proj-to-delete', {
      statusCode: 200,
      body: {
        message: 'Project deleted successfully',
      },
    }).as('deleteProject')
    
    cy.visit('/dashboard')
    cy.wait('@getProjects')
    
    // Click delete button
    cy.get('[data-testid="project-menu-proj-to-delete"]').click()
    cy.contains('Delete').click()
    
    // Confirm deletion
    cy.contains('Are you sure').should('be.visible')
    cy.get('[data-testid="confirm-delete"]').click()
    
    // Wait for deletion
    cy.wait('@deleteProject')
    cy.contains('Project deleted successfully').should('be.visible')
  })

  it('should show project limits for free tier', () => {
    // Mock subscription info - free tier
    cy.intercept('GET', '/api/v1/subscription/subscription', {
      statusCode: 200,
      body: {
        has_subscription: false,
        current_plan: 'free',
        usage: {
          projects: 1,
          max_projects: 1,
        },
      },
    }).as('getSubscription')
    
    // Mock project creation failure due to limit
    cy.intercept('POST', '/api/v1/projects/', {
      statusCode: 403,
      body: {
        detail: 'Project limit reached. Upgrade to Pro for unlimited projects.',
      },
    }).as('createProjectFailed')
    
    cy.visit('/projects/new')
    
    // Try to create project
    cy.get('input[name="name"]').type('Another Project')
    cy.get('button[type="submit"]').click()
    
    // Should show error
    cy.wait('@createProjectFailed')
    cy.contains('Project limit reached').should('be.visible')
    cy.contains('Upgrade to Pro').should('be.visible')
  })
})