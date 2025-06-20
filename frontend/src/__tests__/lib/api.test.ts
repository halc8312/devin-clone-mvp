import { projectsApi, filesApi, authApi, chatApi, subscriptionApi } from '@/lib/api'

// Mock fetch
global.fetch = jest.fn()

// Mock next-auth
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(() => Promise.resolve({
    accessToken: 'test-token',
  })),
}))

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    })
  })

  describe('projectsApi', () => {
    it('fetches all projects', async () => {
      const mockProjects = {
        projects: [{ id: '1', name: 'Test Project' }],
        total: 1,
        page: 1,
        page_size: 20,
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjects),
      })

      const result = await projectsApi.getAll()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects/?page=1&page_size=20'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
      expect(result).toEqual(mockProjects)
    })

    it('creates a project', async () => {
      const newProject = {
        name: 'New Project',
        description: 'Test description',
      }
      const mockResponse = { id: '1', ...newProject }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await projectsApi.create(newProject)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newProject),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('handles API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: () => Promise.resolve({ detail: 'Project not found' }),
      })

      await expect(projectsApi.get('invalid-id')).rejects.toThrow('Project not found')
    })
  })

  describe('filesApi', () => {
    it('creates a file with proper encoding', async () => {
      const fileData = {
        name: 'test.py',
        path: '/test.py',
        type: 'file' as const,
        content: 'print("Hello")',
      }
      
      await filesApi.create('proj-1', fileData)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects/proj-1/files'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(fileData),
        })
      )
    })

    it('fetches file tree', async () => {
      const mockTree = [
        {
          id: '1',
          name: 'src',
          type: 'directory',
          children: [],
        },
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTree),
      })

      const result = await filesApi.getTree('proj-1')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects/proj-1/files/tree'),
        expect.any(Object)
      )
      expect(result).toEqual(mockTree)
    })
  })

  describe('authApi', () => {
    it('sends login request without auth header', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      }
      
      await authApi.login(credentials)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/signin'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })

    it('refreshes token', async () => {
      const refreshData = {
        refresh_token: 'refresh-token',
      }
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await authApi.refresh(refreshData)

      expect(result).toEqual(mockResponse)
    })
  })

  describe('chatApi', () => {
    it('streams chat messages', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: () => 'text/event-stream',
        },
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      const result = await chatApi.streamMessage('proj-1', {
        message: 'Hello',
        session_id: 'session-1',
        stream: true,
      })

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/projects/proj-1/chat/stream'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            message: 'Hello',
            session_id: 'session-1',
            stream: true,
          }),
        })
      )
    })
  })

  describe('subscriptionApi', () => {
    it('creates checkout session', async () => {
      const checkoutData = {
        price_id: 'price_123',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      }
      const mockResponse = {
        checkout_url: 'https://checkout.stripe.com/...',
        session_id: 'cs_123',
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await subscriptionApi.createCheckout(checkoutData)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/subscription/checkout'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(checkoutData),
        })
      )
    })

    it('fetches subscription info', async () => {
      const mockInfo = {
        has_subscription: true,
        current_plan: 'pro',
        usage: {
          projects: 5,
          max_projects: -1,
        },
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      })

      const result = await subscriptionApi.getSubscriptionInfo()

      expect(result).toEqual(mockInfo)
    })
  })
})