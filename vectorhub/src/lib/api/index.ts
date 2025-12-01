// API Client Exports
// Re-export all API functions for convenient access

// Error handling
export { ApiError, type ApiErrorResponse } from "./connections";

// Collections API
export {
    listCollectionsApi,
    getCollectionApi,
    createCollectionApi,
    deleteCollectionApi,
    getCollectionStatsApi,
} from "./collections";

// Documents API
export {
    addDocumentsApi,
    deleteDocumentsApi,
    type AddDocumentsResult,
    type DeleteDocumentsResult,
} from "./documents";

// Search API
export {
    searchApi,
    searchWithOptionsApi,
    type SearchOptions,
} from "./search";

// RAG API
export {
    ragQueryApi,
    type RAGQueryInput,
    type RAGQueryResult,
} from "./rag";

// MCP Connections API
export {
    listMcpConnectionsApi,
    getMcpConnectionApi,
    createMcpConnectionApi,
    deleteMcpConnectionApi,
    checkMcpHealthApi,
    syncMcpConnectionApi,
    type CreateMcpConnectionInput,
    type McpHealthResult,
    type McpSyncResult,
} from "./connections";

// Webhook Connections API
export {
    listWebhookConnectionsApi,
    getWebhookConnectionApi,
    createWebhookConnectionApi,
    deleteWebhookConnectionApi,
    testWebhookConnectionApi,
    type CreateWebhookConnectionInput,
    type WebhookTestResult,
} from "./connections";

