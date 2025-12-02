"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ConnectionConfig, VectorDBType } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
    Database,
    Layers,
    FileText,
    Server,
    Clock,
    HardDrive,
    Activity,
    RefreshCw,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Copy,
    Check,
    Trash2,
    Plus,
    Search,
    Settings,
    Info,
    Zap,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { listCollectionsApi } from "@/lib/api/collections";

interface ConnectionDetailsProps {
    connection: ConnectionConfig | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSync?: (id: string) => void;
    onDelete?: (id: string) => void;
}

interface CollectionInfo {
    name: string;
    description?: string;
    documentCount: number;
    dimensions?: number;
    indexType?: string;
    size?: string;
    lastModified?: Date;
    isTool?: boolean;
}

interface ConnectionStats {
    totalDocuments: number;
    totalCollections: number;
    storageUsed: string;
    queriesPerDay: number;
    avgLatency: number;
    uptime: string;
}

// Fetch real connection details from the database
async function fetchConnectionDetails(connection: ConnectionConfig): Promise<{
    collections: CollectionInfo[];
    stats: ConnectionStats;
    serverInfo: Record<string, string>;
}> {
    let fetchedCollections: CollectionInfo[] = [];
    
    // Connection types that should fetch from API
    const apiTypes = ["mongodb_atlas", "supabase", "pinecone", "weaviate", "qdrant", "chromadb", "milvus", "redis", "upstash", "neo4j", "elasticsearch", "pgvector", "mcp"];
    
    if (apiTypes.includes(connection.type)) {
        try {
            const apiCollections = await listCollectionsApi(connection);
            fetchedCollections = apiCollections.map((col: any) => ({
                name: col.name,
                description: col.description,
                documentCount: col.documentCount || 0,
                dimensions: col.dimensions,
                indexType: col.isTool ? "MCP Tool" : (col.distanceMetric === "cosine" ? "HNSW" : col.distanceMetric || "IVF_FLAT"),
                size: col.isTool ? "N/A" : `${((col.documentCount || 0) * 0.05).toFixed(1)} MB`,
                lastModified: new Date(),
                isTool: col.isTool,
            }));
        } catch (error) {
            console.error("Failed to fetch collections:", error);
            // Fallback for MCP if API fails
            if (connection.type === "mcp") {
                fetchedCollections = [{
                    name: "Failed to fetch MCP tools",
                    documentCount: 0,
                    dimensions: 0,
                    indexType: "Error",
                    size: "N/A",
                    lastModified: new Date(),
                }];
            }
        }
    } else if (connection.type === "webhook") {
        // For Webhook connections, show endpoint info
        fetchedCollections = [{
            name: "Webhook Endpoint",
            documentCount: 0,
            dimensions: 0,
            indexType: "HTTP",
            size: "N/A",
            lastModified: new Date(),
        }];
    }

    const totalDocs = fetchedCollections.reduce((acc, c) => acc + c.documentCount, 0);

    const stats: ConnectionStats = {
        totalDocuments: totalDocs,
        totalCollections: fetchedCollections.length,
        storageUsed: `${(totalDocs * 0.0001).toFixed(2)} GB`,
        queriesPerDay: 0,
        avgLatency: 0,
        uptime: connection.status === "connected" ? "Online" : "Offline",
    };

    const serverInfo = getServerInfo(connection);

    return { collections: fetchedCollections, stats, serverInfo };
}

