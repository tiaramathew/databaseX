import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { ConnectionConfig, MongoDBAtlasConfig } from "@/types/connections";
import {
    createCollectionSchema,
    validateRequestBody,
} from "@/lib/validations/api";
import type { CreateCollectionConfig, CollectionInfo } from "@/lib/db/adapters/base";
import { logger } from "@/lib/logger";

const getConnectionConfig = (request: Request): ConnectionConfig => {
    const configHeader = request.headers.get("x-connection-config");
    if (!configHeader) {
        throw new Error("Missing connection configuration");
    }
    return JSON.parse(configHeader) as ConnectionConfig;
};

// Direct MongoDB connection for listing collections
async function listMongoDBCollections(config: MongoDBAtlasConfig): Promise<CollectionInfo[]> {
    const client = new MongoClient(config.connectionString);
    
    try {
        await client.connect();
        const db = client.db(config.database);
        const collections = await db.listCollections().toArray();

        const collectionInfos = await Promise.all(
            collections.map(async (col) => {
                let count = 0;
                try {
                    count = await db.collection(col.name).countDocuments();
                } catch {
                    // Ignore count errors
                }

                return {
                    name: col.name,
                    dimensions: config.dimensions || 1536,
                    distanceMetric: "cosine",
                    documentCount: count,
                };
            })
        );

        return collectionInfos;
    } finally {
        await client.close();
    }
}

export async function GET(request: Request) {
    try {
        const connectionConfig = getConnectionConfig(request);
        
        // Handle different database types
        if (connectionConfig.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const collections = await listMongoDBCollections(mongoConfig);
            return NextResponse.json(collections);
        }
        
        // For other types, return empty array (can be extended)
        return NextResponse.json([]);
    } catch (error) {
        logger.error("GET /api/collections failed", error);
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to list collections",
            },
            { status: 500 }
        );
    }
}

// Direct MongoDB collection creation
async function createMongoDBCollection(
    dbConfig: MongoDBAtlasConfig, 
    collectionConfig: CreateCollectionConfig
): Promise<CollectionInfo> {
    const client = new MongoClient(dbConfig.connectionString);
    
    try {
        await client.connect();
        const db = client.db(dbConfig.database);
        await db.createCollection(collectionConfig.name);

        return {
            name: collectionConfig.name,
            dimensions: collectionConfig.dimensions,
            distanceMetric: collectionConfig.distanceMetric,
            documentCount: 0,
        };
    } finally {
        await client.close();
    }
}

export async function POST(request: Request) {
    const validation = await validateRequestBody(request, createCollectionSchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { data } = validation;

    try {
        const connectionConfig = getConnectionConfig(request);
        
        const config: CreateCollectionConfig = {
            name: data.name,
            description: data.description,
            dimensions: data.dimensions,
            distanceMetric: data.distanceMetric,
            indexType: data.indexType,
            indexOptions: data.indexOptions,
            metadataSchema: data.metadataSchema,
        };

        let created: CollectionInfo;
        
        if (connectionConfig.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            created = await createMongoDBCollection(mongoConfig, config);
        } else {
            // For other types, return a mock response
            created = {
                name: config.name,
                dimensions: config.dimensions,
                distanceMetric: config.distanceMetric,
                documentCount: 0,
            };
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        logger.error("POST /api/collections failed", error, { collection: data.name });

        // Check for duplicate collection error
        if (
            error instanceof Error &&
            error.message.toLowerCase().includes("already exists")
        ) {
            return NextResponse.json(
                {
                    code: "DUPLICATE_COLLECTION",
                    message: `Collection "${data.name}" already exists`,
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to create collection",
            },
            { status: 500 }
        );
    }
}
