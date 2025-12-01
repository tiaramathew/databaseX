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
    private config: SupabaseConfig | null = null;
    private status: ConnectionStatus = "disconnected";

    async connect(config: ConnectionConfig): Promise<void> {
        this.config = config.config as SupabaseConfig;
        this.status = "connected";
    }

    async disconnect(): Promise<void> {
        this.status = "disconnected";
    }

    async testConnection(): Promise<TestConnectionResult> {
        if (!this.config) {
            return { success: false, message: "Not configured" };
        }
        try {
            const response = await fetch("/api/db/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "supabase", config: this.config }),
            });
            if (response.ok) {
                return { success: true, message: "Supabase connection successful" };
            }
            return { success: false, message: "Connection failed" };
        } catch (error) {
            return { success: false, message: `Connection failed: ${(error as Error).message}` };
        }
    }

    getConnectionStatus(): ConnectionStatus {
        return this.status;
    }

    async listCollections(): Promise<CollectionInfo[]> {
        if (!this.config) throw new Error("Not connected");
        
        try {
            const response = await fetch("/api/db/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "supabase", config: this.config }),
            });
            
            if (!response.ok) {
                throw new Error("Failed to list collections");
            }
            
            return await response.json();
        } catch (error) {
            console.error("Failed to list collections:", error);
            return [];
        }
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        if (!this.config) throw new Error("Not connected");
        
        const response = await fetch("/api/db/collections/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "supabase", 
                dbConfig: this.config,
                collectionConfig: config 
            }),
        });
        
        if (!response.ok) {
            throw new Error("Failed to create collection");
        }
        
        return await response.json();
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        const collections = await this.listCollections();
        const collection = collections.find(c => c.name === name);
        if (!collection) {
            throw new Error(`Collection "${name}" not found`);
        }
        return collection;
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        // Supabase tables don't need frequent updates
    }

    async deleteCollection(name: string): Promise<void> {
        if (!this.config) throw new Error("Not connected");
        
        const response = await fetch("/api/db/collections/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "supabase", 
                config: this.config,
                collectionName: name 
            }),
        });
        
        if (!response.ok) {
            throw new Error("Failed to delete collection");
        }
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        if (!this.config) throw new Error("Not connected");
        
        try {
            const response = await fetch("/api/db/collections/stats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    type: "supabase", 
                    config: this.config,
                    collectionName: name 
                }),
            });
            
            if (!response.ok) {
                throw new Error("Failed to get stats");
            }
            
            return await response.json();
        } catch {
            return {
                vectorCount: 0,
                indexSize: 0,
                lastUpdated: new Date(),
            };
        }
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        if (!this.config) throw new Error("Not connected");
        
        const response = await fetch("/api/db/documents/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "supabase", 
                config: this.config,
                collectionName: collection,
                documents 
            }),
        });
        
        if (!response.ok) {
            throw new Error("Failed to add documents");
        }
        
        const result = await response.json();
        return result.ids || [];
    }

    async getDocuments(collection: string, ids: string[]): Promise<VectorDocument[]> {
        if (!this.config) throw new Error("Not connected");
        
        const response = await fetch("/api/db/documents/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "supabase", 
                config: this.config,
                collectionName: collection,
                ids 
            }),
        });
        
        if (!response.ok) {
            throw new Error("Failed to get documents");
        }
        
        return await response.json();
    }

    async updateDocuments(collection: string, documents: Partial<VectorDocument>[]): Promise<void> {
        if (!this.config) throw new Error("Not connected");
        
        await fetch("/api/db/documents/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "supabase", 
                config: this.config,
                collectionName: collection,
                documents 
            }),
        });
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        if (!this.config) throw new Error("Not connected");
        
        await fetch("/api/db/documents/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                type: "supabase", 
                config: this.config,
                collectionName: collection,
                ids 
            }),
        });
    }

    async countDocuments(collection: string, filter?: MetadataFilter): Promise<number> {
        const stats = await this.getCollectionStats(collection);
        return stats.vectorCount;
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        if (!this.config) throw new Error("Not connected");
        
        try {
            const response = await fetch("/api/db/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    type: "supabase", 
                    config: this.config,
                    collectionName: collection,
                    query 
                }),
            });
            
            if (!response.ok) {
                throw new Error("Search failed");
            }
            
            return await response.json();
        } catch {
            return [];
        }
    }
}