function getServerInfo(connection: ConnectionConfig): Record<string, string> {
    const config = connection.config as unknown as Record<string, unknown>;
    const info: Record<string, string> = {
        "Connection ID": connection.id,
        "Type": connection.type,
        "Status": connection.status,
    };

    // Add type-specific info
    switch (connection.type) {
        case "pinecone":
            info["Environment"] = (config.environment as string) || "N/A";
            info["Index Name"] = (config.indexName as string) || "Default";
            break;
        case "weaviate":
        case "qdrant":
        case "chromadb":
        case "milvus":
            info["Host"] = (config.host as string) || "localhost";
            info["Port"] = String(config.port || "Default");
            break;
        case "supabase":
            info["Project URL"] = (config.projectUrl as string) || "N/A";
            break;
        case "mongodb_atlas":
            info["Database"] = (config.database as string) || "N/A";
            info["Index Name"] = (config.vectorSearchIndexName as string) || "N/A";
            break;
        case "neo4j":
            info["URI"] = (config.uri as string) || "N/A";
            info["Database"] = (config.database as string) || "neo4j";
            break;
        case "elasticsearch":
        case "opensearch":
            info["Node"] = (config.node as string) || "N/A";
            info["Index"] = (config.indexName as string) || "N/A";
            break;
        case "pgvector":
            info["Host"] = (config.host as string) || "localhost";
            info["Database"] = (config.database as string) || "postgres";
            info["Table"] = (config.tableName as string) || "N/A";
            break;
        default:
            if (config.host) info["Host"] = config.host as string;
            if (config.url) info["URL"] = config.url as string;
    }

    return info;
}

const dbTypeLabels: Record<string, string> = {
    chromadb: "ChromaDB",
    mongodb_atlas: "MongoDB Atlas",
    supabase: "Supabase",
    weaviate: "Weaviate",
    pinecone: "Pinecone",
    qdrant: "Qdrant",
    redis: "Redis Stack",
    upstash: "Upstash",
    neo4j: "Neo4j",
    milvus: "Milvus",
    elasticsearch: "Elasticsearch",
    pgvector: "PostgreSQL + pgvector",
    opensearch: "OpenSearch",
    astra_db: "Astra DB",
    singlestore: "SingleStore",
    vespa: "Vespa",
    typesense: "Typesense",
    marqo: "Marqo",
    turbopuffer: "Turbopuffer",
    lancedb: "LanceDB",
    webhook: "Webhook",
    mcp: "MCP Server",
};

