export type VectorDBType =
    | 'chromadb'
    | 'mongodb_atlas'
    | 'supabase'
    | 'weaviate'
    | 'pinecone'
    | 'qdrant'
    | 'redis'
    | 'upstash'
    | 'webhook'
    | 'mcp';

export interface ConnectionConfig {
    id: string;
    name: string;
    type: VectorDBType;
    status: 'connected' | 'disconnected' | 'error';
    lastSync: Date;
    config:
    | ChromaDBConfig
    | MongoDBAtlasConfig
    | SupabaseConfig
    | WeaviateConfig
    | PineconeConfig
    | QdrantConfig
    | RedisConfig
    | UpstashConfig
    | WebhookConfig
    | MCPConfig;
}

export interface MongoDBAtlasConfig {
    connectionString: string;
    database: string;
    vectorSearchIndexName: string;
    embeddingField: string;
    dimensions: number;
}

export interface SupabaseConfig {
    projectUrl: string;
    anonKey: string;
    serviceRoleKey?: string;
    schema: string;
}

export interface ChromaDBConfig {
    host: string;
    port: number;
    authToken?: string;
    tenant?: string;
    database?: string;
}

export interface WeaviateConfig {
    host: string;
    scheme: 'http' | 'https';
    apiKey?: string;
    headers?: Record<string, string>;
}

export interface PineconeConfig {
    apiKey: string;
    environment: string;
    projectId?: string;
}

export interface QdrantConfig {
    host: string;
    port: number;
    apiKey?: string;
    https: boolean;
}

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    username?: string;
    tls: boolean;
}

export interface UpstashConfig {
    url: string;
    token: string;
}

export interface WebhookConfig {
    baseUrl: string;
    authType: 'none' | 'api_key' | 'bearer' | 'basic';
    authValue?: string;
    headers?: Record<string, string>;
    endpoints: {
        create: string;
        read: string;
        update: string;
        delete: string;
        search: string;
    };
    retryCount: number;
    timeoutMs: number;
}

export interface MCPConfig {
    serverUrl: string;
    serverName: string;
    authToken?: string;
    capabilities: {
        vectorCreate: boolean;
        vectorUpdate: boolean;
        vectorDelete: boolean;
        vectorSearch: boolean;
    };
    modelPreferences?: {
        embeddingModel?: string;
        dimensions?: number;
    };
}
