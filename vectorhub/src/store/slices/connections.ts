import { StateCreator } from 'zustand';
import { ConnectionConfig, McpConnection, WebhookConnection } from '@/types/connections';

export interface ConnectionsSlice {
    // Vector database connections
    connections: ConnectionConfig[];
    addConnection: (connection: ConnectionConfig) => void;
    removeConnection: (id: string) => void;
    updateConnection: (id: string, updates: Partial<ConnectionConfig>) => void;
    getConnection: (id: string) => ConnectionConfig | undefined;

    // MCP connections
    mcpConnections: McpConnection[];
    addMcpConnection: (connection: McpConnection) => void;
    removeMcpConnection: (id: string) => void;
    updateMcpConnection: (id: string, updates: Partial<McpConnection>) => void;
    getMcpConnection: (id: string) => McpConnection | undefined;

    // Webhook connections
    webhookConnections: WebhookConnection[];
    addWebhookConnection: (connection: WebhookConnection) => void;
    removeWebhookConnection: (id: string) => void;
    updateWebhookConnection: (id: string, updates: Partial<WebhookConnection>) => void;
    getWebhookConnection: (id: string) => WebhookConnection | undefined;
}

export const createConnectionsSlice: StateCreator<ConnectionsSlice> = (set, get) => ({
    // Vector DB connections
    connections: [],
    addConnection: (connection) => set((state) => ({
        connections: [...state.connections, connection]
    })),
    removeConnection: (id) => set((state) => ({
        connections: state.connections.filter((c) => c.id !== id)
    })),
    updateConnection: (id, updates) => set((state) => ({
        connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
        )
    })),
    getConnection: (id) => get().connections.find((c) => c.id === id),

    // MCP connections
    mcpConnections: [],
    addMcpConnection: (connection) => set((state) => ({
        mcpConnections: [...state.mcpConnections, connection]
    })),
    removeMcpConnection: (id) => set((state) => ({
        mcpConnections: state.mcpConnections.filter((c) => c.id !== id)
    })),
    updateMcpConnection: (id, updates) => set((state) => ({
        mcpConnections: state.mcpConnections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
        )
    })),
    getMcpConnection: (id) => get().mcpConnections.find((c) => c.id === id),

    // Webhook connections
    webhookConnections: [],
    addWebhookConnection: (connection) => set((state) => ({
        webhookConnections: [...state.webhookConnections, connection]
    })),
    removeWebhookConnection: (id) => set((state) => ({
        webhookConnections: state.webhookConnections.filter((c) => c.id !== id)
    })),
    updateWebhookConnection: (id, updates) => set((state) => ({
        webhookConnections: state.webhookConnections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
        )
    })),
    getWebhookConnection: (id) => get().webhookConnections.find((c) => c.id === id),
});
