"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { McpConnectionCard } from "@/components/connections/McpConnectionCard";
import { WebhookConnectionCard } from "@/components/connections/WebhookConnectionCard";
import { McpConnection, WebhookConnection, ConnectionConfig } from "@/types/connections";
import { McpConnectionForm } from "@/components/connections/McpConnectionForm";
import { WebhookConnectionForm } from "@/components/connections/WebhookConnectionForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, Zap, Globe } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function ConnectionsPage() {
    // Access store state and actions separately
    const connections = useStore((state) => state.connections);
    const addConnection = useStore((state) => state.addConnection);
    const removeConnection = useStore((state) => state.removeConnection);
    const updateConnection = useStore((state) => state.updateConnection);

    const mcpConnections = useStore((state) => state.mcpConnections);
    const addMcpConnection = useStore((state) => state.addMcpConnection);
    const removeMcpConnection = useStore((state) => state.removeMcpConnection);

    const webhookConnections = useStore((state) => state.webhookConnections);
    const addWebhookConnection = useStore((state) => state.addWebhookConnection);
    const removeWebhookConnection = useStore((state) => state.removeWebhookConnection);

    const [dbDialogOpen, setDbDialogOpen] = useState(false);
    const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
    const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);

    const [deleteDbTarget, setDeleteDbTarget] = useState<string | null>(null);
    const [deleteMcpTarget, setDeleteMcpTarget] = useState<string | null>(null);
    const [deleteWebhookTarget, setDeleteWebhookTarget] = useState<string | null>(null);

    const [syncingId, setSyncingId] = useState<string | null>(null);

    const handleEdit = useCallback((id: string) => {
        toast.info("Edit functionality", {
            description: "Connection editing will be available soon.",
        });
    }, []);

    const handleSync = useCallback(
        async (id: string) => {
            setSyncingId(id);
            const connection = connections.find((c) => c.id === id);
            const toastId = toast.loading(`Syncing ${connection?.name || "connection"}...`);

            // Simulate sync delay
            await new Promise((resolve) => setTimeout(resolve, 1500));

            updateConnection(id, { lastSync: new Date(), status: "connected" });
            setSyncingId(null);
            toast.success("Sync complete", {
                id: toastId,
                description: `${connection?.name} is now up to date.`,
            });
        },
        [connections, updateConnection]
    );

    const handleDeleteDbConfirm = useCallback(() => {
        if (!deleteDbTarget) return;

        const connection = connections.find((c) => c.id === deleteDbTarget);
        removeConnection(deleteDbTarget);
        toast.success("Connection removed", {
            description: `"${connection?.name}" has been disconnected.`,
        });
        setDeleteDbTarget(null);
    }, [deleteDbTarget, connections, removeConnection]);

    const handleDeleteMcpConfirm = useCallback(() => {
        if (!deleteMcpTarget) return;

        const connection = mcpConnections.find((c) => c.id === deleteMcpTarget);
        removeMcpConnection(deleteMcpTarget);
        toast.success("MCP connection removed", {
            description: `"${connection?.name}" has been removed.`,
        });
        setDeleteMcpTarget(null);
    }, [deleteMcpTarget, mcpConnections, removeMcpConnection]);

    const handleDeleteWebhookConfirm = useCallback(() => {
        if (!deleteWebhookTarget) return;

        const connection = webhookConnections.find((c) => c.id === deleteWebhookTarget);
        removeWebhookConnection(deleteWebhookTarget);
        toast.success("Webhook removed", {
            description: `"${connection?.name}" has been removed.`,
        });
        setDeleteWebhookTarget(null);
    }, [deleteWebhookTarget, webhookConnections, removeWebhookConnection]);

    const handleAddConnection = useCallback(
        (data: Partial<ConnectionConfig>) => {
            const newConnection = {
                id: crypto.randomUUID(),
                ...data,
            } as ConnectionConfig;

            addConnection(newConnection);
            setDbDialogOpen(false);
            toast.success("Connection added", {
                description: `Successfully connected to "${data.name}".`,
            });
        },
        [addConnection]
    );

    const handleAddMcpConnection = useCallback(
        (data: { name: string; endpoint: string; tags: string[] }) => {
            const newConnection: McpConnection = {
                id: crypto.randomUUID(),
                name: data.name,
                endpoint: data.endpoint,
                status: "connected",
                lastSync: new Date(),
                tags: data.tags,
            };

            addMcpConnection(newConnection);
            setMcpDialogOpen(false);
            toast.success("MCP connection added", {
                description: `Successfully registered "${data.name}".`,
            });
        },
        [addMcpConnection]
    );

    const handleAddWebhookConnection = useCallback(
        (data: {
            name: string;
            url: string;
            eventTypes: string[];
            secretConfigured: boolean;
        }) => {
            const newConnection: WebhookConnection = {
                id: crypto.randomUUID(),
                name: data.name,
                url: data.url,
                eventTypes: data.eventTypes,
                status: "connected",
                lastDelivery: undefined,
                secretConfigured: data.secretConfigured,
            };

            addWebhookConnection(newConnection);
            setWebhookDialogOpen(false);
            toast.success("Webhook created", {
                description: `Webhook "${data.name}" is now configured.`,
            });
        },
        [addWebhookConnection]
    );

    return (
        <>
            <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Connections</h2>
                        <p className="text-muted-foreground">
                            Manage your vector database, MCP, and webhook connections.
                        </p>
                    </div>
                </motion.div>

                <Tabs defaultValue="databases" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-xl">
                        <TabsTrigger value="databases" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Databases
                        </TabsTrigger>
                        <TabsTrigger value="mcp" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            MCP
                        </TabsTrigger>
                        <TabsTrigger value="webhooks" className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Webhooks
                        </TabsTrigger>
                    </TabsList>

                    {/* Vector DB connections */}
                    <TabsContent value="databases" className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Vector Databases</h3>
                            <Dialog open={dbDialogOpen} onOpenChange={setDbDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Connection
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Connection</DialogTitle>
                                        <DialogDescription>
                                            Connect to a new vector database instance.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ConnectionForm
                                        onSubmit={handleAddConnection}
                                        onCancel={() => setDbDialogOpen(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>

                        <motion.div
                            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            variants={containerVariants}
                        >
                            {connections.map((connection) => (
                                <motion.div key={connection.id} variants={itemVariants}>
                                    <ConnectionCard
                                        connection={connection}
                                        onDelete={(id) => setDeleteDbTarget(id)}
                                        onEdit={handleEdit}
                                        onSync={handleSync}
                                        isSyncing={syncingId === connection.id}
                                    />
                                </motion.div>
                            ))}
                            {connections.length === 0 && (
                                <motion.div
                                    variants={itemVariants}
                                    className="col-span-full flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center"
                                >
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Database className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No connections found</h3>
                                    <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                        Get started by adding your first vector database connection.
                                    </p>
                                    <Button onClick={() => setDbDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Connection
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    </TabsContent>

                    {/* MCP connections */}
                    <TabsContent value="mcp" className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">MCP Connections</h3>
                            <Dialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add MCP Connection
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add MCP Connection</DialogTitle>
                                        <DialogDescription>
                                            Register an MCP endpoint to power vector-aware tools.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <McpConnectionForm
                                        onSubmit={handleAddMcpConnection}
                                        onCancel={() => setMcpDialogOpen(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>

                        <motion.div
                            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            variants={containerVariants}
                        >
                            {mcpConnections.map((connection) => (
                                <motion.div key={connection.id} variants={itemVariants}>
                                    <McpConnectionCard
                                        connection={connection}
                                        onDelete={(id) => setDeleteMcpTarget(id)}
                                    />
                                </motion.div>
                            ))}
                            {mcpConnections.length === 0 && (
                                <motion.div
                                    variants={itemVariants}
                                    className="col-span-full flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center"
                                >
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Zap className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No MCP connections</h3>
                                    <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                        Connect an MCP-compatible service to start orchestrating tools.
                                    </p>
                                    <Button onClick={() => setMcpDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add MCP Connection
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    </TabsContent>

                    {/* Webhook connections */}
                    <TabsContent value="webhooks" className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Webhook Connections</h3>
                            <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Webhook
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Webhook</DialogTitle>
                                        <DialogDescription>
                                            Configure outbound webhooks for VectorHub events.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <WebhookConnectionForm
                                        onSubmit={handleAddWebhookConnection}
                                        onCancel={() => setWebhookDialogOpen(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>

                        <motion.div
                            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                            variants={containerVariants}
                        >
                            {webhookConnections.map((connection) => (
                                <motion.div key={connection.id} variants={itemVariants}>
                                    <WebhookConnectionCard
                                        connection={connection}
                                        onDelete={(id) => setDeleteWebhookTarget(id)}
                                    />
                                </motion.div>
                            ))}
                            {webhookConnections.length === 0 && (
                                <motion.div
                                    variants={itemVariants}
                                    className="col-span-full flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center"
                                >
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <Globe className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No webhooks configured</h3>
                                    <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                        Create a webhook to receive real-time events from VectorHub.
                                    </p>
                                    <Button onClick={() => setWebhookDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Webhook
                                    </Button>
                                </motion.div>
                            )}
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* Vector DB delete confirmation */}
            <ConfirmDialog
                open={!!deleteDbTarget}
                onOpenChange={(open) => !open && setDeleteDbTarget(null)}
                title="Remove Connection"
                description="Are you sure you want to remove this connection? You can reconnect at any time."
                confirmText="Remove"
                variant="destructive"
                onConfirm={handleDeleteDbConfirm}
            />

            {/* MCP delete confirmation */}
            <ConfirmDialog
                open={!!deleteMcpTarget}
                onOpenChange={(open) => !open && setDeleteMcpTarget(null)}
                title="Remove MCP Connection"
                description="Are you sure you want to remove this MCP connection?"
                confirmText="Remove"
                variant="destructive"
                onConfirm={handleDeleteMcpConfirm}
            />

            {/* Webhook delete confirmation */}
            <ConfirmDialog
                open={!!deleteWebhookTarget}
                onOpenChange={(open) => !open && setDeleteWebhookTarget(null)}
                title="Remove Webhook"
                description="Are you sure you want to remove this webhook connection?"
                confirmText="Remove"
                variant="destructive"
                onConfirm={handleDeleteWebhookConfirm}
            />
        </>
    );
}
