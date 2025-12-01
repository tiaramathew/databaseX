import { NextResponse } from "next/server";
import { firecrawl } from "@/lib/firecrawl";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url, formats, onlyMainContent } = body;

        if (!url) {
            return NextResponse.json(
                { success: false, error: "URL is required" },
                { status: 400 }
            );
        }

        logger.info("Scraping URL", { url, formats, onlyMainContent });
        const result = await firecrawl.scrapeUrl(url, { formats, onlyMainContent });

        if (!result.success) {
            logger.error("Firecrawl scrape failed", { url, error: result.error });
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 } // Or 500 depending on the error
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        logger.error("Scrape API error", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
