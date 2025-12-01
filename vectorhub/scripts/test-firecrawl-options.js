// Mock fetch
global.fetch = async (url, options) => {
    console.log("Fetch called with URL:", url);
    console.log("Fetch options body:", options.body);
    return {
        ok: true,
        json: async () => ({ success: true, data: { content: "Mock content", metadata: {} } })
    };
};

// Mock process.env
process.env.FIRECRAWL_API_KEY = "test-key";

// Import client (we'll just copy the class definition for testing since we can't easily import TS)
class FirecrawlClient {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || "";
        this.baseUrl = "https://api.firecrawl.dev/v0";
    }

    async scrapeUrl(url, options) {
        if (!this.apiKey) return { success: false, error: "No key" };

        const body = {
            url,
            formats: options?.formats || ["markdown"],
            onlyMainContent: options?.onlyMainContent ?? true,
        };

        await fetch(`${this.baseUrl}/scrape`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        return { success: true };
    }
}

async function test() {
    const client = new FirecrawlClient();

    console.log("Test 1: Default options");
    await client.scrapeUrl("https://example.com");

    console.log("\nTest 2: Custom options");
    await client.scrapeUrl("https://example.com", {
        formats: ["html", "screenshot"],
        onlyMainContent: false
    });
}

test();
