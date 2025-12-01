"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { CollectionDetails } from "@/components/collections/CollectionDetails";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonCard } from "@/components/ui/skeleton";
import { CollectionInfo } from "@/lib/db/adapters/base";
import {
    deleteCollectionApi,
    listCollectionsApi,
    getCollectionStatsApi,
} from "@/lib/api/collections";
import { Layers, RefreshCw, Database, Link2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function CollectionsPage() {
    // Access store state and actions separately to avoid re-render loops
    const collections = useStore((state) => state.collections);
    const addCollection = useStore((state) => state.addCollection);
    const removeCollection = useStore((state) => state.removeCollection);
    const setCollections = useStore((state) => state.setCollections);
    const connections = useStore((state) => state.connections);
    const activeConnectionId = useStore((state) => state.activeConnectionId);
    const setActiveConnection = useStore((state) => state.setActiveConnection);
    const getConnection = useStore((state) => state.getConnection);

    const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

    const [isLoading, setIsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const handleViewDetails = useCallback((collection: CollectionInfo) => {
        setSelectedCollection(collection);
        setDetailsOpen(true);
    }, []);

    // Auto-select first connection if none is selected
    useEffect(() => {
        if (!activeConnectionId && connections.length > 0) {
            setActiveConnection(connections[0].id);
        }
    }, [activeConnectionId, connections, setActiveConnection]);

    useEffect(() => {
        let mounted = true;

        const loadCollections = async () => {
            if (!activeConnectionId || !activeConnection) {
                setCollections([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const data = await listCollectionsApi(activeConnection);
                if (mounted) {
                    setCollections(data);
                    toast.success(`Found ${data.length} collection${data.length !== 1 ? 's' : ''}`);
                }
            } catch (error) {
                // Show error to user
                if (mounted) {
                    setCollections([]);
                    const message = error instanceof Error ? error.message : "Failed to fetch collections";
                    toast.error("Failed to fetch collections", { description: message });
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        loadCollections();

        return () => {
            mounted = false;
        };
    }, [activeConnectionId, activeConnection, setCollections]);

    const handleRefresh = useCallback(async () => {
        if (!activeConnection) return;
        setIsLoading(true);
        const toastId = toast.loading("Fetching collections from database...");
        try {
            const data = await listCollectionsApi(activeConnection);
            setCollections(data);
            toast.success(`Found ${data.length} collection${data.length !== 1 ? 's' : ''}`, { id: toastId });
        } catch {
            toast.error("Failed to fetch collections", { id: toastId });
            setCollections([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeConnection, setCollections]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget || !activeConnection) return;

        setIsDeleting(true);
        try {
            await deleteCollectionApi(deleteTarget, true, activeConnection);
            removeCollection(deleteTarget);
            toast.success("Collection deleted", {
                description: `"${deleteTarget}" has been permanently removed.`,
            });
        } catch {
            toast.error("Failed to delete collection", {
                description: "An error occurred while deleting the collection.",
            });
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    }, [deleteTarget, removeCollection, activeConnection]);

    const handleDelete = useCallback((name: string) => {
        setDeleteTarget(name);
    }, []);

    const handleViewStats = useCallback(async (name: string) => {
        if (!activeConnection) return;
        const toastId = toast.loading("Loading stats...");
        try {
            const stats = await getCollectionStatsApi(name, activeConnection);
            toast.success(`Stats for "${name}"`, {
                id: toastId,
                description: `${stats.vectorCount.toLocaleString()} vectors, ${(stats.indexSize / 1024).toFixed(1)} KB index size`,
            });
        } catch {
            toast.error("Failed to load stats", {
                id: toastId,
                description: "Could not retrieve collection statistics.",
            });
        }
    }, [activeConnection]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Collections</h2>
                        <p className="text-muted-foreground">
                            Retrieve and connect to existing collections from your databases.
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

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
                        <h2 className="text-3xl font-bold tracking-tight">Collections</h2>
                        <p className="text-muted-foreground">
                            Retrieve and connect to existing collections from your databases.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-[200px]">
                            <Select
                                value={activeConnectionId || ""}
                                onValueChange={(value) => setActiveConnection(value || null)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select connection" />
                                </SelectTrigger>
                                <SelectContent>
                                    {connections.map((conn) => (
                                        <SelectItem key={conn.id} value={conn.id}>
                                            {conn.name}
                                        </SelectItem>
                                    ))}
                                    {connections.length === 0 && (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            No connections
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            variant="default"
                            onClick={handleRefresh}
                            disabled={!activeConnection || isLoading}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                            Fetch Collections
                        </Button>
                    </div>
                </motion.div>

                <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    variants={containerVariants}
                >
                    {collections.map((collection) => (
                        <motion.div key={collection.name} variants={itemVariants}>
                            <CollectionCard
                                collection={collection}
                                onDelete={handleDelete}
                                onViewStats={handleViewStats}
                                onViewDetails={handleViewDetails}
                            />
                        </motion.div>
                    ))}
                    {collections.length === 0 && !activeConnectionId && (
                        <motion.div
                            variants={itemVariants}
                            className="col-span-full flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center"
                        >
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Database className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No connection selected</h3>
                            <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                First, add a database connection to retrieve your existing collections.
                            </p>
                            <Link href="/connections">
                                <Button className="gap-2">
                                    <Link2 className="h-4 w-4" />
                                    Go to Connections
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                    {collections.length === 0 && activeConnectionId && (
                        <motion.div
                            variants={itemVariants}
                            className="col-span-full flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center"
                        >
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Layers className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No collections found</h3>
                            <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                No collections were found in this database. Click the button above to fetch collections, or ensure your database has existing collections.
                            </p>
                            <Button onClick={handleRefresh} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Fetch Collections
                            </Button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete Collection"
                description={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone and all vectors in this collection will be permanently removed.`}
                confirmText="Delete Collection"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
            />

            <CollectionDetails
                collection={selectedCollection}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                onDelete={(name) => {
                    setDetailsOpen(false);
                    setDeleteTarget(name);
                }}
            />
        </>
    );
}
