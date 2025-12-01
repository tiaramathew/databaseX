import type { StoreState } from "./index";

// ============================================================================
// Data Selectors
// ============================================================================

export const selectConnections = (state: StoreState) => state.connections;
export const selectCollections = (state: StoreState) => state.collections;
export const selectDocuments = (state: StoreState) => state.documents;
export const selectMcpConnections = (state: StoreState) => state.mcpConnections;
export const selectWebhookConnections = (state: StoreState) => state.webhookConnections;

// ============================================================================
// Derived Selectors
// ============================================================================

export const selectConnectionCount = (state: StoreState) => state.connections.length;
export const selectCollectionCount = (state: StoreState) => state.collections.length;
export const selectDocumentCount = (state: StoreState) => state.documents.length;
export const selectMcpConnectionCount = (state: StoreState) => state.mcpConnections.length;
export const selectWebhookConnectionCount = (state: StoreState) => state.webhookConnections.length;

export const selectTotalVectorCount = (state: StoreState) =>
    state.collections.reduce((acc, c) => acc + c.documentCount, 0);

export const selectConnectedConnectionsCount = (state: StoreState) =>
    state.connections.filter((c) => c.status === "connected").length;

export const selectActiveWebhooksCount = (state: StoreState) =>
    state.webhookConnections.filter((w) => w.status === "connected").length;

export const selectHealthyMcpConnectionsCount = (state: StoreState) =>
    state.mcpConnections.filter((m) => m.status === "connected").length;

// ============================================================================
// Action Selectors
// ============================================================================

export const selectConnectionActions = (state: StoreState) => ({
    addConnection: state.addConnection,
    removeConnection: state.removeConnection,
    updateConnection: state.updateConnection,
    getConnection: state.getConnection,
});

export const selectCollectionActions = (state: StoreState) => ({
    setCollections: state.setCollections,
    addCollection: state.addCollection,
    removeCollection: state.removeCollection,
});

export const selectDocumentActions = (state: StoreState) => ({
    addDocument: state.addDocument,
    removeDocument: state.removeDocument,
    updateDocument: state.updateDocument,
});

export const selectMcpConnectionActions = (state: StoreState) => ({
    addMcpConnection: state.addMcpConnection,
    removeMcpConnection: state.removeMcpConnection,
    updateMcpConnection: state.updateMcpConnection,
    getMcpConnection: state.getMcpConnection,
});

export const selectWebhookConnectionActions = (state: StoreState) => ({
    addWebhookConnection: state.addWebhookConnection,
    removeWebhookConnection: state.removeWebhookConnection,
    updateWebhookConnection: state.updateWebhookConnection,
    getWebhookConnection: state.getWebhookConnection,
});
