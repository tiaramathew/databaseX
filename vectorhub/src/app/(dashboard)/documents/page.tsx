"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { DocumentList } from "@/components/documents/DocumentList";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Search, RefreshCw, Loader2, Filter, Database } from "lucide-react";
import Link from "next/link";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { listDocumentsApi, deleteDocumentsApi } from "@/lib/api/documents";
import { listCollectionsApi } from "@/lib/api/collections";
import type { VectorDocument } from "@/lib/db/adapters/base";

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

export default function DocumentsPage() {
    // Access store state and actions
    const connections = useStore((state) => state.connections);
    const activeConnectionId = useStore((state) => state.activeConnectionId);
    const setActiveConnection = useStore((state) => state.setActiveConnection);
    const getConnection = useStore((state) => state.getConnection);

    const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

    const [documents, setDocuments] = useState<VectorDocument[]>([]);
    const [collections, setCollections] = useState<string[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCollection, setFilterCollection] = useState<string>("all");
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Auto-select first connection if none selected
    useEffect(() => {
        if (!activeConnectionId && connections.length > 0) {
            setActiveConnection(connections[0].id);
        }
    }, [activeConnectionId, connections, setActiveConnection]);

    // Load collections and documents when connection changes
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            if (!activeConnection) {
                setCollections([]);
                setDocuments([]);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch collections
                const collectionList = await listCollectionsApi(activeConnection);
                if (!mounted) return;

                const collectionNames = collectionList.map((c) => c.name);
                setCollections(collectionNames);

                // Fetch documents from all collections
                const allDocs: VectorDocument[] = [];
                for (const colName of collectionNames.slice(0, 5)) { // Limit to first 5 collections
                    try {
                        const docs = await listDocumentsApi(colName, activeConnection, 50);
                        docs.forEach((doc) => {
                            doc.metadata = {
                                ...doc.metadata,
                                collectionName: colName,
                            };
                        });
                        allDocs.push(...docs);
                    } catch (err) {
                        console.warn(`Failed to fetch documents from ${colName}:`, err);
                    }
                }

                if (mounted) {
                    setDocuments(allDocs);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
                if (mounted) {
                    toast.error("Failed to load documents", {
                        description: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [activeConnection]);

    // Filter documents based on search and collection filter
    const filteredDocuments = documents.filter((doc) => {
        const matchesSearch =
            searchQuery === "" ||
            doc.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.metadata?.source as string)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.metadata?.title as string)?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCollection =
            filterCollection === "all" || doc.metadata?.collectionName === filterCollection;

        return matchesSearch && matchesCollection;
    });

    const handleRefresh = useCallback(async () => {
        if (!activeConnection) {
            toast.error("No connection selected");
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading("Refreshing documents...");

        try {
            const collectionList = await listCollectionsApi(activeConnection);
            const collectionNames = collectionList.map((c) => c.name);
            setCollections(collectionNames);

            const allDocs: VectorDocument[] = [];
            for (const colName of collectionNames.slice(0, 5)) {
                try {
                    const docs = await listDocumentsApi(colName, activeConnection, 50);
                    docs.forEach((doc) => {
                        doc.metadata = {
                            ...doc.metadata,
                            collectionName: colName,
                        };
                    });
                    allDocs.push(...docs);
                } catch (err) {
                    console.warn(`Failed to fetch documents from ${colName}:`, err);
                }
            }

            setDocuments(allDocs);
            toast.success("Documents refreshed", {
                id: toastId,
                description: `${allDocs.length} documents loaded.`,
            });
        } catch (error) {
            toast.error("Failed to refresh", {
                id: toastId,
                description: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsLoading(false);
        }
    }, [activeConnection]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget || !activeConnection) return;

        const doc = documents.find((d) => d.id === deleteTarget);
        const collection = doc?.metadata?.collectionName as string;

        if (!collection) {
            toast.error("Cannot delete document", {
                description: "Collection name not found",
            });
            setDeleteTarget(null);
            return;
        }

        setIsDeleting(true);
        try {
            await deleteDocumentsApi(collection, [deleteTarget], activeConnection);
            setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget));
        toast.success("Document deleted", {
            description: `"${doc?.metadata?.source || "Document"}" has been removed.`,
        });
        } catch (error) {
            toast.error("Failed to delete document", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsDeleting(false);
        setDeleteTarget(null);
        }
    }, [deleteTarget, documents, activeConnection]);

    return (
        <>
            <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
                        <p className="text-muted-foreground">
                            View and manage your uploaded documents and vectors.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={activeConnectionId || ""}
                            onValueChange={(value) => setActiveConnection(value || null)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <Database className="mr-2 h-4 w-4" />
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
                        <Button variant="outline" onClick={handleRefresh} disabled={isLoading || !activeConnection}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Refresh
                        </Button>
                    <Link href="/upload">
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload New
                        </Button>
                    </Link>
                    </div>
                </motion.div>

                {/* Stats and Filters */}
                {documents.length > 0 && (
                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={filterCollection} onValueChange={setFilterCollection}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="All Collections" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Collections</SelectItem>
                                    {collections.map((col) => (
                                        <SelectItem key={col} value={col}>
                                            {col}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-sm">
                                {filteredDocuments.length} of {documents.length} documents
                            </Badge>
                            {filterCollection !== "all" && (
                                <Badge variant="outline" className="text-sm">
                                    {filterCollection}
                                </Badge>
                            )}
                        </div>
                    </motion.div>
                )}

                <motion.div variants={itemVariants}>
                    {isLoading ? (
                        <div className="flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                            <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                            <h3 className="text-lg font-semibold">Loading documents...</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Fetching documents from your connected database.
                            </p>
                        </div>
                    ) : !activeConnection ? (
                        <div className="flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Database className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No connection selected</h3>
                            <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                Select a connection or add a new one to view documents.
                            </p>
                            <Link href="/connections">
                                <Button>
                                    <Database className="mr-2 h-4 w-4" />
                                    Manage Connections
                                </Button>
                            </Link>
                        </div>
                    ) : documents.length > 0 ? (
                        filteredDocuments.length > 0 ? (
                        <DocumentList
                                documents={filteredDocuments}
                            onDelete={(id) => setDeleteTarget(id)}
                        />
                        ) : (
                            <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No matching documents</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    Try adjusting your search or filter criteria.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setFilterCollection("all");
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        )
                    ) : (
                        <div className="flex h-[450px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No documents found</h3>
                            <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                                Upload documents to start indexing and searching your data.
                            </p>
                            <Link href="/upload">
                                <Button>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Documents
                                </Button>
                            </Link>
                        </div>
                    )}
                </motion.div>
            </motion.div>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Delete Document"
                description="Are you sure you want to delete this document? This action cannot be undone."
                confirmText="Delete"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
                isLoading={isDeleting}
            />
        </>
    );
}
