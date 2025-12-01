"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CollectionInfo } from "@/lib/db/adapters/base";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { getCollectionStatsApi } from "@/lib/api/collections";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Layers,
    FileText,
    Hash,
    BarChart3,
    Clock,
    HardDrive,
    Activity,
    RefreshCw,
    Loader2,
    Trash2,
    Upload,
    Search,
    Copy,
    Check,
    Settings,
    Database,
    Zap,
    TrendingUp,
    Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

interface CollectionDetailsProps {
    collection: CollectionInfo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete?: (name: string) => void;
}

interface CollectionStats {
    vectorCount: number;
    indexSize: number;
    avgVectorSize: number;
    lastUpdated: Date;
    queryCount24h: number;
    insertCount24h: number;
}

interface DocumentPreview {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

const metricDescriptions: Record<string, string> = {
    cosine: "Measures the cosine of the angle between vectors. Best for normalized embeddings.",
    euclidean: "Measures straight-line distance. Best for comparing absolute magnitudes.",
    dot_product: "Measures the dot product. Best for retrieval with inner product scoring.",
};

export function CollectionDetails({
    collection,
    open,
    onOpenChange,
    onDelete,
}: CollectionDetailsProps) {
    const documents = useStore((state) => state.documents);

    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<CollectionStats | null>(null);
    const [recentDocs, setRecentDocs] = useState<DocumentPreview[]>([]);
    const [copied, setCopied] = useState(false);

    const activeConnectionId = useStore((state) => state.activeConnectionId);
    const getConnection = useStore((state) => state.getConnection);
    const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

    const loadDetails = useCallback(async () => {
        if (!collection || !activeConnection) return;

        setIsLoading(true);

        try {
            // Fetch real stats from API
            const realStats = await getCollectionStatsApi(collection.name, activeConnection);

            // Enrich with local document info if needed, or just use API stats
            // For now, we'll use the API stats primarily
            setStats({
                ...realStats,
                avgVectorSize: collection.dimensions * 4, // Estimate
                queryCount24h: 0, // Not available from adapter yet
                insertCount24h: 0, // Not available from adapter yet
            });

            // Get documents for this collection from store (fallback/cache)
            // In a real scenario, we might want to fetch these from API too if supported
            const collectionDocs = documents.filter(
                (doc) => doc.metadata?.collectionName === collection.name
            );

            // Create document previews
            const previews: DocumentPreview[] = collectionDocs.slice(0, 5).map((doc) => {
                const content = doc.content || "";
                return {
                    id: doc.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
                    content: content.slice(0, 200) + (content.length > 200 ? "..." : ""),
                    metadata: doc.metadata || {},
                    createdAt: new Date((doc.metadata?.created_at as string) || Date.now()),
                };
            });

            setRecentDocs(previews);
        } catch (error) {
            console.error("Failed to load collection details:", error);
            toast.error("Failed to load collection stats");
        } finally {
            setIsLoading(false);
        }
    }, [collection, documents, activeConnection]);

    useEffect(() => {
        if (open && collection) {
            loadDetails();
        }
    }, [open, collection, loadDetails]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard");
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    if (!collection) return null;

    const metricColors: Record<string, string> = {
        cosine: "text-blue-500 bg-blue-500/10",
        euclidean: "text-emerald-500 bg-emerald-500/10",
        dot_product: "text-purple-500 bg-purple-500/10",
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
                <SheetHeader className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Layers className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="text-xl truncate">{collection.name}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-xs",
                                        metricColors[collection.distanceMetric] || metricColors.cosine
                                    )}
                                >
                                    {collection.distanceMetric}
                                </Badge>
                                <span className="text-xs">
                                    {collection.dimensions.toLocaleString()} dimensions
                                </span>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden mt-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Loading collection details...</p>
                        </div>
                    ) : (
                        <Tabs defaultValue="overview" className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview" className="text-xs">
                                    <BarChart3 className="h-3 w-3 mr-1.5" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="documents" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1.5" />
                                    Documents
                                </TabsTrigger>
                                <TabsTrigger value="config" className="text-xs">
                                    <Settings className="h-3 w-3 mr-1.5" />
                                    Config
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-hidden mt-4">
                                {/* Overview Tab */}
                                <TabsContent value="overview" className="h-full m-0">
                                    <ScrollArea className="h-[calc(100vh-280px)]">
                                        <div className="space-y-6 pr-4">
                                            {/* Stats Grid */}
                                            {stats && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <Database className="h-4 w-4" />
                                                            <span className="text-xs">Vectors</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">
                                                            {stats.vectorCount.toLocaleString()}
                                                        </p>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.05 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <HardDrive className="h-4 w-4" />
                                                            <span className="text-xs">Index Size</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">
                                                            {formatBytes(stats.indexSize)}
                                                        </p>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <Search className="h-4 w-4" />
                                                            <span className="text-xs">Queries (24h)</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">
                                                            {stats.queryCount24h.toLocaleString()}
                                                        </p>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.15 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <Upload className="h-4 w-4" />
                                                            <span className="text-xs">Inserts (24h)</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">
                                                            {stats.insertCount24h.toLocaleString()}
                                                        </p>
                                                    </motion.div>
                                                </div>
                                            )}

