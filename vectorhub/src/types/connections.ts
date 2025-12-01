export type VectorDBType =
    | 'chromadb'
    | 'mongodb_atlas'
    | 'supabase'
    | 'weaviate'
    | 'pinecone'
    | 'qdrant'
    | 'redis'
    | 'upstash'
    | 'neo4j'
    | 'milvus'
    | 'elasticsearch'
    | 'pgvector'
    | 'opensearch'
    | 'astra_db'
    | 'singlestore'
    | 'vespa'
    | 'typesense'
    | 'marqo'
    | 'turbopuffer'
    | 'lancedb'
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
    | Neo4jConfig
    | MilvusConfig
    | ElasticsearchConfig
    | PgvectorConfig
    | OpenSearchConfig
    | AstraDBConfig
    | SingleStoreConfig
    | VespaConfig
    | TypesenseConfig
    | MarqoConfig
    | TurbopufferConfig
    | LanceDBConfig
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

// Graph Databases
export interface Neo4jConfig {
    uri: string;
    username: string;
    password: string;
    database?: string;
    indexName?: string;
}

// Vector Databases
export interface MilvusConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    secure: boolean;
    database?: string;
}

export interface ElasticsearchConfig {
    node: string;
    apiKey?: string;
    username?: string;
    password?: string;
    cloudId?: string;
    indexName: string;
}

export interface PgvectorConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    tableName: string;
    dimensions: number;
    ssl: boolean;
}

export interface OpenSearchConfig {
    node: string;
    username?: string;
    password?: string;
    awsRegion?: string;
    indexName: string;
    ssl: boolean;
}

export interface AstraDBConfig {
    endpoint: string;
    token: string;
    namespace?: string;
    collectionName: string;
}

export interface SingleStoreConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    tableName: string;
}

export interface VespaConfig {
    endpoint: string;
    applicationPackage: string;
    apiKey?: string;
    namespace: string;
}

export interface TypesenseConfig {
    host: string;
    port: number;
    protocol: 'http' | 'https';
    apiKey: string;
    collectionName: string;
}

export interface MarqoConfig {
    url: string;
    apiKey?: string;
    indexName: string;
}

export interface TurbopufferConfig {
    apiKey: string;
    namespace: string;
}

export interface LanceDBConfig {
    uri: string;
    tableName: string;
    storageOptions?: {
        awsAccessKeyId?: string;
        awsSecretAccessKey?: string;
        awsRegion?: string;
    };
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
    // Transport type
    type: 'stdio' | 'sse';

    // For stdio transport
    command?: string;
    args?: string[];
    env?: Record<string, string>;

    // For SSE transport
    url?: string;

    // Webhook URL for HTTP-based AI queries (n8n, Make.com, etc.)
    webhookUrl?: string;

    // Common options
    serverName?: string;
    authToken?: string;
    timeout?: number;

    // Capabilities (auto-detected or manually set)
    capabilities?: {
        tools?: boolean;
        resources?: boolean;
        prompts?: boolean;
    };
    [key: string]: unknown;
}

// Separate connection type status
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

// MCP Connections represent integrations that follow the Model Context Protocol.
export interface McpConnection {
    id: string;
    name: string;
    endpoint: string;
    status: ConnectionStatus;
    lastSync: Date;
    tags?: string[];
}

// Webhook connections represent outbound HTTP callbacks for VectorHub events.
export interface WebhookConnection {
    id: string;
    name: string;
    url: string;
    eventTypes: string[];
    status: ConnectionStatus;
    lastDelivery?: Date;
    secretConfigured: boolean;
}