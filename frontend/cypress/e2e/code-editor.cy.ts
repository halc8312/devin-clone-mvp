describe('Code Editor and AI Features', () => {
  beforeEach(() => {
    cy.login()
    
    // Mock project with files
    cy.intercept('GET', '/api/v1/projects/proj-1', {
      statusCode: 200,
      body: {
        id: 'proj-1',
        name: 'Test Project',
        language: 'python',
      },
    }).as('getProject')
    
    // Mock file tree
    cy.intercept('GET', '/api/v1/projects/proj-1/files/tree', {
      statusCode: 200,
      body: [
        {
          id: 'file-1',
          name: 'main.py',
          path: '/main.py',
          type: 'file',
          language: 'python',
          content: 'def hello():\n    print("Hello, World!")',
          children: [],
        },
      ],
    }).as('getFileTree')
    
    // Mock file content
    cy.intercept('GET', '/api/v1/projects/proj-1/files/file-1', {
      statusCode: 200,
      body: {
        id: 'file-1',
        name: 'main.py',
        content: 'def hello():\n    print("Hello, World!")',
        language: 'python',
      },
    }).as('getFile')
  })

  it('should display and edit code', () => {
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getFileTree'])
    
    // Click on file
    cy.contains('main.py').click()
    cy.wait('@getFile')
    
    // Check editor is visible
    cy.get('[data-testid="code-editor"]').should('be.visible')
    cy.contains('def hello():').should('be.visible')
    
    // Edit code
    cy.get('[data-testid="code-editor"] textarea')
      .type('{selectall}')
      .type('def greet(name):\n    print(f"Hello, {name}!")')
    
    // Mock save
    cy.intercept('PUT', '/api/v1/projects/proj-1/files/file-1', {
      statusCode: 200,
      body: {
        id: 'file-1',
        content: 'def greet(name):\n    print(f"Hello, {name}!")',
      },
    }).as('saveFile')
    
    // Save file
    cy.get('[data-testid="save-file-button"]').click()
    cy.wait('@saveFile')
    cy.contains('File saved').should('be.visible')
  })

  it('should create new files', () => {
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getFileTree'])
    
    // Mock file creation
    cy.intercept('POST', '/api/v1/projects/proj-1/files', {
      statusCode: 201,
      body: {
        id: 'new-file-id',
        name: 'utils.py',
        path: '/utils.py',
        type: 'file',
        content: '',
      },
    }).as('createFile')
    
    // Click new file button
    cy.get('[data-testid="new-file-button"]').click()
    
    // Enter file name
    cy.get('input[placeholder*="file name"]').type('utils.py')
    cy.get('[data-testid="create-file-confirm"]').click()
    
    // Wait for creation
    cy.wait('@createFile')
    cy.contains('utils.py').should('be.visible')
  })

  it('should use AI chat assistant', () => {
    // Mock chat sessions
    cy.intercept('GET', '/api/v1/projects/proj-1/chat/sessions', {
      statusCode: 200,
      body: {
        sessions: [
          {
            id: 'session-1',
            title: 'Chat Session',
            created_at: '2024-01-01',
          },
        ],
        total: 1,
      },
    }).as('getChatSessions')
    
    // Mock chat session details
    cy.intercept('GET', '/api/v1/projects/proj-1/chat/sessions/session-1', {
      statusCode: 200,
      body: {
        id: 'session-1',
        messages: [],
      },
    }).as('getChatSession')
    
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getFileTree', '@getChatSessions'])
    
    // Open chat panel
    cy.get('[data-testid="chat-toggle"]').click()
    
    // Type message
    cy.get('[data-testid="chat-input"]').type('Explain the hello function')
    
    // Mock streaming response
    cy.intercept('POST', '/api/v1/projects/proj-1/chat/stream', (req) => {
      req.reply({
        statusCode: 200,
        headers: {
          'content-type': 'text/event-stream',
        },
        body: `data: The hello function is a simple Python function\n\ndata: that prints "Hello, World!" to the console.\n\ndata: [DONE]\n\n`,
      })
    }).as('streamChat')
    
    // Send message
    cy.get('[data-testid="chat-send"]').click()
    
    // Wait for response
    cy.wait('@streamChat')
    cy.contains('The hello function is a simple Python function').should('be.visible')
  })

  it('should generate code with AI', () => {
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getFileTree'])
    
    // Mock code generation
    cy.intercept('POST', '/api/v1/projects/proj-1/code/generate', {
      statusCode: 200,
      body: {
        code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)',
        explanation: 'This is a recursive implementation of the Fibonacci sequence.',
      },
    }).as('generateCode')
    
    // Open AI menu
    cy.get('[data-testid="ai-menu-button"]').click()
    cy.contains('Generate Code').click()
    
    // Enter prompt
    cy.get('[data-testid="ai-prompt-input"]')
      .type('Create a fibonacci function')
    
    // Generate
    cy.get('[data-testid="ai-generate-button"]').click()
    
    // Wait for generation
    cy.wait('@generateCode')
    
    // Check code is displayed
    cy.contains('def fibonacci(n):').should('be.visible')
    
    // Insert code
    cy.get('[data-testid="insert-generated-code"]').click()
    cy.get('[data-testid="code-editor"]').should('contain', 'fibonacci')
  })

  it('should fix code errors with AI', () => {
    // Mock file with error
    cy.intercept('GET', '/api/v1/projects/proj-1/files/file-1', {
      statusCode: 200,
      body: {
        id: 'file-1',
        name: 'main.py',
        content: 'def divide(a, b):\n    return a / b',
        language: 'python',
      },
    }).as('getFileWithError')
    
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getFileTree'])
    
    // Open file
    cy.contains('main.py').click()
    cy.wait('@getFileWithError')
    
    // Mock error fix
    cy.intercept('POST', '/api/v1/projects/proj-1/code/fix', {
      statusCode: 200,
      body: {
        fixed_code: 'def divide(a, b):\n    if b == 0:\n        raise ValueError("Cannot divide by zero")\n    return a / b',
        explanation: 'Added zero division check to prevent runtime errors.',
      },
    }).as('fixCode')
    
    // Open AI menu and select fix
    cy.get('[data-testid="ai-menu-button"]').click()
    cy.contains('Fix Error').click()
    
    // Enter error description
    cy.get('[data-testid="error-description-input"]')
      .type('ZeroDivisionError when b is 0')
    
    // Fix
    cy.get('[data-testid="ai-fix-button"]').click()
    
    // Wait for fix
    cy.wait('@fixCode')
    
    // Check fixed code
    cy.contains('if b == 0:').should('be.visible')
    cy.contains('raise ValueError').should('be.visible')
  })

  it('should handle multiple files in tabs', () => {
    // Mock additional file
    cy.intercept('GET', '/api/v1/projects/proj-1/files/tree', {
      statusCode: 200,
      body: [
        {
          id: 'file-1',
          name: 'main.py',
          path: '/main.py',
          type: 'file',
          children: [],
        },
        {
          id: 'file-2',
          name: 'utils.py',
          path: '/utils.py',
          type: 'file',
          children: [],
        },
      ],
    }).as('getMultipleFiles')
    
    cy.visit('/projects/proj-1')
    cy.wait(['@getProject', '@getMultipleFiles'])
    
    // Open first file
    cy.contains('main.py').click()
    cy.get('[data-testid="file-tab-main.py"]').should('exist')
    
    // Open second file
    cy.contains('utils.py').click()
    cy.get('[data-testid="file-tab-utils.py"]').should('exist')
    
    // Switch between tabs
    cy.get('[data-testid="file-tab-main.py"]').click()
    cy.get('[data-testid="code-editor"]').should('contain', 'hello')
    
    cy.get('[data-testid="file-tab-utils.py"]').click()
    cy.get('[data-testid="code-editor"]').should('not.contain', 'hello')
    
    // Close tab
    cy.get('[data-testid="close-tab-utils.py"]').click()
    cy.get('[data-testid="file-tab-utils.py"]').should('not.exist')
  })
})