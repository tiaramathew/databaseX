import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { ConnectionConfig, MongoDBAtlasConfig } from "@/types/connections";
import {
    addDocumentsSchema,
    deleteDocumentsSchema,
    validateRequestBody,
} from "@/lib/validations/api";
import { logger } from "@/lib/logger";
import type { VectorDocument } from "@/lib/db/adapters/base";

// Get connection config from request headers
function getConnectionConfig(request: Request): ConnectionConfig | null {
    const configHeader = request.headers.get("x-connection-config");
    if (!configHeader) {
        return null;
    }
    try {
        return JSON.parse(configHeader) as ConnectionConfig;
    } catch {
        return null;
    }
}

// Add documents to MongoDB
async function addMongoDBDocuments(
    config: MongoDBAtlasConfig,
    collection: string,
    documents: VectorDocument[]
): Promise<string[]> {
    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        const db = client.db(config.database);
        const col = db.collection(collection);

        const docs = documents.map((doc) => ({
            _id: doc.id && ObjectId.isValid(doc.id) ? new ObjectId(doc.id) : new ObjectId(),
            content: doc.content,
            embedding: doc.embedding,
            metadata: doc.metadata || {},
            createdAt: new Date(),
        }));

        const result = await col.insertMany(docs);
        return Object.values(result.insertedIds).map((id) => id.toHexString());
    } finally {
        await client.close();
    }
}

// Delete documents from MongoDB
async function deleteMongoDBDocuments(
    config: MongoDBAtlasConfig,
    collection: string,
    ids: string[]
): Promise<number> {
    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        const db = client.db(config.database);
        const col = db.collection(collection);

        const objectIds = ids.map((id) => {
            try {
                return new ObjectId(id);
            } catch {
                return id; // Keep as string if not valid ObjectId
            }
        });

        const result = await col.deleteMany({
            $or: [
                { _id: { $in: objectIds as any[] } },
                { id: { $in: ids } },
            ],
        });

        return result.deletedCount;
    } finally {
        await client.close();
    }
}

// List documents from MongoDB
async function listMongoDBDocuments(
    config: MongoDBAtlasConfig,
    collection: string,
    limit = 100,
    skip = 0
): Promise<VectorDocument[]> {
    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        const db = client.db(config.database);
        const col = db.collection(collection);

        const docs = await col
            .find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        return docs.map((doc) => ({
            id: doc._id.toHexString(),
            content: doc.content || "",
            embedding: doc.embedding,
            metadata: {
                ...doc.metadata,
                source: doc.metadata?.source || doc.content?.substring(0, 50) || "Document",
                created_at: doc.createdAt || new Date(),
            },
        }));
    } finally {
        await client.close();
    }
}

export async function GET(request: Request) {
    try {
        const connectionConfig = getConnectionConfig(request);
        const { searchParams } = new URL(request.url);
        const collection = searchParams.get("collection");
        const limit = parseInt(searchParams.get("limit") || "100");
        const skip = parseInt(searchParams.get("skip") || "0");

        if (!collection) {
            return NextResponse.json(
                { code: "VALIDATION_ERROR", message: "Collection name is required" },
                { status: 400 }
            );
        }

        if (!connectionConfig) {
            return NextResponse.json(
                { code: "NO_CONNECTION", message: "No connection configuration provided" },
                { status: 400 }
            );
        }

        if (connectionConfig.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const documents = await listMongoDBDocuments(mongoConfig, collection, limit, skip);
            return NextResponse.json(documents);
        }

        // For other types, return empty array
        return NextResponse.json([]);
    } catch (error) {
        logger.error("GET /api/documents failed", error);
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to list documents",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const validation = await validateRequestBody(request, addDocumentsSchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { collection, documents } = validation.data;

    try {
        const connectionConfig = getConnectionConfig(request);

        // Ensure all documents have metadata defined
        const normalizedDocs: VectorDocument[] = documents.map((doc) => ({
            ...doc,
            metadata: doc.metadata ?? {},
        }));

        if (connectionConfig?.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const ids = await addMongoDBDocuments(mongoConfig, collection, normalizedDocs);
            return NextResponse.json({ ids }, { status: 201 });
        }

        // For other types or no config, return mock IDs
        const ids = normalizedDocs.map((doc) => doc.id || crypto.randomUUID());
        return NextResponse.json({ ids }, { status: 201 });
    } catch (error) {
        logger.error("POST /api/documents failed", error, { collection, count: documents.length });

        if (
            error instanceof Error &&
            error.message.toLowerCase().includes("not found")
        ) {
            return NextResponse.json(
                {
                    code: "COLLECTION_NOT_FOUND",
                    message: `Collection "${collection}" does not exist`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to add documents",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    const validation = await validateRequestBody(request, deleteDocumentsSchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { collection, ids } = validation.data;

    try {
        const connectionConfig = getConnectionConfig(request);

        if (connectionConfig?.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const deletedCount = await deleteMongoDBDocuments(mongoConfig, collection, ids);
            return NextResponse.json({ ok: true, deleted: deletedCount });
        }

        // For other types, return success
        return NextResponse.json({ ok: true, deleted: ids.length });
    } catch (error) {
        logger.error("DELETE /api/documents failed", error, { collection, count: ids.length });

        if (
            error instanceof Error &&
            error.message.toLowerCase().includes("not found")
        ) {
            return NextResponse.json(
                {
                    code: "COLLECTION_NOT_FOUND",
                    message: `Collection "${collection}" does not exist`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to delete documents",
            },
            { status: 500 }
        );
    }
}
