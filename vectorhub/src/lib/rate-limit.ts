import { NextResponse } from "next/server";

interface RateLimitConfig {
    interval: number; // Time window in milliseconds
    maxRequests: number; // Max requests per interval
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory rate limit store
// For production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
    if (cleanupTimer) return;

    cleanupTimer = setInterval(() => {
        const now = Date.now();
        const entries = Array.from(rateLimitStore.entries());
        for (const [key, entry] of entries) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);
}

// Default rate limit configs for different API categories
export const RATE_LIMITS = {
    // General API: 100 requests per minute
    default: { interval: 60000, maxRequests: 100 },

    // Search API: 30 requests per minute (more expensive operations)
    search: { interval: 60000, maxRequests: 30 },

    // Write operations: 50 per minute
    write: { interval: 60000, maxRequests: 50 },

    // Webhook deliveries: 1000 per minute
    webhooks: { interval: 60000, maxRequests: 1000 },

    // Health checks: 60 per minute
    health: { interval: 60000, maxRequests: 60 },
} as const;

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = RATE_LIMITS.default
): { allowed: boolean; remaining: number; resetTime: number } {
    startCleanup();

    const now = Date.now();
    const key = identifier;
    const entry = rateLimitStore.get(key);

    // No existing entry or expired entry
    if (!entry || entry.resetTime < now) {
        const newEntry: RateLimitEntry = {
            count: 1,
            resetTime: now + config.interval,
        };
        rateLimitStore.set(key, newEntry);

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: newEntry.resetTime,
        };
    }

    // Increment count
    entry.count++;

    if (entry.count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header or falls back to a default
 */
export function getClientIdentifier(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    // Get the first IP from X-Forwarded-For (client IP)
    if (forwarded) {
        const ips = forwarded.split(",").map((ip) => ip.trim());
        if (ips[0]) return ips[0];
    }

    if (realIp) return realIp;

    // Fallback for development/localhost
    return "localhost";
}

/**
 * Create rate limit response with proper headers
 */
export function createRateLimitResponse(
    resetTime: number,
    remaining: number = 0
): NextResponse {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return NextResponse.json(
        {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            retryAfter,
        },
        {
            status: 429,
            headers: {
                "Retry-After": String(retryAfter),
                "X-RateLimit-Remaining": String(remaining),
                "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
            },
        }
    );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    remaining: number,
    resetTime: number,
    limit: number
): NextResponse {
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));
    return response;
}

/**
 * Rate limit middleware helper
 */
export function withRateLimit(
    request: Request,
    config: RateLimitConfig = RATE_LIMITS.default
): { allowed: boolean; response?: NextResponse; remaining: number; resetTime: number } {
    const clientId = getClientIdentifier(request);
    const path = new URL(request.url).pathname;
    const identifier = `${clientId}:${path}`;

    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
        return {
            allowed: false,
            response: createRateLimitResponse(result.resetTime, result.remaining),
            remaining: result.remaining,
            resetTime: result.resetTime,
        };
    }

    return {
        allowed: true,
        remaining: result.remaining,
        resetTime: result.resetTime,
    };
}

