import { getSession } from "next-auth/react"

export async function getAccessToken() {
  const session = await getSession()
  return session?.accessToken
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  
  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : "",
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}