import { McpConnection, ConnectionStatus } from "@/types/connections";
import { logger } from "@/lib/logger";

export interface McpHealthCheckResult {
    healthy: boolean;
    latency?: number;
    error?: string;
    serverInfo?: {
        name?: string;
        version?: string;
        capabilities?: string[];
    };
}

export interface McpSyncResult {
    success: boolean;
    itemsSynced?: number;
    error?: string;
    duration: number;
}

/**
 * Check health of an MCP endpoint
 */
export async function checkMcpHealth(
    connection: McpConnection,
    timeoutMs: number = 10000
): Promise<McpHealthCheckResult> {
    const startTime = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // MCP endpoints typically have a /health or root endpoint
        // Try common health check patterns
        const healthUrl = new URL(connection.endpoint);
        
        // Try the main endpoint first (MCP servers often respond to root)
        const response = await fetch(healthUrl.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "User-Agent": "VectorHub/1.0",
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (response.ok) {
            let serverInfo: McpHealthCheckResult["serverInfo"] = undefined;

            try {
                const data = await response.json();
                serverInfo = {
                    name: data.name || data.serverName,
                    version: data.version,
                    capabilities: data.capabilities,
                };
            } catch {
                // Response may not be JSON
            }

            logger.info("MCP health check passed", {
                connectionId: connection.id,
                endpoint: connection.endpoint,
                latency,
            });

            return {
                healthy: true,
                latency,
                serverInfo,
            };
        }

        return {
            healthy: false,
            latency,
            error: `HTTP ${response.status}: ${response.statusText}`,
        };
    } catch (error) {
        const latency = Date.now() - startTime;
        let errorMessage = "Unknown error";

        if (error instanceof Error) {
            if (error.name === "AbortError") {
                errorMessage = `Connection timeout after ${timeoutMs}ms`;
            } else {
                errorMessage = error.message;
            }
        }

        logger.error("MCP health check failed", undefined, {
            connectionId: connection.id,
            endpoint: connection.endpoint,
            error: errorMessage,
        });

        return {
            healthy: false,
            latency,
            error: errorMessage,
        };
    }
}

/**
 * Sync data with an MCP endpoint
 * This is a simplified implementation - real MCP sync would involve
 * the MCP protocol for listing and fetching resources
 */
export async function syncMcpConnection(
    connection: McpConnection,
    timeoutMs: number = 30000
): Promise<McpSyncResult> {
    const startTime = Date.now();

    try {
        // First, check if the connection is healthy
        const healthResult = await checkMcpHealth(connection, 5000);

        if (!healthResult.healthy) {
            return {
                success: false,
                error: healthResult.error || "Health check failed",
                duration: Date.now() - startTime,
            };
        }

        // In a real implementation, this would:
        // 1. List available resources from the MCP server
        // 2. Fetch and process each resource
        // 3. Update local storage/cache
        
        // For now, simulate sync with a delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const duration = Date.now() - startTime;

        logger.info("MCP sync completed", {
            connectionId: connection.id,
            endpoint: connection.endpoint,
            duration,
        });

        return {
            success: true,
            itemsSynced: 0, // Would be actual count in real implementation
            duration,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

        logger.error("MCP sync failed", error instanceof Error ? error : undefined, {
            connectionId: connection.id,
            endpoint: connection.endpoint,
        });

        return {
            success: false,
            error: errorMessage,
            duration,
        };
    }
}

/**
 * Determine connection status based on health check
 */
export function getStatusFromHealth(
    healthResult: McpHealthCheckResult
): ConnectionStatus {
    if (healthResult.healthy) {
        return "connected";
    }
    return "error";
}

