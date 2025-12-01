import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for API routes
 * Handles:
 * - CORS headers
 * - Request ID generation
 * - Basic security headers
 */
export function middleware(request: NextRequest) {
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

    return response;
}

// Only run middleware on API routes
export const config = {
    matcher: ["/api/:path*"],
};

