import { NextResponse } from "next/server";
import { MongoDBAtlasConfig } from "@/types/connections";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/embeddings";
import { searchMongoDBVectors, searchMongoDBText } from "@/app/api/search/route";
import type { SearchQuery, SearchResult } from "@/lib/db/adapters/base";

const EXPECTED_EMBEDDING_DIMENSIONS = 1536;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, config, collectionName, query } = body;

        if (type !== "mongodb_atlas" || !config || !collectionName || !query) {
            return NextResponse.json(
                { message: "Invalid request parameters" },
                { status: 400 }
            );
        }

        const mongoConfig = config as MongoDBAtlasConfig;
        const searchQuery = query as SearchQuery;
        const expectedDimensions = mongoConfig.dimensions || EXPECTED_EMBEDDING_DIMENSIONS;
        let results: SearchResult[] = [];

        if (searchQuery.vector) {
            logger.info(`Received vector query via adapter. Dimensions: ${searchQuery.vector.length}, Expected: ${expectedDimensions}`);
            
            if (searchQuery.vector.length !== expectedDimensions) {
                logger.warn(`Vector dimension mismatch in adapter: received ${searchQuery.vector.length}, expected ${expectedDimensions}`);
                
                if (searchQuery.text && searchQuery.text.trim()) {
                    try {
                        const regeneratedVector = await generateEmbedding(searchQuery.text);
                        logger.info(`Regenerated embedding with correct dimensions: ${regeneratedVector.length}`);
                        results = await searchMongoDBVectors(
                            mongoConfig,
                            collectionName,
                            regeneratedVector,
                            searchQuery.topK || 10,
                            searchQuery.minScore || 0.5
                        );
                    } catch (embeddingError) {
                        logger.error("Failed to regenerate embedding in adapter", embeddingError);
                        return NextResponse.json(
                            {
                                code: "DIMENSION_MISMATCH",
                                message: `Vector dimension mismatch: your query has ${searchQuery.vector.length} dimensions but the index expects ${expectedDimensions} dimensions. Please use 'text-embedding-3-small' with dimensions=1536 for queries.`,
                            },
                            { status: 400 }
                        );
                    }
                } else {
                    return NextResponse.json(
                        {
                            code: "DIMENSION_MISMATCH",
                            message: `Vector dimension mismatch: your query has ${searchQuery.vector.length} dimensions but the index expects ${expectedDimensions} dimensions. Please use 'text-embedding-3-small' with dimensions=1536 for queries.`,
                        },
                        { status: 400 }
                    );
                }
            } else {
                results = await searchMongoDBVectors(
                    mongoConfig,
                    collectionName,
                    searchQuery.vector,
                    searchQuery.topK || 10,
                    searchQuery.minScore || 0.5
                );
            }
        } else if (searchQuery.text && searchQuery.text.trim()) {
            try {
                const vector = await generateEmbedding(searchQuery.text);
                logger.info(`Generated embedding for adapter search. Dimensions: ${vector.length}`);
                results = await searchMongoDBVectors(
                    mongoConfig,
                    collectionName,
                    vector,
                    searchQuery.topK || 10,
                    searchQuery.minScore || 0.5
                );
            } catch (err) {
                logger.warn("Failed to generate embedding for adapter search, falling back to text search", { error: err });
                results = await searchMongoDBText(
                    mongoConfig,
                    collectionName,
                    searchQuery.text,
                    searchQuery.topK || 10
                );
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        logger.error("POST /api/db/search failed", error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Search failed" },
            { status: 500 }
        );
    }
}
