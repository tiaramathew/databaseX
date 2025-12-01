"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { CreateCollectionModal } from "@/components/collections/CreateCollectionModal";
import { CollectionDetails } from "@/components/collections/CollectionDetails";
import { EditCollectionModal } from "@/components/collections/EditCollectionModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonCard } from "@/components/ui/skeleton";
import { CreateCollectionConfig, CollectionInfo } from "@/lib/db/adapters/base";
import {
    createCollectionApi,
    deleteCollectionApi,
    listCollectionsApi,
    getCollectionStatsApi,
    updateCollectionApi,
} from "@/lib/api/collections";
import { Layers } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
    const [editCollection, setEditCollection] = useState<CollectionInfo | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const handleViewDetails = useCallback((collection: CollectionInfo) => {
        setSelectedCollection(collection);
        setDetailsOpen(true);
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadCollections = async () => {
            if (!activeConnectionId) {
                setCollections([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Pass the active connection config to the API
                if (activeConnection) {
                    const data = await listCollectionsApi(activeConnection);
                    if (mounted) {
                        setCollections(data);
                    }
                }
            } catch {
                // Collections from store are used if API fails
                if (mounted) {
                    setCollections([]);
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

    const handleCreate = useCallback(
        async (config: CreateCollectionConfig) => {
            if (!activeConnection) return;
            const toastId = toast.loading("Creating collection...");
            try {
                const created = await createCollectionApi(config, activeConnection);
                addCollection(created);
                toast.success("Collection created successfully", {
                    id: toastId,
                    description: `"${created.name}" is ready to use.`,
                });
            } catch {
                toast.error("Failed to create collection", {
                    id: toastId,
                    description: "Please check your configuration and try again.",
                });
            }
        },
        [addCollection, activeConnection]
    );

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

    const handleEdit = useCallback((name: string) => {
        const collection = collections.find((c) => c.name === name);
        if (collection) {
            setEditCollection(collection);
            setEditOpen(true);
        }
    }, [collections]);

    const handleEditSave = useCallback(
        async (name: string, updates: Partial<CollectionInfo>) => {
            if (!activeConnection) return;
            const toastId = toast.loading("Updating collection...");
            try {
                // Update on server
                await updateCollectionApi(name, updates, activeConnection);

                // Update in store
                const collection = collections.find((c) => c.name === name);
                if (collection) {
                    const updatedCollections = collections.map((c) =>
                        c.name === name ? { ...c, ...updates } : c
                    );
                    setCollections(updatedCollections);
                }
                toast.success("Collection updated", {
                    id: toastId,
                    description: `"${updates.name || name}" has been updated.`,
                });
            } catch {
                toast.error("Failed to update collection", {
                    id: toastId,
                    description: "An error occurred while updating the collection.",
                });
                throw new Error("Failed to update");
            }
        },
        [collections, setCollections, activeConnection]
    );

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
                            Manage your vector collections and indices.
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
                            Manage your vector collections and indices.
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
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                // Force reload by clearing collections first
                                setCollections([]);
                                setIsLoading(true);
                                // The useEffect will trigger reload because activeConnectionId is set
                                // But to be sure, we can just trigger a re-fetch if we extract loadCollections
                                // For now, toggling loading state is a simple hack, or we can expose a refresh function
                                // Let's just call the API directly here to be cleaner
                                if (activeConnection) {
                                    const toastId = toast.loading("Refreshing...");
                                    listCollectionsApi(activeConnection)
                                        .then((data) => {
                                            setCollections(data);
                                            toast.success("Collections refreshed", { id: toastId });
                                        })
                                        .catch(() => {
                                            toast.error("Failed to refresh", { id: toastId });
                                        })
                                        .finally(() => setIsLoading(false));
                                }
                            }}
                            disabled={!activeConnection || isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <CreateCollectionModal onSubmit={handleCreate} disabled={!activeConnectionId} />
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
                                onEdit={handleEdit}
                                onViewStats={handleViewStats}
                                onViewDetails={handleViewDetails}
                            />
                        </motion.div>
                    ))}
                    {collections.length === 0 && (
                        <motion.div
                            variants={itemVariants}
                            className="col-span-full flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center"
                        >
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Layers className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No collections found</h3>
                            <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                Create a collection to start storing and searching vector embeddings.
                            </p>
                            <CreateCollectionModal onSubmit={handleCreate} />
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

            <EditCollectionModal
                collection={editCollection}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSave={handleEditSave}
            />
        </>
    );
}
