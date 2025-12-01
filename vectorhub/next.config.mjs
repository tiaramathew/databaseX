/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Optimize production builds
    poweredByHeader: false,

    // Allow all hosts for Replit proxy
    async rewrites() {
        return [];
    },

    // Security headers
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
            {
                // API routes specific headers
                source: "/api/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "no-store, max-age=0",
                    },
                ],
            },
        ];
    },

    // Logging configuration
    logging: {
        fetches: {
            fullUrl: true,
        },
    },

    // Experimental features for better performance
    experimental: {
        // Enable optimized package imports
        optimizePackageImports: [
            "lucide-react",
            "framer-motion",
            "date-fns",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
        ],
    },
};

export default nextConfig;
