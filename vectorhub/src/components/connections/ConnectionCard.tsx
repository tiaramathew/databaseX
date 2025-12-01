"use client";

import { ConnectionConfig, VectorDBType } from "@/types/connections";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Trash2, Edit, RefreshCw, Loader2, Webhook, Cpu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ConnectionCardProps {
    connection: ConnectionConfig;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onSync: (id: string) => void;
    isSyncing?: boolean;
}

const statusConfig = {
    connected: {
        variant: "default" as const,
        dotClass: "bg-emerald-500",
        label: "Connected",
    },
    disconnected: {
        variant: "secondary" as const,
        dotClass: "bg-zinc-400",
        label: "Disconnected",
    },
    error: {
        variant: "destructive" as const,
        dotClass: "bg-red-500",
        label: "Error",
    },
};

const dbTypeLabels: Record<string, string> = {
    chromadb: "ChromaDB",
    mongodb_atlas: "MongoDB Atlas",
    supabase: "Supabase",
    weaviate: "Weaviate",
    pinecone: "Pinecone",
    qdrant: "Qdrant",
    redis: "Redis",
    upstash: "Upstash",
    webhook: "Webhook",
    mcp: "MCP Server",
};

const getConnectionIcon = (type: VectorDBType) => {
    switch (type) {
        case "webhook":
            return <Webhook className="h-4 w-4 text-muted-foreground" />;
        case "mcp":
            return <Cpu className="h-4 w-4 text-muted-foreground" />;
        default:
            return <Database className="h-4 w-4 text-muted-foreground" />;
    }
};

export function ConnectionCard({
    connection,
    onDelete,
    onEdit,
    onSync,
    isSyncing = false,
}: ConnectionCardProps) {
    const status = statusConfig[connection.status] || statusConfig.disconnected;

    return (
        <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            {getConnectionIcon(connection.type)}
                        </div>
                        <span className="truncate">{connection.name}</span>
                    </div>
                </CardTitle>
                <Badge variant={status.variant} className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", status.dotClass)} />
                    {status.label}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="text-xl font-semibold">
                    {dbTypeLabels[connection.type] || connection.type}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Last synced{" "}
                    {formatDistanceToNow(new Date(connection.lastSync), {
                        addSuffix: true,
                    })}
                </p>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSync(connection.id)}
                    disabled={isSyncing}
                >
                    {isSyncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isSyncing ? "Syncing..." : "Sync"}
                </Button>
                <div className="flex space-x-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(connection.id)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(connection.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
