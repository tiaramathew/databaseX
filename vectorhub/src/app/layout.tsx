import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "VectorHub",
        template: "%s | VectorHub",
    },
    description: "Universal Vector Database & Integration Manager - Manage, search, and analyze your vector databases with ease.",
    keywords: ["vector database", "embeddings", "semantic search", "AI", "machine learning", "RAG", "LLM"],
    authors: [{ name: "VectorHub Team" }],
    creator: "VectorHub",
    metadataBase: new URL("https://vectorhub.vercel.app"),
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://vectorhub.vercel.app",
        title: "VectorHub - Universal Vector Database Manager",
        description: "Manage, search, and analyze your vector databases with ease. Connect to Pinecone, Weaviate, Qdrant, and more.",
        siteName: "VectorHub",
    },
    twitter: {
        card: "summary_large_image",
        title: "VectorHub - Universal Vector Database Manager",
        description: "Manage, search, and analyze your vector databases with ease.",
        creator: "@vectorhub",
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafafa" },
        { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    ],
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    "min-h-screen bg-background font-sans antialiased",
                    outfit.variable,
                    jetbrainsMono.variable
                )}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    disableTransitionOnChange
                    themes={["light", "dark"]}
                >
                    <SessionProvider>
                        {children}
                        <Toaster position="bottom-right" richColors closeButton />
                    </SessionProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
