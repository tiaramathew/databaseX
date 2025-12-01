import { NextResponse } from "next/server";
import { VectorDBClient } from "@/lib/db/client";
import { ConnectionConfig } from "@/types/connections";
import { logger } from "@/lib/logger";

const getClient = (request: Request) => {
    const configHeader = request.headers.get("x-connection-config");
    if (!configHeader) {
        throw new Error("Missing connection configuration");
    }
    try {
        const config = JSON.parse(configHeader) as ConnectionConfig;
        return new VectorDBClient(config);
    } catch (error) {
        throw new Error("Invalid connection configuration");
    }
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    try {
        const client = getClient(request);
        const collection = await client.getCollection(name);
        return NextResponse.json(collection);
    } catch (error) {
        logger.error(`GET /api/collections/${name} failed`, error);
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to get collection",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    try {
        const client = getClient(request);
        const { searchParams } = new URL(request.url);
        const cascade = searchParams.get("cascade") === "true";

        await client.deleteCollection(name, cascade);
        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error(`DELETE /api/collections/${name} failed`, error);
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to delete collection",
            },
            { status: 500 }
        );
    }
}
