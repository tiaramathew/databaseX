"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { CreateCollectionModal } from "@/components/collections/CreateCollectionModal";
import { CollectionDetails } from "@/components/collections/CollectionDetails";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonCard } from "@/components/ui/skeleton";
import { CreateCollectionConfig, CollectionInfo } from "@/lib/db/adapters/base";
import {
    createCollectionApi,
    deleteCollectionApi,
    listCollectionsApi,
    getCollectionStatsApi,
} from "@/lib/api/collections";
import { Layers } from "lucide-react";

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

    const [isLoading, setIsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const handleViewDetails = useCallback((collection: CollectionInfo) => {
        setSelectedCollection(collection);
        setDetailsOpen(true);
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadCollections = async () => {
            try {
                const data = await listCollectionsApi();
                if (mounted) {
                    setCollections(data);
                }
            } catch {
                // Collections from store are used if API fails
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount - setCollections is stable from Zustand

    const handleCreate = useCallback(
        async (config: CreateCollectionConfig) => {
            const toastId = toast.loading("Creating collection...");
            try {
                const created = await createCollectionApi(config);
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
        [addCollection]
    );

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            await deleteCollectionApi(deleteTarget, true);
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
    }, [deleteTarget, removeCollection]);

    const handleDelete = useCallback((name: string) => {
        setDeleteTarget(name);
    }, []);

    const handleEdit = useCallback((name: string) => {
        toast.info("Edit functionality", {
            description: `Editing "${name}" will be available soon.`,
        });
    }, []);

    const handleViewStats = useCallback(async (name: string) => {
        const toastId = toast.loading("Loading stats...");
        try {
            const stats = await getCollectionStatsApi(name);
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
    }, []);

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
                    <CreateCollectionModal onSubmit={handleCreate} />
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
        </>
    );
}
