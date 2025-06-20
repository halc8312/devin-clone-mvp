import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Call our backend API to authenticate
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/signin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              username: credentials.email,
              password: credentials.password,
            }),
          })

          if (!res.ok) {
            return null
          }

          const data = await res.json()

          // Get user info
          const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
            },
          })

          if (!userRes.ok) {
            return null
          }

          const user = await userRes.json()

          return {
            id: user.id,
            email: user.email,
            name: user.full_name || user.username,
            image: user.avatar_url,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          }
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === "google") {
          // Register or login with Google
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/google`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token: account.id_token,
                user: {
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  google_id: user.id,
                }
              }),
            })

            if (res.ok) {
              const data = await res.json()
              token.accessToken = data.access_token
              token.refreshToken = data.refresh_token
              token.userId = data.user.id
            }
          } catch (error) {
            console.error("OAuth error:", error)
          }
        } else {
          // Credentials provider
          token.accessToken = (user as any).accessToken
          token.refreshToken = (user as any).refreshToken
          token.userId = user.id
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.accessToken = token.accessToken as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }