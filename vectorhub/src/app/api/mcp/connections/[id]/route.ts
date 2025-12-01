import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
    deleteMcpConnection,
    getMcpConnection,
    updateMcpConnection,
} from "@/lib/mcp/store";
import {
    checkMcpHealth,
    syncMcpConnection,
    getStatusFromHealth,
} from "@/lib/mcp/client";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const { id } = await params;

    try {
        const connection = await getMcpConnection(id);

        if (!connection) {
            return NextResponse.json(
                {
                    code: "NOT_FOUND",
                    message: `MCP connection with id "${id}" was not found`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json(connection);
    } catch (error) {
        logger.error("GET /api/mcp/connections/[id] failed", error as Error, { id });
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to load MCP connection",
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
        const connection = await getMcpConnection(id);

        if (!connection) {
            return NextResponse.json(
                {
                    code: "NOT_FOUND",
                    message: `MCP connection with id "${id}" was not found`,
                },
                { status: 404 }
            );
        }

        // Handle health check action
        if (action === "health") {
            const result = await checkMcpHealth(connection);
            const newStatus = getStatusFromHealth(result);

            // Update connection status
            await updateMcpConnection(id, { status: newStatus });

            return NextResponse.json({
                healthy: result.healthy,
                latency: result.latency,
                error: result.error,
                serverInfo: result.serverInfo,
            });
        }

        // Handle sync action
        if (action === "sync") {
            const result = await syncMcpConnection(connection);

            // Update connection on success
            if (result.success) {
                await updateMcpConnection(id, {
                    lastSync: new Date(),
                    status: "connected",
                });
            } else {
                await updateMcpConnection(id, {
                    status: "error",
                });
            }

            return NextResponse.json({
                success: result.success,
                itemsSynced: result.itemsSynced,
                error: result.error,
                duration: result.duration,
            });
        }

        return NextResponse.json(
            {
                code: "INVALID_ACTION",
                message: "Invalid action. Supported actions: health, sync",
            },
            { status: 400 }
        );
    } catch (error) {
        logger.error("POST /api/mcp/connections/[id] failed", error as Error, {
            id,
            action,
        });
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to process MCP action",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const { id } = await params;

    try {
        const deleted = await deleteMcpConnection(id);

        if (!deleted) {
            return NextResponse.json(
                {
                    code: "NOT_FOUND",
                    message: `MCP connection with id "${id}" was not found`,
                },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error("DELETE /api/mcp/connections/[id] failed", error as Error, { id });
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to delete MCP connection",
            },
            { status: 500 }
        );
    }
}
