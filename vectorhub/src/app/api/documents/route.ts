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
import { generateEmbedding } from "@/lib/embeddings";
import { splitText } from "@/lib/chunking";

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

    const { collection, documents, chunkSize, chunkOverlap } = validation.data;

    const customChunkSize = chunkSize || 1000;
    const customChunkOverlap = chunkOverlap || 200;

    try {
        const connectionConfig = getConnectionConfig(request);

        // Process documents: Chunking -> Embedding
        const processedDocs: VectorDocument[] = [];

        for (const doc of documents) {
            if (!doc.content) continue;

            // Split text into chunks only if chunkSize is provided
            let chunks: string[] = [];
            if (chunkSize) {
                chunks = splitText(doc.content, customChunkSize, customChunkOverlap);
            } else {
                // If no chunking options provided, treat as single chunk
                chunks = [doc.content];
            }

            // If splitting returned empty (shouldn't happen if content exists, but safe fallback)
            if (chunks.length === 0) {
                chunks.push(doc.content);
            }

            // Process each chunk
            for (let i = 0; i < chunks.length; i++) {
                const chunkContent = chunks[i];
                let embedding = doc.embedding; // Use provided embedding if exists (rare for chunks)

                // Generate embedding for the chunk
                if (!embedding) {
                    try {
                        embedding = await generateEmbedding(chunkContent);
                    } catch (err) {
                        logger.warn("Failed to generate embedding for chunk", { docId: doc.id, chunkIndex: i, error: err });
                        continue; // Skip failed chunks
                    }
                }

                processedDocs.push({
                    id: chunks.length > 1 ? `${doc.id || crypto.randomUUID()}_chunk_${i}` : (doc.id || crypto.randomUUID()),
                    content: chunkContent,
                    embedding,
                    metadata: {
                        ...(doc.metadata ?? {}),
                        parentDocumentId: doc.id,
                        chunkIndex: i,
                        totalChunks: chunks.length,
                        isChunk: chunks.length > 1,
                    },
                });
            }
        }

        if (connectionConfig?.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const ids = await addMongoDBDocuments(mongoConfig, collection, processedDocs);
            return NextResponse.json({ ids }, { status: 201 });
        }

        // For other types or no config, return mock IDs
        const ids = processedDocs.map((doc) => doc.id || crypto.randomUUID());
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
