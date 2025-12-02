import { MongoClient } from "mongodb";
import { MongoDBAtlasConfig } from "@/types/connections";
import type { SearchResult } from "@/lib/db/adapters/base";

// Vector search in MongoDB Atlas
export async function searchMongoDBVectors(
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
export async function searchMongoDBText(
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
