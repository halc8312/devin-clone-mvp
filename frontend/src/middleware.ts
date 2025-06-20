import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 認証が必要なパス
        const protectedPaths = ["/dashboard", "/projects", "/settings"]
        const pathname = req.nextUrl.pathname

        // 保護されたパスかチェック
        const isProtectedPath = protectedPaths.some(path => 
          pathname.startsWith(path)
        )

        // 保護されたパスの場合、トークンの存在を確認
        if (isProtectedPath) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/settings/:path*",
  ],
}