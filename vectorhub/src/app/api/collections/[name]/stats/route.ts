import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { ConnectionConfig, MongoDBAtlasConfig } from "@/types/connections";
import { logger } from "@/lib/logger";

function getConnectionConfig(request: Request): ConnectionConfig {
    const configHeader = request.headers.get("x-connection-config");
    if (!configHeader) {
        throw new Error("Missing connection configuration");
    }
    return JSON.parse(configHeader) as ConnectionConfig;
}

async function getMongoDBCollectionStats(config: MongoDBAtlasConfig, collectionName: string) {
    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        const db = client.db(config.database);

        // Get collection stats
        const stats = await db.command({ collStats: collectionName });
        
        // Get document count
        const count = await db.collection(collectionName).countDocuments();

        // Get a sample document to check dimensions
        const sampleDoc = await db.collection(collectionName).findOne({});
        const dimensions = sampleDoc?.embedding?.length || config.dimensions || 1536;

        return {
            vectorCount: count,
            indexSize: stats.totalIndexSize || 0,
            storageSize: stats.storageSize || 0,
            avgObjSize: stats.avgObjSize || 0,
            dimensions,
            lastUpdated: new Date(),
        };
    } finally {
        await client.close();
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    try {
        const connectionConfig = getConnectionConfig(request);

        if (connectionConfig.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const stats = await getMongoDBCollectionStats(mongoConfig, name);
            return NextResponse.json(stats);
        }

        // For other types, return mock stats
        return NextResponse.json({
            vectorCount: 0,
            indexSize: 0,
            storageSize: 0,
            avgObjSize: 0,
            dimensions: 1536,
            lastUpdated: new Date(),
        });
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
