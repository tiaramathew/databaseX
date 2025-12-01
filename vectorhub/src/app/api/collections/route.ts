import { NextResponse } from "next/server";
import { VectorDBClient } from "@/lib/db/client";
import { ConnectionConfig } from "@/types/connections";
import {
    createCollectionSchema,
    validateRequestBody,
} from "@/lib/validations/api";
import type { CreateCollectionConfig } from "@/lib/db/adapters/base";
import { logger } from "@/lib/logger";

const getClient = (request: Request) => {
    const configHeader = request.headers.get("x-connection-config");
    if (!configHeader) {
        throw new Error("Missing connection configuration");
    }
    try {
        const config = JSON.parse(configHeader) as ConnectionConfig;
        return new VectorDBClient(config);
    } catch (error) {
        throw new Error("Invalid connection configuration");
    }
};

export async function GET(request: Request) {
    try {
        const client = getClient(request);
        const collections = await client.listCollections();
        return NextResponse.json(collections);
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

export async function POST(request: Request) {
    const validation = await validateRequestBody(request, createCollectionSchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { data } = validation;

    try {
        const client = getClient(request);
        const config: CreateCollectionConfig = {
            name: data.name,
            description: data.description,
            dimensions: data.dimensions,
            distanceMetric: data.distanceMetric,
            indexType: data.indexType,
            indexOptions: data.indexOptions,
            metadataSchema: data.metadataSchema,
        };

        const created = await client.createCollection(config);

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
