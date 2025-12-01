import { MongoClient, ObjectId } from "mongodb";
import { ConnectionConfig, MongoDBAtlasConfig } from "@/types/connections";
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

export class MongoDBAdapter implements VectorDBAdapter {
    type = "mongodb_atlas" as const;
    private client: MongoClient | null = null;
    private config: MongoDBAtlasConfig | null = null;
    private status: ConnectionStatus = "disconnected";

    async connect(config: ConnectionConfig): Promise<void> {
        this.config = config.config as MongoDBAtlasConfig;
        try {
            this.client = new MongoClient(this.config.connectionString);
            await this.client.connect();
            this.status = "connected";
        } catch (error) {
            this.status = "error";
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        this.status = "disconnected";
    }

    async testConnection(): Promise<TestConnectionResult> {
        try {
            if (!this.client) {
                return { success: false, message: "Client not initialized" };
            }
            await this.client.db(this.config?.database).command({ ping: 1 });
            return { success: true, message: "MongoDB connection successful" };
        } catch (error) {
            return { success: false, message: `Connection failed: ${(error as Error).message}` };
        }
    }

    getConnectionStatus(): ConnectionStatus {
        return this.status;
    }

    async listCollections(): Promise<CollectionInfo[]> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const collections = await db.listCollections().toArray();

        return collections.map(c => ({
            name: c.name,
            dimensions: this.config!.dimensions,
            distanceMetric: "cosine",
            documentCount: 0,
        }));
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        await db.createCollection(config.name);

        return {
            name: config.name,
            dimensions: config.dimensions,
            distanceMetric: config.distanceMetric,
            documentCount: 0,
        };
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        if (!this.client || !this.config) throw new Error("Not connected");
        return {
            name,
            dimensions: this.config!.dimensions,
            distanceMetric: "cosine",
            documentCount: 0,
        };
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        // MongoDB collections don't strictly need updates for schema
    }

    async deleteCollection(name: string): Promise<void> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        await db.collection(name).drop();
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        // Use collStats command as collection.stats() helper might be unavailable
        const stats = await db.command({ collStats: name });

        return {
            vectorCount: stats.count,
            indexSize: stats.totalIndexSize,
            lastUpdated: new Date(),
        };
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const col = db.collection(collection);

        const docs = documents.map(doc => ({
            ...doc,
            _id: new ObjectId(),
            [this.config!.embeddingField]: doc.embedding,
        }));

        await col.insertMany(docs);
        return docs.map(d => d._id.toHexString());
    }

    async getDocuments(collection: string, ids: string[]): Promise<VectorDocument[]> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const col = db.collection(collection);

        const objectIds = ids.map(id => new ObjectId(id));
        const docs = await col.find({ _id: { $in: objectIds } }).toArray();

        return docs.map(doc => ({
            id: doc._id.toHexString(),
            content: doc.content || "",
            metadata: doc.metadata || {},
            embedding: doc[this.config!.embeddingField],
        }));
    }

    async updateDocuments(collection: string, documents: Partial<VectorDocument>[]): Promise<void> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const col = db.collection(collection);

        await Promise.all(documents.map(async doc => {
            if (!doc.id) return;
            const { id, ...updates } = doc;
            await col.updateOne({ _id: new ObjectId(id) }, { $set: updates });
        }));
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const col = db.collection(collection);

        const objectIds = ids.map(id => new ObjectId(id));
        await col.deleteMany({ _id: { $in: objectIds } });
    }

    async countDocuments(collection: string, filter?: MetadataFilter): Promise<number> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const col = db.collection(collection);
        return await col.countDocuments(filter || {});
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        if (!this.client || !this.config) throw new Error("Not connected");
        const db = this.client.db(this.config.database);
        const col = db.collection(collection);

        const pipeline = [
            {
                $vectorSearch: {
                    index: this.config.vectorSearchIndexName,
                    path: this.config.embeddingField,
                    queryVector: query.vector,
                    numCandidates: (query.topK || 10) * 10,
                    limit: query.topK || 10,
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    metadata: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
        ];

        const results = await col.aggregate(pipeline).toArray();

        return results.map(doc => ({
            id: doc._id.toHexString(),
            score: doc.score,
            content: doc.content,
            metadata: doc.metadata,
        }));
    }
}
