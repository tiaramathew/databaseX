import { NextResponse } from "next/server";
import { mockDbClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";

interface RouteParams {
    params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const { name } = await params;

    try {
        const stats = await mockDbClient.getCollectionStats(name);
        return NextResponse.json(stats);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.toLowerCase().includes("not found");

        logger.error("GET /api/collections/[name]/stats failed", error instanceof Error ? error : undefined, { name });

        if (isNotFound) {
            return NextResponse.json(
                {
                    code: "COLLECTION_NOT_FOUND",
                    message: `Collection "${name}" does not exist`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to fetch collection stats",
            },
            { status: 500 }
        );
    }
}
