import { NextResponse } from "next/server";
import type { VectorDocument } from "@/lib/db/adapters/base";

interface SyncRequest {
    connectionId: string;
    collection: string;
    documents: VectorDocument[];
    connectionConfig?: {
        type: "webhook" | "mcp";
        config: Record<string, unknown>;
    };
}

export async function POST(request: Request) {
    try {
        const body: SyncRequest = await request.json();
        const { connectionId, collection, documents, connectionConfig } = body;

        if (!connectionId || !collection || !documents) {
            return NextResponse.json(
                { error: "Missing required fields: connectionId, collection, documents" },
                { status: 400 }
            );
        }

        const syncedIds = documents.map((doc) => doc.id || crypto.randomUUID());

        const response = {
            success: true,
            syncedCount: documents.length,
            syncedIds,
            connectionId,
            collection,
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Sync error:", error);
        return NextResponse.json(
            { error: "Failed to sync documents" },
            { status: 500 }
        );
    }
}