                                            {/* Vector Dimensions Info */}
                                            <div className="p-4 rounded-lg border bg-card">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">Vector Dimensions</span>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {collection.dimensions.toLocaleString()}d
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Each vector in this collection has {collection.dimensions.toLocaleString()} dimensions.
                                                    {collection.dimensions === 1536 && " Compatible with OpenAI text-embedding-ada-002."}
                                                    {collection.dimensions === 768 && " Compatible with many open-source embedding models."}
                                                    {collection.dimensions === 384 && " Compatible with all-MiniLM models."}
                                                </p>
                                            </div>

                                            {/* Distance Metric */}
                                            <div className="p-4 rounded-lg border bg-card">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">Distance Metric</span>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={metricColors[collection.distanceMetric]}
                                                    >
                                                        {collection.distanceMetric}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {metricDescriptions[collection.distanceMetric] ||
                                                        "Custom distance metric for similarity search."}
                                                </p>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium">Quick Actions</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <Link href={`/upload`}>
                                                        <Button variant="outline" size="sm">
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Upload Documents
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/search`}>
                                                        <Button variant="outline" size="sm">
                                                            <Search className="h-4 w-4 mr-2" />
                                                            Search Collection
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Documents Tab */}
                                <TabsContent value="documents" className="h-full m-0">
                                    <ScrollArea className="h-[calc(100vh-280px)]">
                                        <div className="space-y-3 pr-4">
                                            {recentDocs.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                                                    <h3 className="text-lg font-medium">No documents yet</h3>
                                                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                                        This collection is empty. Upload some documents to get started.
                                                    </p>
                                                    <Link href="/upload" className="mt-4">
                                                        <Button>
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Upload Documents
                                                        </Button>
                                                    </Link>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium">
                                                            Recent Documents ({recentDocs.length})
                                                        </h4>
                                                        <Link href="/documents">
                                                            <Button variant="ghost" size="sm">
                                                                View All
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                    {recentDocs.map((doc, i) => (
                                                        <motion.div
                                                            key={doc.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="p-4 rounded-lg border bg-card"
                                                        >
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <p className="text-xs font-mono text-muted-foreground truncate">
                                                                    {doc.id}
                                                                </p>
                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                    {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm line-clamp-3">{doc.content}</p>
                                                            {Object.keys(doc.metadata).length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {Object.entries(doc.metadata)
                                                                        .filter(([key]) => !["created_at", "connectionId", "collectionName"].includes(key))
                                                                        .slice(0, 3)
                                                                        .map(([key, value]) => (
                                                                            <Badge key={key} variant="secondary" className="text-[10px]">
                                                                                {key}: {String(value).slice(0, 20)}
                                                                            </Badge>
                                                                        ))}
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Config Tab */}
                                <TabsContent value="config" className="h-full m-0">
                                    <ScrollArea className="h-[calc(100vh-280px)]">
                                        <div className="space-y-4 pr-4">
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-medium flex items-center gap-2">
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                    Collection Configuration
                                                </h4>

                                                <div className="space-y-2">
                                                    {[
                                                        { label: "Collection Name", value: collection.name },
                                                        { label: "Distance Metric", value: collection.distanceMetric },
                                                        { label: "Dimensions", value: collection.dimensions.toString() },
                                                        { label: "Document Count", value: collection.documentCount.toString() },
                                                    ].map((item) => (
                                                        <div
                                                            key={item.label}
                                                            className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                                                        >
                                                            <span className="text-sm text-muted-foreground">
                                                                {item.label}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-mono">{item.value}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => copyToClipboard(item.value)}
                                                                >
                                                                    {copied ? (
                                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="h-3 w-3" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* API Usage Example */}
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-medium">API Usage</h4>
                                                <div className="p-3 rounded-lg bg-muted font-mono text-xs overflow-x-auto">
                                                    <pre>{`// Search this collection
const results = await search({
  collection: "${collection.name}",
  query: "your search query",
  topK: 10
});`}</pre>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        copyToClipboard(`const results = await search({
  collection: "${collection.name}",
  query: "your search query",
  topK: 10
});`)
                                                    }
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Code
                                                </Button>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete?.(collection.name)}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadDetails} disabled={isLoading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                        <Link href="/upload">
                            <Button size="sm">
                                <Upload className="h-4 w-4 mr-2" />
                                Add Data
                            </Button>
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

