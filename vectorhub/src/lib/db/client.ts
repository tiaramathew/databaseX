import { MockAdapter } from "./adapters/mock-adapter";
import { WebhookAdapter } from "./adapters/webhook-adapter";
import { MCPAdapter } from "./adapters/mcp-adapter";
import type {
    VectorDBAdapter,
    CreateCollectionConfig,
    VectorDocument,
    SearchQuery,
    SearchResult,
    CollectionInfo,
    DatabaseInfo,
    CollectionStats,
} from "./adapters/base";
import type { ConnectionConfig, VectorDBType } from "@/types/connections";

function createAdapter(type: VectorDBType): VectorDBAdapter {
    switch (type) {
        case "webhook":
            return new WebhookAdapter();
        case "mcp":
            return new MCPAdapter();
        default:
            return new MockAdapter();
    }
}

class VectorDBClient {
    private adapters: Map<string, VectorDBAdapter> = new Map();
    private activeConnectionId: string | null = null;
    private mockAdapter = new MockAdapter();

    private getActiveAdapter(): VectorDBAdapter {
        if (this.activeConnectionId) {
            const adapter = this.adapters.get(this.activeConnectionId);
            if (adapter) return adapter;
        }
        return this.mockAdapter;
    }

    async connect(config: ConnectionConfig): Promise<void> {
        const adapter = createAdapter(config.type);
        await adapter.connect(config);
        this.adapters.set(config.id, adapter);
        this.activeConnectionId = config.id;
    }

    async disconnect(connectionId?: string): Promise<void> {
        const id = connectionId || this.activeConnectionId;
        if (!id) return;

        const adapter = this.adapters.get(id);
        if (adapter) {
            await adapter.disconnect();
            this.adapters.delete(id);
        }

        if (this.activeConnectionId === id) {
            this.activeConnectionId = null;
        }
    }

    setActiveConnection(connectionId: string | null): void {
        this.activeConnectionId = connectionId;
    }

    getActiveConnectionId(): string | null {
        return this.activeConnectionId;
    }

    getConnectionStatus(connectionId?: string) {
        const id = connectionId || this.activeConnectionId;
        if (!id) return this.mockAdapter.getConnectionStatus();

        const adapter = this.adapters.get(id);
        return adapter?.getConnectionStatus() || "disconnected";
    }

    async testConnection(connectionId?: string) {
        const id = connectionId || this.activeConnectionId;
        if (!id) return this.mockAdapter.testConnection();

        const adapter = this.adapters.get(id);
        return adapter?.testConnection() || { success: false, message: "No adapter found" };
    }

    listDatabases(): Promise<DatabaseInfo[]> {
        const adapter = this.getActiveAdapter();
        return adapter.listDatabases?.() ?? Promise.resolve([]);
    }

    listCollections(): Promise<CollectionInfo[]> {
        return this.getActiveAdapter().listCollections();
    }

    createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        return this.getActiveAdapter().createCollection(config);
    }

    deleteCollection(name: string, cascade?: boolean): Promise<void> {
        return this.getActiveAdapter().deleteCollection(name, cascade);
    }

    getCollectionStats(name: string): Promise<CollectionStats> {
        return this.getActiveAdapter().getCollectionStats(name);
    }

    addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        return this.getActiveAdapter().addDocuments(collection, documents);
    }

    async addDocumentsToAllConnections(
        collection: string,
        documents: VectorDocument[],
        connectionIds?: string[]
    ): Promise<Map<string, string[] | Error>> {
        const results = new Map<string, string[] | Error>();
        const targetIds = connectionIds || Array.from(this.adapters.keys());

        await Promise.all(
            targetIds.map(async (id) => {
                const adapter = this.adapters.get(id);
                if (adapter) {
                    try {
                        const ids = await adapter.addDocuments(collection, documents);
                        results.set(id, ids);
                    } catch (error) {
                        results.set(id, error as Error);
                    }
                }
            })
        );

        return results;
    }

    deleteDocuments(collection: string, ids: string[]): Promise<void> {
        return this.getActiveAdapter().deleteDocuments(collection, ids);
    }

    async deleteDocumentsFromAllConnections(
        collection: string,
        ids: string[],
        connectionIds?: string[]
    ): Promise<Map<string, void | Error>> {
        const results = new Map<string, void | Error>();
        const targetIds = connectionIds || Array.from(this.adapters.keys());

        await Promise.all(
            targetIds.map(async (id) => {
                const adapter = this.adapters.get(id);
                if (adapter) {
                    try {
                        await adapter.deleteDocuments(collection, ids);
                        results.set(id, undefined);
                    } catch (error) {
                        results.set(id, error as Error);
                    }
                }
            })
        );

        return results;
    }

    search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        return this.getActiveAdapter().search(collection, query);
    }

    getConnectedAdapterIds(): string[] {
        return Array.from(this.adapters.keys());
    }

    isConnected(connectionId: string): boolean {
        return this.adapters.has(connectionId);
    }
}

export const dbClient = new VectorDBClient();

export const mockDbClient = dbClient;
