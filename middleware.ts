import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const isAuth = !!req.nextauth.token;

        // If they're on the login or signup page and authenticated, redirect to dashboard
        if ((pathname === "/" || pathname === "/login" || pathname === "/signup") && isAuth) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // Public pages
                if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname.startsWith("/api/auth")) {
                    return true;
                }

                // Protected pages - must have token
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
