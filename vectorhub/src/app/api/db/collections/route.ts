import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, config } = body;

        if (type === "mongodb_atlas") {
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

                return NextResponse.json(collectionInfos);
            } finally {
                await client.close();
            }
        }

        if (type === "supabase") {
            // For Supabase, we'd use the Supabase client
            // For now, return empty array as placeholder
            return NextResponse.json([]);
        }

        return NextResponse.json([]);
    } catch (error) {
        console.error("Failed to list collections:", error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}

