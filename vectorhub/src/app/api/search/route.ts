import { NextResponse } from "next/server";
import { ConnectionConfig, MongoDBAtlasConfig } from "@/types/connections";
import { searchQuerySchema, validateRequestBody } from "@/lib/validations/api";
import { logger } from "@/lib/logger";
import type { SearchResult } from "@/lib/db/adapters/base";
import { generateEmbedding } from "@/lib/embeddings";
import { searchMongoDBVectors, searchMongoDBText } from "@/lib/db/mongodb-utils";

const EXPECTED_EMBEDDING_DIMENSIONS = 1536;

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
            const expectedDimensions = mongoConfig.dimensions || EXPECTED_EMBEDDING_DIMENSIONS;
            let results: SearchResult[];

            if (query.vector) {
                logger.info(`Received vector query. Dimensions: ${query.vector.length}, Expected: ${expectedDimensions}`);

                if (query.vector.length !== expectedDimensions) {
                    logger.warn(`Vector dimension mismatch: received ${query.vector.length}, expected ${expectedDimensions}. Attempting to regenerate embedding from text if available.`);

                    if (query.text && query.text.trim()) {
                        try {
                            const regeneratedVector = await generateEmbedding(query.text);
                            logger.info(`Regenerated embedding with correct dimensions: ${regeneratedVector.length}`);
                            results = await searchMongoDBVectors(
                                mongoConfig,
                                collection,
                                regeneratedVector,
                                query.topK || 10,
                                query.minScore || 0.5
                            );
                        } catch (embeddingError) {
                            logger.error("Failed to regenerate embedding", embeddingError);
                            return NextResponse.json(
                                {
                                    code: "DIMENSION_MISMATCH",
                                    message: `Vector dimension mismatch: your query has ${query.vector.length} dimensions but the index expects ${expectedDimensions} dimensions. This usually happens when using different embedding models. Please use 'text-embedding-3-small' with dimensions=1536 for queries.`,
                                },
                                { status: 400 }
                            );
                        }
                    } else {
                        return NextResponse.json(
                            {
                                code: "DIMENSION_MISMATCH",
                                message: `Vector dimension mismatch: your query has ${query.vector.length} dimensions but the index expects ${expectedDimensions} dimensions. This usually happens when using different embedding models. Please use 'text-embedding-3-small' with dimensions=1536 for queries.`,
                            },
                            { status: 400 }
                        );
                    }
                } else {
                    results = await searchMongoDBVectors(
                        mongoConfig,
                        collection,
                        query.vector,
                        query.topK || 10,
                        query.minScore || 0.5
                    );
                }
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
