import { getSession } from "next-auth/react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ApiOptions extends RequestInit {
  requireAuth?: boolean
}

async function fetchApi(endpoint: string, options: ApiOptions = {}) {
  const { requireAuth = true, ...fetchOptions } = options

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  }

  if (requireAuth) {
    const session = await getSession()
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API Error: ${response.statusText}`)
  }

  return response.json()
}

// Project API
export interface Project {
  id: string
  name: string
  description?: string
  language: string
  template: string
  owner_id: string
  max_files: number
  total_size_kb: number
  max_size_kb: number
  created_at: string
  updated_at: string
  last_accessed_at?: string
}

export interface ProjectCreate {
  name: string
  description?: string
  language?: string
  template?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
  language?: string
}

export interface ProjectList {
  projects: Project[]
  total: number
  page: number
  page_size: number
}

export interface ProjectStats {
  total_files: number
  total_size_kb: number
  last_activity?: string
  language_breakdown: Record<string, number>
}

export const projectsApi = {
  getAll: (page: number = 1, pageSize: number = 20): Promise<ProjectList> => 
    fetchApi(`/api/v1/projects/?page=${page}&page_size=${pageSize}`),
  
  get: (id: string): Promise<Project> => 
    fetchApi(`/api/v1/projects/${id}`),
  
  create: (data: ProjectCreate): Promise<Project> =>
    fetchApi("/api/v1/projects/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: ProjectUpdate): Promise<Project> =>
    fetchApi(`/api/v1/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  delete: (id: string): Promise<{message: string}> =>
    fetchApi(`/api/v1/projects/${id}`, {
      method: "DELETE",
    }),
    
  getStats: (id: string): Promise<ProjectStats> =>
    fetchApi(`/api/v1/projects/${id}/stats`),
}

// File API
export interface ProjectFile {
  id: string
  project_id: string
  parent_id?: string
  name: string
  path: string
  type: 'file' | 'directory'
  content?: string
  language?: string
  size_bytes: number
  is_binary: boolean
  mime_type?: string
  encoding: string
  created_at: string
  updated_at: string
}

export interface ProjectFileCreate {
  name: string
  path: string
  type: 'file' | 'directory'
  content?: string
  parent_id?: string
}

export interface ProjectFileUpdate {
  name?: string
  content?: string
  language?: string
}

export interface ProjectFileMove {
  new_path: string
  parent_id?: string
}

export interface ProjectFileTree extends ProjectFile {
  children: ProjectFileTree[]
}

export interface ProjectFileList {
  files: ProjectFile[]
  total: number
  directories: number
  total_size_bytes: number
}

export const filesApi = {
  list: (projectId: string, path?: string): Promise<ProjectFileList> => {
    const params = path ? `?path=${encodeURIComponent(path)}` : ''
    return fetchApi(`/api/v1/projects/${projectId}/files${params}`)
  },
  
  getTree: (projectId: string): Promise<ProjectFileTree[]> =>
    fetchApi(`/api/v1/projects/${projectId}/files/tree`),
    
  create: (projectId: string, data: ProjectFileCreate): Promise<ProjectFile> =>
    fetchApi(`/api/v1/projects/${projectId}/files`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  get: (projectId: string, fileId: string): Promise<ProjectFile> =>
    fetchApi(`/api/v1/projects/${projectId}/files/${fileId}`),
    
  update: (projectId: string, fileId: string, data: ProjectFileUpdate): Promise<ProjectFile> =>
    fetchApi(`/api/v1/projects/${projectId}/files/${fileId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    
  move: (projectId: string, fileId: string, data: ProjectFileMove): Promise<ProjectFile> =>
    fetchApi(`/api/v1/projects/${projectId}/files/${fileId}/move`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  delete: (projectId: string, fileId: string): Promise<{message: string}> =>
    fetchApi(`/api/v1/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    }),
    
  download: (projectId: string, fileId: string): Promise<Response> =>
    fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    }),
}

// User API
export const userApi = {
  me: () => fetchApi("/api/v1/auth/me"),
}

// Auth API
export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  full_name: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface RefreshRequest {
  refresh_token: string
}

export const authApi = {
  login: (data: LoginRequest): Promise<AuthResponse> =>
    fetchApi("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
      requireAuth: false,
    }),
    
  signup: (data: SignupRequest): Promise<AuthResponse> =>
    fetchApi("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
      requireAuth: false,
    }),
    
  refresh: (data: RefreshRequest): Promise<AuthResponse> =>
    fetchApi("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify(data),
      requireAuth: false,
    }),
    
  logout: (refreshToken: string): Promise<{message: string}> =>
    fetchApi("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
}

