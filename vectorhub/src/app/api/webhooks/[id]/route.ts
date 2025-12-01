import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
    deleteWebhookConnection,
    getWebhookConnection,
    updateWebhookConnection,
    getWebhookSecret,
} from "@/lib/webhooks/store";
import { testWebhook } from "@/lib/webhooks/delivery";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const { id } = await params;

    try {
        const connection = await getWebhookConnection(id);

        if (!connection) {
            return NextResponse.json(
                {
                    code: "NOT_FOUND",
                    message: `Webhook with id "${id}" was not found`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(connection);
    } catch (error) {
        logger.error("GET /api/webhooks/[id] failed", error as Error, { id });
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to load webhook",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request, { params }: RouteParams) {
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    try {
        const connection = await getWebhookConnection(id);

        if (!connection) {
            return NextResponse.json(
                {
                    code: "NOT_FOUND",
                    message: `Webhook with id "${id}" was not found`,
                },
                { status: 404 }
            );
        }

        // Handle test action
        if (action === "test") {
            const secret = getWebhookSecret();
            const result = await testWebhook(connection, secret);

            // Update last delivery time if successful
            if (result.success) {
                await updateWebhookConnection(id, {
                    lastDelivery: new Date(),
                    status: "connected",
                });
            } else {
                await updateWebhookConnection(id, {
                    status: "error",
                });
            }

            return NextResponse.json({
                success: result.success,
                statusCode: result.statusCode,
                error: result.error,
                duration: result.duration,
            });
        }

        return NextResponse.json(
            {
                code: "INVALID_ACTION",
                message: "Invalid action. Supported actions: test",
            },
            { status: 400 }
        );
    } catch (error) {
        logger.error("POST /api/webhooks/[id] failed", error as Error, { id, action });
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to process webhook action",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const { id } = await params;

    try {
        const deleted = await deleteWebhookConnection(id);

        if (!deleted) {
            return NextResponse.json(
                {
                    code: "NOT_FOUND",
                    message: `Webhook with id "${id}" was not found`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error("DELETE /api/webhooks/[id] failed", error as Error, { id });
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to delete webhook",
            },
            { status: 500 }
        );
    }
}
