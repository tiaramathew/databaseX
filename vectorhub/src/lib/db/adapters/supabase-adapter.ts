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
            this.client = createClient(this.config.projectUrl, this.config.anonKey, {
                db: { schema: this.config.schema || "public" },
            });
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
            const { error } = await this.client.from("information_schema.tables").select("count").limit(1);
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
        return [];
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        if (!this.client) throw new Error("Not connected");
        throw new Error("Creating collections (tables) directly from the client is not supported. Please create the table in Supabase with a vector column.");
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        return {
            name,
            dimensions: 0,
            distanceMetric: "cosine",
            documentCount: 0,
        };
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        throw new Error("Updating collections is not supported via this adapter.");
    }

    async deleteCollection(name: string): Promise<void> {
        throw new Error("Deleting collections is not supported via this adapter.");
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        if (!this.client) throw new Error("Not connected");

        const { count, error } = await this.client.from(name).select("*", { count: "exact", head: true });

        if (error) throw error;

        return {
            vectorCount: count || 0,
            indexSize: 0,
            lastUpdated: new Date(),
        };
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        if (!this.client) throw new Error("Not connected");

        const rows = documents.map(doc => ({
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata,
            embedding: doc.embedding,
        }));

        const { data, error } = await this.client.from(collection).upsert(rows).select("id");

        if (error) throw error;
        return (data as any[]).map(d => d.id);
    }

    async getDocuments(collection: string, ids: string[]): Promise<VectorDocument[]> {
        if (!this.client) throw new Error("Not connected");

        const { data, error } = await this.client.from(collection).select("*").in("id", ids);

        if (error) throw error;

        return (data as any[]).map(row => ({
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            embedding: row.embedding,
        }));
    }

    async updateDocuments(collection: string, documents: Partial<VectorDocument>[]): Promise<void> {
        if (!this.client) throw new Error("Not connected");

        await Promise.all(documents.map(async doc => {
            if (!doc.id) return;
            const { id, embedding, ...updates } = doc;
            const rowUpdates: any = { ...updates };
            if (embedding) rowUpdates.embedding = embedding;

            await this.client!.from(collection).update(rowUpdates).eq("id", id);
        }));
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        if (!this.client) throw new Error("Not connected");
        await this.client.from(collection).delete().in("id", ids);
    }

    async countDocuments(collection: string, filter?: MetadataFilter): Promise<number> {
        if (!this.client) throw new Error("Not connected");

        let query = this.client.from(collection).select("*", { count: "exact", head: true });

        if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        if (!this.client) throw new Error("Not connected");

        const { data, error } = await this.client.rpc("match_documents", {
            query_embedding: query.vector,
            match_threshold: query.minScore || 0.5,
            match_count: query.topK || 10,
        });

        if (error) throw error;

        return (data as any[]).map(row => ({
            id: row.id,
            score: row.similarity,
            content: row.content,
            metadata: row.metadata,
        }));
    }
}
