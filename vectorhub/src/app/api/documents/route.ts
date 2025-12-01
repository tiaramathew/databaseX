import { NextResponse } from "next/server";
import { mockDbClient } from "@/lib/db/client";
import {
    addDocumentsSchema,
    deleteDocumentsSchema,
    validateRequestBody,
} from "@/lib/validations/api";
import { logger } from "@/lib/logger";
import type { VectorDocument } from "@/lib/db/adapters/base";

export async function POST(request: Request) {
    const validation = await validateRequestBody(request, addDocumentsSchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { collection, documents } = validation.data;

    try {
        // Ensure all documents have metadata defined
        const normalizedDocs: VectorDocument[] = documents.map((doc) => ({
            ...doc,
            metadata: doc.metadata ?? {},
        }));

        const ids = await mockDbClient.addDocuments(collection, normalizedDocs);
        return NextResponse.json({ ids }, { status: 201 });
    } catch (error) {
        logger.error("POST /api/documents failed", error, { collection, count: documents.length });

        // Check for collection not found
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
                message: "Failed to add documents",
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
        await mockDbClient.deleteDocuments(collection, ids);
        return NextResponse.json({ ok: true, deleted: ids.length });
    } catch (error) {
        logger.error("DELETE /api/documents failed", error, { collection, count: ids.length });

        // Check for collection not found
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
                message: "Failed to delete documents",
            },
            { status: 500 }
        );
    }
}
