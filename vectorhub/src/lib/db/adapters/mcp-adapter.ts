import { ConnectionConfig, MCPConfig } from "@/types/connections";
import {
    VectorDBAdapter,
    ConnectionStatus,
    TestConnectionResult,
    CreateCollectionConfig,
    CollectionInfo,
    CollectionStats,
    VectorDocument,
    SearchQuery,
    SearchResult,
    UpdateCollectionConfig,
    MetadataFilter,
} from "./base";

interface MCPRequest {
    jsonrpc: "2.0";
    id: string | number;
    method: string;
    params?: Record<string, unknown>;
}

interface MCPResponse<T = unknown> {
    jsonrpc: "2.0";
    id: string | number;
    result?: T;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

export class MCPAdapter implements VectorDBAdapter {
    type = "mcp" as const;
    private config: MCPConfig | null = null;
    private status: ConnectionStatus = "disconnected";
    private requestId = 0;

    private getNextId(): number {
        return ++this.requestId;
    }

    private async callMCP<T>(method: string, params?: Record<string, unknown>): Promise<T> {
        if (!this.config) {
            throw new Error("MCP not connected");
        }

        const request: MCPRequest = {
            jsonrpc: "2.0",
            id: this.getNextId(),
            method,
            params,
        };

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (this.config.authToken) {
            headers["Authorization"] = `Bearer ${this.config.authToken}`;
        }

        const response = await fetch(this.config.serverUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`MCP request failed: ${response.statusText}`);
        }

        const mcpResponse = (await response.json()) as MCPResponse<T>;

        if (mcpResponse.error) {
            throw new Error(`MCP error: ${mcpResponse.error.message}`);
        }

        return mcpResponse.result as T;
    }

    async connect(config: ConnectionConfig): Promise<void> {
        this.config = config.config as MCPConfig;
        console.log(`MCP connecting to ${this.config.serverUrl}...`);

        try {
            await this.callMCP("initialize", {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: this.config.capabilities,
                },
                clientInfo: {
                    name: "VectorHub",
                    version: "1.0.0",
                },
            });
            this.status = "connected";
        } catch (error) {
            this.status = "error";
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.status === "connected") {
            try {
                await this.callMCP("shutdown");
            } catch {
                // Ignore shutdown errors
            }
        }
        this.config = null;
        this.status = "disconnected";
    }

    async testConnection(): Promise<TestConnectionResult> {
        try {
            await this.callMCP("ping");
            return { success: true, message: "MCP connection successful" };
        } catch (error) {
            return { success: false, message: `Connection failed: ${(error as Error).message}` };
        }
    }

    getConnectionStatus(): ConnectionStatus {
        return this.status;
    }

    private checkCapability(capability: keyof MCPConfig["capabilities"]): void {
        if (!this.config?.capabilities[capability]) {
            throw new Error(`MCP server does not support ${capability}`);
        }
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        this.checkCapability("vectorCreate");
        return this.callMCP<CollectionInfo>("tools/call", {
            name: "vector_create_collection",
            arguments: config,
        });
    }

    async listCollections(): Promise<CollectionInfo[]> {
        try {
            return await this.callMCP<CollectionInfo[]>("tools/call", {
                name: "vector_list_collections",
            });
        } catch {
            return [];
        }
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        return this.callMCP<CollectionInfo>("tools/call", {
            name: "vector_get_collection",
            arguments: { name },
        });
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        this.checkCapability("vectorUpdate");
        await this.callMCP("tools/call", {
            name: "vector_update_collection",
            arguments: { name, ...updates },
        });
    }

    async deleteCollection(name: string, cascade?: boolean): Promise<void> {
        this.checkCapability("vectorDelete");
        await this.callMCP("tools/call", {
            name: "vector_delete_collection",
            arguments: { name, cascade },
        });
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        try {
            return await this.callMCP<CollectionStats>("tools/call", {
                name: "vector_collection_stats",
                arguments: { name },
            });
        } catch {
            return {
                vectorCount: 0,
                indexSize: 0,
                lastUpdated: new Date(),
            };
        }
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        this.checkCapability("vectorCreate");
        
        const result = await this.callMCP<{ ids: string[] }>("tools/call", {
            name: "vector_add_documents",
            arguments: {
                collection,
                documents,
                embeddingModel: this.config?.modelPreferences?.embeddingModel,
                dimensions: this.config?.modelPreferences?.dimensions,
            },
        });
        
        return result.ids || documents.map((_, i) => `mcp-doc-${Date.now()}-${i}`);
    }

    async getDocuments(collection: string, ids: string[]): Promise<VectorDocument[]> {
        return this.callMCP<VectorDocument[]>("tools/call", {
            name: "vector_get_documents",
            arguments: { collection, ids },
        });
    }

    async updateDocuments(collection: string, documents: Partial<VectorDocument>[]): Promise<void> {
        this.checkCapability("vectorUpdate");
        await this.callMCP("tools/call", {
            name: "vector_update_documents",
            arguments: { collection, documents },
        });
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        this.checkCapability("vectorDelete");
        await this.callMCP("tools/call", {
            name: "vector_delete_documents",
            arguments: { collection, ids },
        });
    }

    async countDocuments(collection: string, filter?: MetadataFilter): Promise<number> {
        try {
            const result = await this.callMCP<{ count: number }>("tools/call", {
                name: "vector_count_documents",
                arguments: { collection, filter },
            });
            return result.count || 0;
        } catch {
            return 0;
        }
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        this.checkCapability("vectorSearch");
        return this.callMCP<SearchResult[]>("tools/call", {
            name: "vector_search",
            arguments: { collection, ...query },
        });
    }
}