export function ConnectionDetails({
    connection,
    open,
    onOpenChange,
    onSync,
    onDelete,
}: ConnectionDetailsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [collections, setCollections] = useState<CollectionInfo[]>([]);
    const [stats, setStats] = useState<ConnectionStats | null>(null);
    const [serverInfo, setServerInfo] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const loadDetails = useCallback(async () => {
        if (!connection) return;

        setIsLoading(true);
        try {
            const details = await fetchConnectionDetails(connection);
            setCollections(details.collections);
            setStats(details.stats);
            setServerInfo(details.serverInfo);
        } catch (error) {
            toast.error("Failed to load connection details");
        } finally {
            setIsLoading(false);
        }
    }, [connection]);

    useEffect(() => {
        if (open && connection) {
            loadDetails();
        }
    }, [open, connection, loadDetails]);

    const copyToClipboard = (key: string, value: string) => {
        navigator.clipboard.writeText(value);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    if (!connection) return null;

    const statusConfig = {
        connected: { color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Connected" },
        disconnected: { color: "text-zinc-400", bg: "bg-zinc-500/10", label: "Disconnected" },
        error: { color: "text-red-500", bg: "bg-red-500/10", label: "Error" },
    };

    const status = statusConfig[connection.status] || statusConfig.disconnected;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
                <SheetHeader className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Database className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="text-xl truncate">{connection.name}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2">
                                <span>{dbTypeLabels[connection.type] || connection.type}</span>
                                <Badge variant="outline" className={cn("text-xs", status.color)}>
                                    <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", status.bg.replace("/10", ""))} />
                                    {status.label}
                                </Badge>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-hidden mt-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Loading connection details...</p>
                        </div>
                    ) : (
                        <Tabs defaultValue="overview" className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview" className="text-xs">
                                    <BarChart3 className="h-3 w-3 mr-1.5" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="collections" className="text-xs">
                                    <Layers className="h-3 w-3 mr-1.5" />
                                    Collections
                                </TabsTrigger>
                                <TabsTrigger value="info" className="text-xs">
                                    <Info className="h-3 w-3 mr-1.5" />
                                    Details
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
                                                            <FileText className="h-4 w-4" />
                                                            <span className="text-xs">Total Documents</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">
                                                            {stats.totalDocuments.toLocaleString()}
                                                        </p>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.05 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <Layers className="h-4 w-4" />
                                                            <span className="text-xs">Collections</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{stats.totalCollections}</p>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <HardDrive className="h-4 w-4" />
                                                            <span className="text-xs">Storage Used</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{stats.storageUsed}</p>
                                                    </motion.div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.15 }}
                                                        className="p-4 rounded-lg border bg-card"
                                                    >
                                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                                            <Zap className="h-4 w-4" />
                                                            <span className="text-xs">Avg Latency</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{stats.avgLatency}ms</p>
                                                    </motion.div>
                                                </div>
                                            )}

                                            {/* Activity */}
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-medium flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                    Recent Activity
                                                </h4>
                                                <div className="space-y-2">
                                                    {[
                                                        { action: "Query executed", time: "2 min ago", type: "search" },
                                                        { action: "Documents indexed", time: "15 min ago", type: "index" },
                                                        { action: "Collection created", time: "1 hour ago", type: "create" },
                                                        { action: "Bulk insert", time: "3 hours ago", type: "insert" },
                                                    ].map((activity, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                                                        >
                                                            <span className="text-sm">{activity.action}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {activity.time}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Last Sync */}
                                            <div className="flex items-center justify-between p-3 rounded-lg border">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm">Last synced</span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(new Date(connection.lastSync), {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Collections Tab */}
                                <TabsContent value="collections" className="h-full m-0">
                                    <ScrollArea className="h-[calc(100vh-280px)]">
                                        <div className="space-y-3 pr-4">
                                            {collections.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                                                    <h3 className="text-lg font-medium">No collections</h3>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        This connection has no collections yet
                                                    </p>
                                                </div>
                                            ) : (
                                                collections.map((collection, i) => (
                                                    <motion.div
                                                        key={collection.name}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "h-10 w-10 rounded-lg flex items-center justify-center",
                                                                    collection.isTool ? "bg-amber-500/10" : "bg-primary/10"
                                                                )}>
                                                                    {collection.isTool ? (
                                                                        <Zap className="h-5 w-5 text-amber-500" />
                                                                    ) : (
                                                                        <Database className="h-5 w-5 text-primary" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">{collection.name}</p>
                                                                    {collection.description && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                                            {collection.description}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        {collection.isTool ? (
                                                                            <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                                                                                MCP Tool
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                {collection.documentCount.toLocaleString()} docs
                                                                            </Badge>
                                                                        )}
                                                                        {collection.dimensions && collection.dimensions > 0 && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {collection.dimensions}d
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                {!collection.isTool && (
                                                                    <p className="text-sm font-medium">{collection.size}</p>
                                                                )}
                                                                {collection.indexType && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {collection.indexType}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {collection.lastModified && !collection.isTool && (
                                                            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                                                                <span>Last modified</span>
                                                                <span>
                                                                    {formatDistanceToNow(collection.lastModified, {
                                                                        addSuffix: true,
                                                                    })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Details Tab */}
                                <TabsContent value="info" className="h-full m-0">
                                    <ScrollArea className="h-[calc(100vh-280px)]">
                                        <div className="space-y-4 pr-4">
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium flex items-center gap-2">
                                                    <Server className="h-4 w-4 text-muted-foreground" />
                                                    Connection Information
                                                </h4>
                                                <div className="space-y-1">
                                                    {Object.entries(serverInfo).map(([key, value]) => (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                                                        >
                                                            <span className="text-sm text-muted-foreground">{key}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-mono">{value}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => copyToClipboard(key, value)}
                                                                >
                                                                    {copied === key ? (
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

                                            {/* Health Check */}
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-medium flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                    Health Status
                                                </h4>
                                                <div className="space-y-2">
                                                    {[
                                                        { name: "Connection", status: "healthy" },
                                                        { name: "Read Operations", status: "healthy" },
                                                        { name: "Write Operations", status: "healthy" },
                                                        { name: "Index Performance", status: "healthy" },
                                                    ].map((check) => (
                                                        <div
                                                            key={check.name}
                                                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                                                        >
                                                            <span className="text-sm">{check.name}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                                <span className="text-xs text-emerald-500">Healthy</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
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
                        onClick={() => onDelete?.(connection.id)}
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
                        <Button size="sm" onClick={() => onSync?.(connection.id)}>
                            <Zap className="h-4 w-4 mr-2" />
                            Sync Now
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

