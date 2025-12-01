import { NextResponse } from "next/server";
import { mockDbClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";

interface RouteParams {
    params: Promise<{ name: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const { name } = await params;

    try {
        const collection = await mockDbClient.getCollection(name);
        return NextResponse.json(collection);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.toLowerCase().includes("not found");

        logger.error("GET /api/collections/[name] failed", error instanceof Error ? error : undefined, { name });

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
                message: "Failed to fetch collection",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    const { name } = await params;
    const url = new URL(request.url);
    const cascade = url.searchParams.get("cascade") === "true";

    try {
        await mockDbClient.deleteCollection(name, cascade);
        return NextResponse.json({ ok: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotFound = errorMessage.toLowerCase().includes("not found");

        logger.error("DELETE /api/collections/[name] failed", error instanceof Error ? error : undefined, { name, cascade });

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
                message: "Failed to delete collection",
            },
            { status: 500 }
        );
    }
}
