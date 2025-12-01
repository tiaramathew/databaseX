import { MockAdapter } from "./adapters/mock-adapter";
import { WebhookAdapter } from "./adapters/webhook-adapter";
import { MCPAdapter } from "./adapters/mcp-adapter";
import { MongoDBAdapter } from "./adapters/mongodb-adapter";
import { SupabaseAdapter } from "./adapters/supabase-adapter";
import type {
    VectorDBAdapter,
    CreateCollectionConfig,
    VectorDocument,
    SearchQuery,
    SearchResult,
    CollectionInfo,
    DatabaseInfo,
    CollectionStats,
    UpdateCollectionConfig,
} from "./adapters/base";
import type { ConnectionConfig, VectorDBType } from "@/types/connections";

function createAdapter(type: VectorDBType): VectorDBAdapter {
    switch (type) {
        case "webhook":
            return new WebhookAdapter();
        case "mcp":
            return new MCPAdapter();
        case "mongodb_atlas":
            return new MongoDBAdapter();
        case "supabase":
            return new SupabaseAdapter();
        default:
            return new MockAdapter();
    }
}

export class VectorDBClient {
    private adapter: VectorDBAdapter;

    constructor(config?: ConnectionConfig) {
        if (config) {
            this.adapter = createAdapter(config.type);
            // Initialize connection immediately if config provided
            this.adapter.connect(config).catch(console.error);
        } else {
            this.adapter = new MockAdapter();
        }
    }

    // Proxy methods to the active adapter

    async connect(config: ConnectionConfig): Promise<void> {
        this.adapter = createAdapter(config.type);
        await this.adapter.connect(config);
    }

    async disconnect(): Promise<void> {
        await this.adapter.disconnect();
    }

    getConnectionStatus() {
        return this.adapter.getConnectionStatus();
    }

    async testConnection() {
        return this.adapter.testConnection();
    }

    listDatabases(): Promise<DatabaseInfo[]> {
        return this.adapter.listDatabases?.() ?? Promise.resolve([]);
    }

    listCollections(): Promise<CollectionInfo[]> {
        return this.adapter.listCollections();
    }

    createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        return this.adapter.createCollection(config);
    }

    getCollection(name: string): Promise<CollectionInfo> {
        return this.adapter.getCollection(name);
    }

    updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        return this.adapter.updateCollection(name, updates);
    }

    deleteCollection(name: string, cascade?: boolean): Promise<void> {
        return this.adapter.deleteCollection(name, cascade);
    }

    getCollectionStats(name: string): Promise<CollectionStats> {
        return this.adapter.getCollectionStats(name);
    }

    addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        return this.adapter.addDocuments(collection, documents);
    }

    deleteDocuments(collection: string, ids: string[]): Promise<void> {
        return this.adapter.deleteDocuments(collection, ids);
    }

    search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        return this.adapter.search(collection, query);
    }
}

export const dbClient = new VectorDBClient();
export const mockDbClient = dbClient;
