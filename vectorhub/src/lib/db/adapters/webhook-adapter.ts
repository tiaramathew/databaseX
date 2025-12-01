import { ConnectionConfig, WebhookConfig } from "@/types/connections";
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

export class WebhookAdapter implements VectorDBAdapter {
    type = "webhook" as const;
    private config: WebhookConfig | null = null;
    private status: ConnectionStatus = "disconnected";
    private connectionName: string = "";

    private getAuthHeaders(): Record<string, string> {
        if (!this.config) return {};
        
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...this.config.headers,
        };

        switch (this.config.authType) {
            case "api_key":
                headers["X-API-Key"] = this.config.authValue || "";
                break;
            case "bearer":
                headers["Authorization"] = `Bearer ${this.config.authValue}`;
                break;
            case "basic":
                headers["Authorization"] = `Basic ${btoa(this.config.authValue || "")}`;
                break;
        }

        return headers;
    }

    private async makeRequest<T>(
        endpoint: string,
        method: string = "GET",
        body?: unknown
    ): Promise<T> {
        if (!this.config) {
            throw new Error("Webhook not connected");
        }

        const url = `${this.config.baseUrl}${endpoint}`;
        const headers = this.getAuthHeaders();

        let lastError: Error | null = null;
        const maxRetries = this.config.retryCount || 3;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 30000);

                const response = await fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error as Error;
                if (attempt < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        throw lastError || new Error("Request failed");
    }

    async connect(config: ConnectionConfig): Promise<void> {
        this.config = config.config as WebhookConfig;
        this.connectionName = config.name;
        this.status = "connected";
        console.log(`Webhook connected to ${this.config.baseUrl}`);
    }

    async disconnect(): Promise<void> {
        this.config = null;
        this.status = "disconnected";
    }

    async testConnection(): Promise<TestConnectionResult> {
        try {
            await this.makeRequest(this.config?.endpoints.read || "/vectors", "GET");
            return { success: true, message: "Webhook connection successful" };
        } catch (error) {
            return { success: false, message: `Connection failed: ${(error as Error).message}` };
        }
    }

    getConnectionStatus(): ConnectionStatus {
        return this.status;
    }

    async createCollection(config: CreateCollectionConfig): Promise<CollectionInfo> {
        const result = await this.makeRequest<CollectionInfo>(
            this.config?.endpoints.create || "/collections",
            "POST",
            config
        );
        return result;
    }

    async listCollections(): Promise<CollectionInfo[]> {
        try {
            return await this.makeRequest<CollectionInfo[]>(
                this.config?.endpoints.read || "/collections"
            );
        } catch {
            return [];
        }
    }

    async getCollection(name: string): Promise<CollectionInfo> {
        return this.makeRequest<CollectionInfo>(
            `${this.config?.endpoints.read || "/collections"}/${name}`
        );
    }

    async updateCollection(name: string, updates: UpdateCollectionConfig): Promise<void> {
        await this.makeRequest(
            `${this.config?.endpoints.update || "/collections"}/${name}`,
            "PUT",
            updates
        );
    }

    async deleteCollection(name: string): Promise<void> {
        await this.makeRequest(
            `${this.config?.endpoints.delete || "/collections"}/${name}`,
            "DELETE"
        );
    }

    async getCollectionStats(name: string): Promise<CollectionStats> {
        try {
            return await this.makeRequest<CollectionStats>(
                `${this.config?.endpoints.read || "/collections"}/${name}/stats`
            );
        } catch {
            return {
                vectorCount: 0,
                indexSize: 0,
                lastUpdated: new Date(),
            };
        }
    }

    async addDocuments(collection: string, documents: VectorDocument[]): Promise<string[]> {
        const result = await this.makeRequest<{ ids: string[] }>(
            `${this.config?.endpoints.create || "/vectors"}`,
            "POST",
            { collection, documents }
        );
        return result.ids || documents.map((_, i) => `doc-${Date.now()}-${i}`);
    }

    async getDocuments(collection: string, ids: string[]): Promise<VectorDocument[]> {
        return this.makeRequest<VectorDocument[]>(
            `${this.config?.endpoints.read || "/vectors"}?collection=${collection}&ids=${ids.join(",")}`
        );
    }

    async updateDocuments(collection: string, documents: Partial<VectorDocument>[]): Promise<void> {
        await this.makeRequest(
            `${this.config?.endpoints.update || "/vectors"}`,
            "PUT",
            { collection, documents }
        );
    }

    async deleteDocuments(collection: string, ids: string[]): Promise<void> {
        await this.makeRequest(
            `${this.config?.endpoints.delete || "/vectors"}`,
            "DELETE",
            { collection, ids }
        );
    }

    async countDocuments(collection: string, filter?: MetadataFilter): Promise<number> {
        try {
            const result = await this.makeRequest<{ count: number }>(
                `${this.config?.endpoints.read || "/vectors"}/count?collection=${collection}`,
                "POST",
                { filter }
            );
            return result.count || 0;
        } catch {
            return 0;
        }
    }

    async search(collection: string, query: SearchQuery): Promise<SearchResult[]> {
        return this.makeRequest<SearchResult[]>(
            this.config?.endpoints.search || "/vectors/search",
            "POST",
            { collection, ...query }
        );
    }
}
