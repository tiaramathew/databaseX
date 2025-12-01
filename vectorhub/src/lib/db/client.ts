import { MockAdapter } from "./adapters/mock-adapter";
import type {
    CreateCollectionConfig,
    VectorDocument,
    SearchQuery,
    SearchResult,
    CollectionInfo,
    DatabaseInfo,
    CollectionStats,
} from "./adapters/base";
import type { ConnectionConfig } from "@/types/connections";

// Simple singleton client around MockAdapter.
// In a real production setup this can be replaced with concrete adapters per-connection
// or routed through server-side API routes.
class MockDbClient {
    private adapter = new MockAdapter();

    // Connection lifecycle
    connect(config: ConnectionConfig) {
        return this.adapter.connect(config);
    }

    disconnect() {
        return this.adapter.disconnect();
    }

    getConnectionStatus() {
        return this.adapter.getConnectionStatus();
    }

    testConnection() {
        return this.adapter.testConnection();
    }

    // Database and collection APIs
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

    deleteCollection(name: string, cascade?: boolean): Promise<void> {
        return this.adapter.deleteCollection(name, cascade);
    }

    getCollectionStats(name: string): Promise<CollectionStats> {
        return this.adapter.getCollectionStats(name);
    }

    // Document APIs
    addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        return this.adapter.addDocuments(collection, documents);
    }

    deleteDocuments(collection: string, ids: string[]): Promise<void> {
        return this.adapter.deleteDocuments(collection, ids);
    }

    // Search API
    search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        return this.adapter.search(collection, query);
    }
}

export const mockDbClient = new MockDbClient();
