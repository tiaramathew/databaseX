import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { ConnectionConfig, MongoDBAtlasConfig } from "@/types/connections";
import { searchQuerySchema, validateRequestBody } from "@/lib/validations/api";
import { logger } from "@/lib/logger";
import type { SearchResult } from "@/lib/db/adapters/base";
import { generateEmbedding } from "@/lib/embeddings";

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

// Vector search in MongoDB Atlas
async function searchMongoDBVectors(
    config: MongoDBAtlasConfig,
    collection: string,
    vector: number[],
    topK: number,
    minScore: number
): Promise<SearchResult[]> {
    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        const db = client.db(config.database);
        const col = db.collection(collection);

        // Use MongoDB Atlas Vector Search
        const pipeline = [
            {
                $vectorSearch: {
                    index: config.vectorSearchIndexName || "vector_index",
                    path: config.embeddingField || "embedding",
                    queryVector: vector,
                    numCandidates: topK * 10,
                    limit: topK,
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    metadata: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
            {
                $match: {
                    score: { $gte: minScore },
                },
            },
        ];

        const results = await col.aggregate(pipeline).toArray();

        return results.map((doc) => ({
            id: doc._id.toHexString(),
            score: doc.score,
            content: doc.content,
            metadata: doc.metadata,
        }));
    } finally {
        await client.close();
    }
}

// Text search in MongoDB (fallback when no vector provided)
async function searchMongoDBText(
    config: MongoDBAtlasConfig,
    collection: string,
    text: string,
    topK: number
): Promise<SearchResult[]> {
    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        const db = client.db(config.database);
        const col = db.collection(collection);

        // Try text search first, fall back to regex
        let results;
        try {
            results = await col
                .find({ $text: { $search: text } })
                .project({ score: { $meta: "textScore" }, content: 1, metadata: 1 })
                .sort({ score: { $meta: "textScore" } })
                .limit(topK)
                .toArray();
        } catch {
            // Fallback to regex search if text index doesn't exist
            const regex = new RegExp(text.split(/\s+/).join("|"), "i");
            results = await col
                .find({
                    $or: [
                        { content: { $regex: regex } },
                        { "metadata.source": { $regex: regex } },
                        { "metadata.title": { $regex: regex } },
                    ],
                })
                .limit(topK)
                .toArray();
        }

        return results.map((doc, i) => ({
            id: doc._id.toHexString(),
            score: doc.score || 1 - i * 0.1,
            content: doc.content,
            metadata: doc.metadata,
        }));
    } finally {
        await client.close();
    }
}

export async function POST(request: Request) {
    const validation = await validateRequestBody(request, searchQuerySchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { collection, query } = validation.data;

    // Ensure at least one search method is provided
    if (!query.vector && !query.text) {
        return NextResponse.json(
            {
                code: "VALIDATION_ERROR",
                message: "Either 'vector' or 'text' must be provided for search",
            },
            { status: 400 }
        );
    }

    try {
        const connectionConfig = getConnectionConfig(request);

        if (connectionConfig?.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            let results: SearchResult[];

            if (query.vector) {
                logger.info(`Received vector query. Dimensions: ${query.vector.length}`);
                results = await searchMongoDBVectors(
                    mongoConfig,
                    collection,
                    query.vector,
                    query.topK || 10,
                    query.minScore || 0.5
                );
            } else if (query.text && query.text.trim()) {
                // Generate embedding for text query if vector is not provided
                try {
                    const vector = await generateEmbedding(query.text);
                    logger.info(`Generated embedding for search query. Dimensions: ${vector.length}`);
                    results = await searchMongoDBVectors(
                        mongoConfig,
                        collection,
                        vector,
                        query.topK || 10,
                        query.minScore || 0.5
                    );
                } catch (err) {
                    logger.warn("Failed to generate embedding for search query, falling back to text search", { error: err });
                    results = await searchMongoDBText(
                        mongoConfig,
                        collection,
                        query.text,
                        query.topK || 10
                    );
                }
            } else {
                results = [];
            }

            return NextResponse.json(results);
        }

        // For other types or no config, return empty results
        return NextResponse.json([]);
    } catch (error) {
        logger.error("POST /api/search failed", error, {
            collection,
            hasVector: !!query.vector,
            hasText: !!query.text,
        });

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
                message: error instanceof Error ? error.message : "Failed to execute search",
            },
            { status: 500 }
        );
    }
}
