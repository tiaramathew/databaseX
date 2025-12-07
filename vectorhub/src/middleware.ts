import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default function middleware(request: any) {
    // Generate unique request ID for tracing
    const requestId = crypto.randomUUID();

    // Get the response
    const response = NextResponse.next();

    // Add request ID header
    response.headers.set("X-Request-ID", requestId);

    // Add CORS headers for API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Allow requests from same origin
        const origin = request.headers.get("origin");

        // In production, you'd want to validate against allowed origins
        if (origin) {
            response.headers.set("Access-Control-Allow-Origin", origin);
        }

        response.headers.set(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS"
        );
        response.headers.set(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Request-ID"
        );
        response.headers.set("Access-Control-Max-Age", "86400");

        // Handle preflight requests
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 204,
                headers: response.headers,
            });
        }
    }

    // In development, allow all routes without authentication
    if (process.env.NODE_ENV === "development") {
        return response;
    }

    // In production, you'd implement proper authentication
    return response;
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/users/:path*",
        "/api/:path*",
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
