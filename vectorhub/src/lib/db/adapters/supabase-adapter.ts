import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ConnectionConfig, SupabaseConfig } from "@/types/connections";
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

export class SupabaseAdapter implements VectorDBAdapter {
    type = "supabase" as const;
    private client: SupabaseClient | null = null;
    private config: SupabaseConfig | null = null;
    private status: ConnectionStatus = "disconnected";

    async connect(config: ConnectionConfig): Promise<void> {
        this.config = config.config as SupabaseConfig;
        try {
            this.client = createClient(this.config.projectUrl, this.config.anonKey);
            this.status = "connected";
        } catch (error) {
            this.status = "error";
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.client = null;
        this.status = "disconnected";
    }

    async testConnection(): Promise<TestConnectionResult> {
        try {
            if (!this.client) {
                return { success: false, message: "Client not initialized" };
            }
            // Simple query to test connection
            const { error } = await this.client.from("information_schema.tables").select("table_name").limit(1);
            if (error) throw error;
            return { success: true, message: "Supabase connection successful" };
        } catch (error) {
            return { success: false, message: `Connection failed: ${(error as Error).message}` };
        }
    }

    getConnectionStatus(): ConnectionStatus {
        return this.status;
    }

    async listCollections(): Promise<CollectionInfo[]> {
        if (!this.client) throw new Error("Not connected");

        // Query information_schema to find tables with vector columns
        const { data, error } = await this.client.rpc('list_vector_tables');

        if (error) {
            // Fallback: try to list all tables if RPC doesn't exist, though strictly we want vector tables
            // For now, let's return empty or handle error gracefully
            console.warn("Failed to list collections via RPC", error);
            return [];
        }

        return (data as any[]).map(row => ({
            name: row.table_name,
            dimensions: 1536, // Default or inferred
            distanceMetric: "cosine",
            documentCount: row.row_count || 0,
        }));
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        if (!this.client) throw new Error("Not connected");

        // Create table via SQL (requires appropriate permissions or RPC)
        // This is complex in Supabase-js client without direct SQL execution
        // We might need to assume the table exists or use an RPC
        throw new Error("Create collection not fully supported via client-side JS yet. Please create table in Supabase dashboard.");
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        if (!this.client) throw new Error("Not connected");
        return {
            name,
            dimensions: 1536,
            distanceMetric: "cosine",
            documentCount: 0,
        };
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        // No-op for now
    }

    async deleteCollection(name: string): Promise<void> {
        if (!this.client) throw new Error("Not connected");
        // Requires RPC to drop table
        const { error } = await this.client.rpc('drop_table', { table_name: name });
        if (error) throw error;
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        if (!this.client) throw new Error("Not connected");
        const { count, error } = await this.client.from(name).select('*', { count: 'exact', head: true });
        if (error) throw error;
        return {
            vectorCount: count || 0,
            indexSize: 0,
            lastUpdated: new Date(),
        };
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        if (!this.client) throw new Error("Not connected");
        const { data, error } = await this.client.from(collection).insert(documents).select('id');
        if (error) throw error;
        return (data as any[]).map(d => d.id);
    }

    async getDocuments(collection: string, ids: string[]): Promise<VectorDocument[]> {
        if (!this.client) throw new Error("Not connected");
        const { data, error } = await this.client.from(collection).select('*').in('id', ids);
        if (error) throw error;
        return data as VectorDocument[];
    }

    async updateDocuments(collection: string, documents: Partial<VectorDocument>[]): Promise<void> {
        if (!this.client) throw new Error("Not connected");
        for (const doc of documents) {
            if (!doc.id) continue;
            await this.client.from(collection).update(doc).eq('id', doc.id);
        }
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        if (!this.client) throw new Error("Not connected");
        await this.client.from(collection).delete().in('id', ids);
    }

    async countDocuments(collection: string, filter?: MetadataFilter): Promise<number> {
        if (!this.client) throw new Error("Not connected");
        const { count } = await this.client.from(collection).select('*', { count: 'exact', head: true });
        return count || 0;
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        if (!this.client) throw new Error("Not connected");
        // Use RPC for vector search
        const { data, error } = await this.client.rpc('match_documents', {
            query_embedding: query.vector,
            match_threshold: query.minScore || 0.7,
            match_count: query.topK || 10,
        });
        if (error) throw error;
        return data as SearchResult[];
    }
}
