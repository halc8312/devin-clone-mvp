import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInterface } from '@/components/chat-interface'
import { chatApi } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  chatApi: {
    listSessions: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    streamMessage: jest.fn(),
  },
}))

// Mock EventSource
class MockEventSource {
  url: string
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  close = jest.fn()
  
  constructor(url: string) {
    this.url = url
  }
}

global.EventSource = MockEventSource as any

const mockSessions = {
  sessions: [
    {
      id: 'session-1',
      project_id: 'proj-1',
      title: 'Test Session',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ],
  total: 1,
}

const mockSessionWithMessages = {
  ...mockSessions.sessions[0],
  messages: [
    {
      id: 'msg-1',
      session_id: 'session-1',
      role: 'user' as const,
      content: 'Hello AI',
      created_at: '2024-01-01',
    },
    {
      id: 'msg-2',
      session_id: 'session-1',
      role: 'assistant' as const,
      content: 'Hello! How can I help you?',
      created_at: '2024-01-01',
    },
  ],
}

describe('ChatInterface', () => {
  const mockOnCodeInsert = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(chatApi.listSessions as jest.Mock).mockResolvedValue(mockSessions)
    ;(chatApi.getSession as jest.Mock).mockResolvedValue(mockSessionWithMessages)
    ;(chatApi.createSession as jest.Mock).mockResolvedValue(mockSessions.sessions[0])
  })

  it('renders chat interface', async () => {
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument()
    })

    // Chat input should be visible
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument()
  })

  it('loads and displays messages', async () => {
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument()
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument()
    })
  })

  it('creates new chat session', async () => {
    const user = userEvent.setup()
    
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/new chat/i)).toBeInTheDocument()
    })

    // Click new chat button
    const newChatButton = screen.getByLabelText(/new chat/i)
    await user.click(newChatButton)

    // Verify API was called
    expect(chatApi.createSession).toHaveBeenCalledWith('proj-1', {
      title: 'New Chat',
    })
  })

  it('sends message and receives streaming response', async () => {
    const user = userEvent.setup()
    let eventSourceInstance: MockEventSource | null = null
    
    // Mock streaming response
    ;(chatApi.streamMessage as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        headers: {
          get: () => 'text/event-stream',
        },
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode('data: Hello from ')
              })
              .mockResolvedValueOnce({ 
                done: false, 
                value: new TextEncoder().encode('data: Claude!\n\n')
              })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      })
    })
    
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument()
    })

    // Type and send message
    const input = screen.getByPlaceholderText(/ask a question/i)
    await user.type(input, 'Write a hello world function')
    await user.keyboard('{Enter}')

    // Verify message was sent
    expect(chatApi.streamMessage).toHaveBeenCalledWith('proj-1', {
      message: 'Write a hello world function',
      session_id: 'session-1',
      stream: true,
      file_references: [],
    })

    // Wait for streaming response
    await waitFor(() => {
      expect(screen.getByText(/Hello from Claude!/)).toBeInTheDocument()
    })
  })

  it('inserts code block when clicking insert button', async () => {
    const user = userEvent.setup()
    
    // Add a message with code block
    const messageWithCode = {
      ...mockSessionWithMessages,
      messages: [
        ...mockSessionWithMessages.messages,
        {
          id: 'msg-3',
          session_id: 'session-1',
          role: 'assistant' as const,
          content: 'Here is the code:\n\n```python\ndef hello():\n    print("Hello, World!")\n```',
          code_blocks: [
            {
              language: 'python',
              code: 'def hello():\n    print("Hello, World!")',
            },
          ],
          created_at: '2024-01-01',
        },
      ],
    }
    
    ;(chatApi.getSession as jest.Mock).mockResolvedValue(messageWithCode)
    
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/def hello/)).toBeInTheDocument()
    })

    // Find and click insert button
    const insertButton = screen.getByLabelText(/insert code/i)
    await user.click(insertButton)

    // Verify callback was called with code
    expect(mockOnCodeInsert).toHaveBeenCalledWith(
      'def hello():\n    print("Hello, World!")',
      'python'
    )
  })

  it('switches between chat sessions', async () => {
    const user = userEvent.setup()
    
    // Add another session
    const multipleSessionsResponse = {
      sessions: [
        ...mockSessions.sessions,
        {
          id: 'session-2',
          project_id: 'proj-1',
          title: 'Another Session',
          created_at: '2024-01-02',
          updated_at: '2024-01-02',
        },
      ],
      total: 2,
    }
    
    ;(chatApi.listSessions as jest.Mock).mockResolvedValue(multipleSessionsResponse)
    
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test Session')).toBeInTheDocument()
      expect(screen.getByText('Another Session')).toBeInTheDocument()
    })

    // Click on another session
    const anotherSession = screen.getByText('Another Session')
    await user.click(anotherSession)

    // Verify session was loaded
    expect(chatApi.getSession).toHaveBeenCalledWith('proj-1', 'session-2')
  })

  it('handles errors gracefully', async () => {
    const user = userEvent.setup()
    ;(chatApi.streamMessage as jest.Mock).mockRejectedValue(new Error('Failed to send'))
    
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument()
    })

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i)
    await user.type(input, 'Test message')
    await user.keyboard('{Enter}')

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/error sending message/i)).toBeInTheDocument()
    })
  })

  it('includes file references when provided', async () => {
    const user = userEvent.setup()
    
    render(
      <ChatInterface
        projectId="proj-1"
        onCodeInsert={mockOnCodeInsert}
        selectedFileIds={['file-1', 'file-2']}
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument()
    })

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i)
    await user.type(input, 'Explain these files')
    await user.keyboard('{Enter}')

    // Verify file references were included
    expect(chatApi.streamMessage).toHaveBeenCalledWith('proj-1', {
      message: 'Explain these files',
      session_id: 'session-1',
      stream: true,
      file_references: ['file-1', 'file-2'],
    })
  })
})