// Chat API
export interface ChatSession {
  id: string
  project_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  file_references?: string[]
  code_blocks?: Array<{ language: string; code: string }>
  token_count?: number
  created_at: string
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[]
}

export interface ChatSessionList {
  sessions: ChatSession[]
  total: number
}

export interface ChatSessionCreate {
  title?: string
}

export interface StreamingChatRequest {
  message: string
  session_id: string
  file_references?: string[]
  stream?: boolean
}

export const chatApi = {
  listSessions: (projectId: string): Promise<ChatSessionList> =>
    fetchApi(`/api/v1/projects/${projectId}/chat/sessions`),
    
  createSession: (projectId: string, data: ChatSessionCreate): Promise<ChatSession> =>
    fetchApi(`/api/v1/projects/${projectId}/chat/sessions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  getSession: (projectId: string, sessionId: string): Promise<ChatSessionWithMessages> =>
    fetchApi(`/api/v1/projects/${projectId}/chat/sessions/${sessionId}`),
    
  sendMessage: (projectId: string, sessionId: string, content: string): Promise<ChatMessage> =>
    fetchApi(`/api/v1/projects/${projectId}/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, role: 'user' }),
    }),
    
  streamMessage: async (projectId: string, data: StreamingChatRequest): Promise<Response> => {
    const session = await getSession()
    return fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
      },
      body: JSON.stringify(data),
    })
  },
    
  generateCode: (projectId: string, data: {
    prompt: string
    language?: string
    target_file_path?: string
    context?: string
    existing_code?: string
  }) => fetchApi(`/api/v1/projects/${projectId}/code/generate`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
    
  explainCode: (projectId: string, data: {
    code: string
    language?: string
  }) => fetchApi(`/api/v1/projects/${projectId}/code/explain`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
    
  fixCode: (projectId: string, data: {
    code: string
    error_message: string
    language?: string
  }) => fetchApi(`/api/v1/projects/${projectId}/code/fix`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
    
  improveCode: (projectId: string, data: {
    code: string
    language?: string
  }) => fetchApi(`/api/v1/projects/${projectId}/code/improve`, {
    method: "POST",
    body: JSON.stringify(data),
  }),
}

// Subscription API
export interface PriceProduct {
  id: string
  stripe_price_id: string
  stripe_product_id: string
  name: string
  description?: string
  amount: number
  currency: string
  interval: string
  interval_count: number
  features: string[]
  active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  stripe_product_id: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at?: string
  canceled_at?: string
  trial_end?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  subscription_id?: string
  stripe_payment_intent_id: string
  stripe_invoice_id?: string
  amount: number
  currency: string
  status: string
  description?: string
  invoice_pdf?: string
  receipt_url?: string
  created_at: string
  paid_at?: string
}

export interface PaymentList {
  payments: Payment[]
  total: number
  page: number
  page_size: number
}

export interface SubscriptionInfo {
  has_subscription: boolean
  subscription?: Subscription
  current_plan: string
  can_upgrade: boolean
  usage: {
    projects: number
    max_projects: number
    tokens_used: number
    tokens_limit: number
    storage_used_mb: number
    storage_limit_mb: number
  }
}

export interface CreateCheckoutSessionRequest {
  price_id: string
  success_url?: string
  cancel_url?: string
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string
  session_id: string
}

export interface CreatePortalSessionRequest {
  return_url?: string
}

export interface CreatePortalSessionResponse {
  portal_url: string
}

export const subscriptionApi = {
  listPrices: (): Promise<PriceProduct[]> =>
    fetchApi("/api/v1/subscription/prices"),
    
  getSubscriptionInfo: (): Promise<SubscriptionInfo> =>
    fetchApi("/api/v1/subscription/subscription"),
    
  createCheckout: (data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> =>
    fetchApi("/api/v1/subscription/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  createPortalSession: (data: CreatePortalSessionRequest): Promise<CreatePortalSessionResponse> =>
    fetchApi("/api/v1/subscription/portal", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  cancelSubscription: (): Promise<{message: string}> =>
    fetchApi("/api/v1/subscription/cancel", {
      method: "POST",
    }),
    
  reactivateSubscription: (): Promise<{message: string}> =>
    fetchApi("/api/v1/subscription/reactivate", {
      method: "POST",
    }),
    
  listPayments: (page: number = 1, pageSize: number = 20): Promise<PaymentList> =>
    fetchApi(`/api/v1/subscription/payments?page=${page}&page_size=${pageSize}`),
}

export default fetchApi