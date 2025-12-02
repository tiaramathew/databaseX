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
            throw new Error(`Unsupported adapter type: ${type}`);
    }
}

export class VectorDBClient {
    private adapter: VectorDBAdapter | null = null;
    private connectionPromise: Promise<void> | null = null;
    private config: ConnectionConfig | null = null;

    constructor(config?: ConnectionConfig) {
        if (config) {
            this.config = config;
            this.adapter = createAdapter(config.type);
            // Start connection - will be awaited in ensureConnected
            this.connectionPromise = this.adapter.connect(config);
        }
    }

    // Ensure connection is established before operations
    private async ensureConnected(): Promise<void> {
        if (!this.adapter) {
            throw new Error("Database client not initialized. Please connect first.");
        }
        if (this.connectionPromise) {
            await this.connectionPromise;
            this.connectionPromise = null;
        }
    }

    // Proxy methods to the active adapter

    async connect(config: ConnectionConfig): Promise<void> {
        this.config = config;
        this.adapter = createAdapter(config.type);
        await this.adapter.connect(config);
    }

    async disconnect(): Promise<void> {
        if (this.adapter) {
            await this.adapter.disconnect();
        }
    }

    getConnectionStatus() {
        return this.adapter?.getConnectionStatus() ?? { connected: false };
    }

    async testConnection() {
        await this.ensureConnected();
        return this.adapter!.testConnection();
    }

    async listDatabases(): Promise<DatabaseInfo[]> {
        await this.ensureConnected();
        return this.adapter!.listDatabases?.() ?? Promise.resolve([]);
    }

    async listCollections(): Promise<CollectionInfo[]> {
        await this.ensureConnected();
        return this.adapter!.listCollections();
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        await this.ensureConnected();
        return this.adapter!.createCollection(config);
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        await this.ensureConnected();
        return this.adapter!.getCollection(name);
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        await this.ensureConnected();
        return this.adapter!.updateCollection(name, updates);
    }

    async deleteCollection(name: string, cascade?: boolean): Promise<void> {
        await this.ensureConnected();
        return this.adapter!.deleteCollection(name, cascade);
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        await this.ensureConnected();
        return this.adapter!.getCollectionStats(name);
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        await this.ensureConnected();
        return this.adapter!.addDocuments(collection, documents);
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        await this.ensureConnected();
        return this.adapter!.deleteDocuments(collection, ids);
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        await this.ensureConnected();
        return this.adapter!.search(collection, query);
    }
}

export const dbClient = new VectorDBClient();
