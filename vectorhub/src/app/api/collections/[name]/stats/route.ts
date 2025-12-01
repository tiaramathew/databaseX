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
        const stats = await client.getCollectionStats(name);
        return NextResponse.json(stats);
    } catch (error) {
        logger.error(`GET /api/collections/${name}/stats failed`, error);
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to get collection stats",
            },
            { status: 500 }
        );
    }
}
