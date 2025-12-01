"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { UploadZone } from "@/components/documents/UploadZone";
import { TextInputUpload } from "@/components/documents/TextInputUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Webhook, Cpu, Database, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { VectorDocument } from "@/lib/db/adapters/base";
import { addDocumentsApi } from "@/lib/api/documents";
import { listCollectionsApi } from "@/lib/api/collections";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function UploadPage() {
    const connections = useStore((state) => state.connections);
    const collections = useStore((state) => state.collections);
    const addDocument = useStore((state) => state.addDocument);
    const setCollections = useStore((state) => state.setCollections);

    const [selectedConnection, setSelectedConnection] = useState<string>("");
    const [selectedCollection, setSelectedCollection] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [syncToConnections, setSyncToConnections] = useState<Record<string, boolean>>({});

    const webhookConnections = useMemo(
        () => connections.filter((c) => c.type === "webhook"),
        [connections]
    );

    const mcpConnections = useMemo(
        () => connections.filter((c) => c.type === "mcp"),
        [connections]
    );

    const hasSyncConnections = webhookConnections.length > 0 || mcpConnections.length > 0;
    const selectedSyncConnections = Object.entries(syncToConnections)
        .filter(([, enabled]) => enabled)
        .map(([id]) => id);

    const toggleSyncConnection = (id: string) => {
        setSyncToConnections((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const getConnectionIcon = (type: string) => {
        switch (type) {
            case "webhook":
                return <Webhook className="h-4 w-4" />;
            case "mcp":
                return <Cpu className="h-4 w-4" />;
            default:
                return <Database className="h-4 w-4" />;
        }
    };

    const ensureTargetsSelected = useCallback(() => {
        if (!selectedConnection) {
            toast.error("No connection selected", {
                description: "Please select a target connection first.",
            });
            return false;
        }
        if (!selectedCollection) {
            toast.error("No collection selected", {
                description: "Please select a target collection first.",
            });
            return false;
        }
        return true;
    }, [selectedConnection, selectedCollection]);

    const syncCollectionsFromDb = useCallback(async () => {
        try {
            const latest = await listCollectionsApi();
            setCollections(latest);
        } catch {
            // Silent fail - use existing data
        }
    }, [setCollections]);

    const syncToExternalConnections = useCallback(
        async (docs: VectorDocument[], collection: string) => {
            if (selectedSyncConnections.length === 0) return;

            const syncPromises = selectedSyncConnections.map(async (connId) => {
                const conn = connections.find((c) => c.id === connId);
                if (!conn) return { connId, success: false, error: "Connection not found" };

                try {
                    const response = await fetch("/api/documents/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            connectionId: connId,
                            collection,
                            documents: docs,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Sync failed: ${response.statusText}`);
                    }

                    return { connId, success: true, name: conn.name };
                } catch (error) {
                    return { connId, success: false, name: conn.name, error: (error as Error).message };
                }
            });

            const results = await Promise.all(syncPromises);
            const successful = results.filter((r) => r.success);
            const failed = results.filter((r) => !r.success);

            if (successful.length > 0) {
                toast.success(`Synced to ${successful.length} connection(s)`, {
                    description: successful.map((r) => r.name).join(", "),
                });
            }

            if (failed.length > 0) {
                toast.error(`Failed to sync to ${failed.length} connection(s)`, {
                    description: failed.map((r) => r.name).join(", "),
                });
            }
        },
        [selectedSyncConnections, connections]
    );

    const handleFileUpload = useCallback(
        async (files: File[]) => {
            if (!ensureTargetsSelected()) return;

            setIsUploading(true);
            const toastId = toast.loading(`Uploading ${files.length} file(s)...`);

            const docs: VectorDocument[] = files.map((file) => ({
                id: crypto.randomUUID(),
                content: `Content of ${file.name}`,
                metadata: {
                    source: file.name,
                    type: file.type,
                    size: file.size,
                    created_at: new Date(),
                    connectionId: selectedConnection,
                    collectionName: selectedCollection,
                },
            }));

            try {
                await addDocumentsApi(selectedCollection, docs);
                docs.forEach((doc) => addDocument(doc));
                await syncCollectionsFromDb();

                await syncToExternalConnections(docs, selectedCollection);

                toast.success(`${files.length} file(s) uploaded`, {
                    id: toastId,
                    description: `Documents added to "${selectedCollection}".`,
                });
            } catch {
                toast.error("Upload failed", {
                    id: toastId,
                    description: "Could not upload files. Please try again.",
                });
            } finally {
                setIsUploading(false);
            }
        },
        [
            ensureTargetsSelected,
            selectedConnection,
            selectedCollection,
            addDocument,
            syncCollectionsFromDb,
            syncToExternalConnections,
        ]
    );

    const handleTextUpload = useCallback(
        async (title: string, content: string) => {
            if (!ensureTargetsSelected()) return;

            setIsUploading(true);
            const toastId = toast.loading("Processing text...");

            const doc: VectorDocument = {
                id: crypto.randomUUID(),
                content,
                metadata: {
                    source: title,
                    type: "text/plain",
                    size: content.length,
                    created_at: new Date(),
                    connectionId: selectedConnection,
                    collectionName: selectedCollection,
                },
            };

            try {
                await addDocumentsApi(selectedCollection, [doc]);
                addDocument(doc);
                await syncCollectionsFromDb();

                await syncToExternalConnections([doc], selectedCollection);

                toast.success("Text uploaded", {
                    id: toastId,
                    description: `"${title}" added to "${selectedCollection}".`,
                });
            } catch {
                toast.error("Upload failed", {
                    id: toastId,
                    description: "Could not upload text. Please try again.",
                });
            } finally {
                setIsUploading(false);
            }
        },
        [
            ensureTargetsSelected,
            selectedConnection,
            selectedCollection,
            addDocument,
            syncCollectionsFromDb,
            syncToExternalConnections,
        ]
    );

    const hasTargetsSelected = selectedConnection && selectedCollection;

    return (
        <motion.div
            className="space-y-6 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h2 className="text-3xl font-bold tracking-tight">Upload Data</h2>
                <p className="text-muted-foreground">
                    Import files or text into your vector database.
                </p>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Target Destination</CardTitle>
                        <CardDescription>
                            Select where your data should be stored
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Connection</Label>
                                <Select
                                    value={selectedConnection}
                                    onValueChange={setSelectedConnection}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select connection" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {connections.length === 0 ? (
                                            <SelectItem value="_empty" disabled>
                                                No connections available
                                            </SelectItem>
                                        ) : (
                                            connections.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} ({c.type})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Collection</Label>
                                <Select
                                    value={selectedCollection}
                                    onValueChange={setSelectedCollection}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select collection" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {collections.length === 0 ? (
                                            <SelectItem value="_empty" disabled>
                                                No collections available
                                            </SelectItem>
                                        ) : (
                                            collections.map((c) => (
                                                <SelectItem key={c.name} value={c.name}>
                                                    {c.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {!hasTargetsSelected && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-4 w-4" />
                                Please select both a connection and collection to upload data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {hasSyncConnections && (
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Sync to External Services
                                {selectedSyncConnections.length > 0 && (
                                    <Badge variant="secondary" className="ml-2">
                                        {selectedSyncConnections.length} selected
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Optionally sync uploaded data to webhook and MCP connections
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {webhookConnections.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-medium">
                                            <Webhook className="h-4 w-4" />
                                            Webhook Connections
                                        </Label>
                                        <div className="space-y-2">
                                            {webhookConnections.map((conn) => (
                                                <div
                                                    key={conn.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                                            <Webhook className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{conn.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {conn.status === "connected" ? "Ready to sync" : "Not connected"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={syncToConnections[conn.id] || false}
                                                        onCheckedChange={() => toggleSyncConnection(conn.id)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {mcpConnections.length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2 text-sm font-medium">
                                            <Cpu className="h-4 w-4" />
                                            MCP Connections
                                        </Label>
                                        <div className="space-y-2">
                                            {mcpConnections.map((conn) => (
                                                <div
                                                    key={conn.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                                            <Cpu className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">{conn.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {conn.status === "connected" ? "Ready to sync" : "Not connected"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        checked={syncToConnections[conn.id] || false}
                                                        onCheckedChange={() => toggleSyncConnection(conn.id)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedSyncConnections.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 pt-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Data will be synced to {selectedSyncConnections.length} connection(s) on upload
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <motion.div variants={itemVariants}>
                <Tabs defaultValue="files" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="files" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            File Upload
                        </TabsTrigger>
                        <TabsTrigger value="text" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Text Input
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="files" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <UploadZone
                                    onUpload={handleFileUpload}
                                    disabled={!hasTargetsSelected || isUploading}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="text" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <TextInputUpload
                                    onUpload={handleTextUpload}
                                    disabled={!hasTargetsSelected || isUploading}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </motion.div>
    );
}
