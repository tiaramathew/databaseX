"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { WebhookConnectionForm } from "@/components/connections/WebhookConnectionForm";
import { MCPConnectionForm } from "@/components/connections/MCPConnectionForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Database, Webhook, Cpu } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionConfig } from "@/types/connections";

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

    const [open, setOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

    const handleDeleteConfirm = useCallback(() => {
        if (!deleteTarget) return;

        const connection = connections.find((c) => c.id === deleteTarget);
        removeConnection(deleteTarget);
        toast.success("Connection removed", {
            description: `"${connection?.name}" has been disconnected.`,
        });
        setDeleteTarget(null);
    }, [deleteTarget, connections, removeConnection]);

    const handleAddConnection = useCallback(
        (data: Partial<ConnectionConfig>) => {
            const newConnection = {
                id: crypto.randomUUID(),
                ...data,
            } as ConnectionConfig;

            addConnection(newConnection);
            setOpen(false);
            toast.success("Connection added", {
                description: `Successfully connected to "${data.name}".`,
            });
        },
        [addConnection]
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
                            Manage your vector database connections and integrations.
                        </p>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Connection
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Add Connection</DialogTitle>
                                <DialogDescription>
                                    Connect to a vector database, webhook, or MCP server.
                                </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="database" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="database" className="flex items-center gap-2">
                                        <Database className="h-4 w-4" />
                                        Database
                                    </TabsTrigger>
                                    <TabsTrigger value="webhook" className="flex items-center gap-2">
                                        <Webhook className="h-4 w-4" />
                                        Webhook
                                    </TabsTrigger>
                                    <TabsTrigger value="mcp" className="flex items-center gap-2">
                                        <Cpu className="h-4 w-4" />
                                        MCP
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="database" className="mt-4">
                                    <ConnectionForm
                                        onSubmit={handleAddConnection}
                                        onCancel={() => setOpen(false)}
                                    />
                                </TabsContent>
                                <TabsContent value="webhook" className="mt-4">
                                    <WebhookConnectionForm
                                        onSubmit={handleAddConnection}
                                        onCancel={() => setOpen(false)}
                                    />
                                </TabsContent>
                                <TabsContent value="mcp" className="mt-4">
                                    <MCPConnectionForm
                                        onSubmit={handleAddConnection}
                                        onCancel={() => setOpen(false)}
                                    />
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </motion.div>

                <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    variants={containerVariants}
                >
                    {connections.map((connection) => (
                        <motion.div key={connection.id} variants={itemVariants}>
                            <ConnectionCard
                                connection={connection}
                                onDelete={(id) => setDeleteTarget(id)}
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
                            <Button onClick={() => setOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Connection
                            </Button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Remove Connection"
                description="Are you sure you want to remove this connection? You can reconnect at any time."
                confirmText="Remove"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
            />
        </>
    );
}
