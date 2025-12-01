"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import { useHydration } from "@/store/hooks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SkeletonStats } from "@/components/ui/skeleton";
import {
    Database,
    Layers,
    FileText,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Zap,
    Cpu,
    Webhook,
    Server,
    HardDrive,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Plus,
    Search,
    Upload,
    RefreshCw,
    Globe,
    Key,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ConnectionConfig } from "@/types/connections";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: "easeOut",
        },
    },
};

// Activity item interface
interface ActivityItem {
    id: string;
    action: string;
    target: string;
    time: Date;
    icon: typeof Database;
    type: "connection" | "collection" | "document" | "search" | "mcp" | "webhook";
}

export default function DashboardPage() {
    const hydrated = useHydration();

    // Access store state
    const connections = useStore((state) => state.connections);
    const collections = useStore((state) => state.collections);
    const documents = useStore((state) => state.documents);
    const mcpConnections = useStore((state) => state.mcpConnections);
    const webhookConnections = useStore((state) => state.webhookConnections);

    // Calculate derived stats
    const stats = useMemo(() => {
        // Connection stats
        const totalConnections = connections.length;
        const connectedCount = connections.filter((c) => c.status === "connected").length;
        const errorCount = connections.filter((c) => c.status === "error").length;

        // Vector stats
        const totalVectors = collections.reduce((acc, c) => acc + c.documentCount, 0);
        const totalDocuments = documents.length;
        const totalCollections = collections.length;

        // MCP and Webhook stats
        const totalMcpConnections = mcpConnections?.length || 0;
        const totalWebhooks = webhookConnections?.length || 0;

        // Estimate storage (mock calculation based on documents)
        const estimatedStorageMB = totalDocuments * 0.5 + totalVectors * 0.001;
        const storageUsedGB = (estimatedStorageMB / 1024).toFixed(2);

        return {
            totalConnections,
            connectedCount,
            errorCount,
            totalVectors,
            totalDocuments,
            totalCollections,
            totalMcpConnections,
            totalWebhooks,
            storageUsedGB,
            estimatedStorageMB,
        };
    }, [connections, collections, documents, mcpConnections, webhookConnections]);

    // Generate real activity from store data
    const recentActivities = useMemo((): ActivityItem[] => {
        const activities: ActivityItem[] = [];

        // Add connection activities
        connections.forEach((conn) => {
            activities.push({
                id: `conn-${conn.id}`,
                action: conn.status === "connected" ? "Connection active" : "Connection added",
                target: conn.name,
                time: new Date(conn.lastSync),
                icon: Database,
                type: "connection",
            });
        });

        // Add collection activities
        collections.forEach((coll) => {
            activities.push({
                id: `coll-${coll.name}`,
                action: "Collection active",
                target: `${coll.name} (${coll.documentCount.toLocaleString()} vectors)`,
                time: new Date(Date.now() - Math.random() * 86400000), // Random time within last 24h
                icon: Layers,
                type: "collection",
            });
        });

        // Add document activities (last 5)
        documents.slice(-5).forEach((doc, i) => {
            activities.push({
                id: `doc-${doc.id}`,
                action: "Document indexed",
                target: (doc.metadata?.source as string) || `Document ${i + 1}`,
                time: new Date((doc.metadata?.created_at as string) || Date.now()),
                icon: FileText,
                type: "document",
            });
        });

        // Add MCP activities
        mcpConnections?.forEach((mcp) => {
            activities.push({
                id: `mcp-${mcp.id}`,
                action: "MCP server configured",
                target: mcp.name,
                time: new Date(mcp.lastSync),
                icon: Cpu,
                type: "mcp",
            });
        });

        // Add webhook activities
        webhookConnections?.forEach((webhook) => {
            activities.push({
                id: `webhook-${webhook.id}`,
                action: "Webhook registered",
                target: webhook.name,
                time: webhook.lastDelivery ? new Date(webhook.lastDelivery) : new Date(),
                icon: Webhook,
                type: "webhook",
            });
        });

        // Sort by time (most recent first) and take top 8
        return activities
            .sort((a, b) => b.time.getTime() - a.time.getTime())
            .slice(0, 8);
    }, [connections, collections, documents, mcpConnections, webhookConnections]);

    // Connection health breakdown
    const connectionHealth = useMemo(() => {
        const dbConnections = connections.filter(
            (c) => c.type !== "webhook" && c.type !== "mcp"
        );
        return {
            healthy: dbConnections.filter((c) => c.status === "connected").length,
            warning: dbConnections.filter((c) => c.status === "disconnected").length,
            error: dbConnections.filter((c) => c.status === "error").length,
            total: dbConnections.length,
        };
    }, [connections]);

    // Quick actions based on current state
    const quickActions = useMemo(() => {
        const actions = [];

        if (connections.length === 0) {
            actions.push({
                label: "Add your first connection",
                href: "/connections",
                icon: Database,
                priority: "high",
            });
        }

        if (collections.length === 0 && connections.length > 0) {
            actions.push({
                label: "Create a collection",
                href: "/collections",
                icon: Layers,
                priority: "high",
            });
        }

        if (documents.length === 0 && collections.length > 0) {
            actions.push({
                label: "Upload documents",
                href: "/upload",
                icon: Upload,
                priority: "high",
            });
        }

        if (documents.length > 0) {
            actions.push({
                label: "Search your data",
                href: "/search",
                icon: Search,
                priority: "medium",
            });
        }

        actions.push({
            label: "Configure integrations",
            href: "/integrations",
            icon: Key,
            priority: "low",
        });

        return actions.slice(0, 3);
    }, [connections.length, collections.length, documents.length]);

    const mainStats = [
        {
            title: "Total Connections",
            value: stats.totalConnections,
            icon: Database,
            href: "/connections",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            subtitle: stats.connectedCount > 0
                ? `${stats.connectedCount} active`
                : "No active connections",
            trend: stats.connectedCount > 0 ? "up" : "neutral",
        },
        {
            title: "Collections",
            value: stats.totalCollections,
            icon: Layers,
            href: "/collections",
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            subtitle: stats.totalVectors > 0
                ? `${stats.totalVectors.toLocaleString()} vectors`
                : "No vectors yet",
            trend: stats.totalCollections > 0 ? "up" : "neutral",
        },
        {
            title: "Documents",
            value: stats.totalDocuments,
            icon: FileText,
            href: "/documents",
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
            subtitle: stats.totalDocuments > 0
                ? `${stats.storageUsedGB} GB estimated`
                : "No documents yet",
            trend: stats.totalDocuments > 0 ? "up" : "neutral",
        },
        {
            title: "Integrations",
            value: stats.totalMcpConnections + stats.totalWebhooks,
            icon: Zap,
            href: "/integrations",
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
            subtitle: `${stats.totalMcpConnections} MCP, ${stats.totalWebhooks} webhooks`,
            trend: (stats.totalMcpConnections + stats.totalWebhooks) > 0 ? "up" : "neutral",
        },
    ];

    if (!hydrated) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Overview of your vector database infrastructure.
                    </p>
                </div>
                <SkeletonStats />
            </div>
        );
    }

    const isEmpty = connections.length === 0 && collections.length === 0 && documents.length === 0;

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">
                    Overview of your vector database infrastructure.
                </p>
            </motion.div>

            {/* Empty State */}
            {isEmpty && (
                <motion.div variants={itemVariants}>
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Zap className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Welcome to VectorHub</h3>
                            <p className="text-muted-foreground text-center max-w-md mb-6">
                                Get started by connecting your first vector database. You can connect to
                                Pinecone, Weaviate, Qdrant, and many more.
                            </p>
                            <Link href="/connections">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Connection
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Stats Grid */}
            <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                variants={containerVariants}
            >
                {mainStats.map((stat) => (
                    <motion.div key={stat.title} variants={itemVariants}>
                        <Link href={stat.href}>
                            <Card
                                className={cn(
                                    "card-hover cursor-pointer border transition-all hover:shadow-lg",
                                    stat.borderColor
                                )}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                                        <stat.icon className={cn("h-4 w-4", stat.color)} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">
                                        {stat.value.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        {stat.trend === "up" ? (
                                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                        ) : stat.trend === "down" ? (
                                            <ArrowDownRight className="h-3 w-3 text-red-500" />
                                        ) : (
                                            <Activity className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        {stat.subtitle}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            {/* Quick Actions (when data exists) */}
            {!isEmpty && quickActions.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {quickActions.map((action) => (
                                    <Link key={action.label} href={action.href}>
                                        <Button
                                            variant={action.priority === "high" ? "default" : "outline"}
                                            size="sm"
                                        >
                                            <action.icon className="mr-2 h-4 w-4" />
                                            {action.label}
                                        </Button>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Activity and Status */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Activity */}
                <motion.div variants={itemVariants} className="col-span-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>
                                Latest operations across your infrastructure
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentActivities.length > 0 ? (
                                <div className="space-y-4">
                                    {recentActivities.map((activity, i) => (
                                        <motion.div
                                            key={activity.id}
                                            className="flex items-center gap-4"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <div
                                                className={cn(
                                                    "h-9 w-9 rounded-lg flex items-center justify-center",
                                                    activity.type === "connection"
                                                        ? "bg-blue-500/10"
                                                        : activity.type === "collection"
                                                            ? "bg-emerald-500/10"
                                                            : activity.type === "document"
                                                                ? "bg-amber-500/10"
                                                                : activity.type === "mcp"
                                                                    ? "bg-purple-500/10"
                                                                    : "bg-pink-500/10"
                                                )}
                                            >
                                                <activity.icon
                                                    className={cn(
                                                        "h-4 w-4",
                                                        activity.type === "connection"
                                                            ? "text-blue-500"
                                                            : activity.type === "collection"
                                                                ? "text-emerald-500"
                                                                : activity.type === "document"
                                                                    ? "text-amber-500"
                                                                    : activity.type === "mcp"
                                                                        ? "text-purple-500"
                                                                        : "text-pink-500"
                                                    )}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {activity.action}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {activity.target}
                                                </p>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDistanceToNow(activity.time, { addSuffix: true })}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                                    <p className="text-sm text-muted-foreground">
                                        No recent activity
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Activity will appear here as you use VectorHub
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* System Status */}
                <motion.div variants={itemVariants} className="col-span-3">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-muted-foreground" />
                                System Status
                            </CardTitle>
                            <CardDescription>Connection health and metrics</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Connection Health */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Connection Health</span>
                                    <span className="font-medium">
                                        {connectionHealth.total > 0
                                            ? `${connectionHealth.healthy}/${connectionHealth.total} healthy`
                                            : "No connections"}
                                    </span>
                                </div>
                                {connectionHealth.total > 0 ? (
                                    <div className="flex gap-1 h-2">
                                        {connectionHealth.healthy > 0 && (
                                            <motion.div
                                                className="bg-emerald-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${(connectionHealth.healthy / connectionHealth.total) * 100}%`,
                                                }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        )}
                                        {connectionHealth.warning > 0 && (
                                            <motion.div
                                                className="bg-amber-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${(connectionHealth.warning / connectionHealth.total) * 100}%`,
                                                }}
                                                transition={{ duration: 0.5, delay: 0.1 }}
                                            />
                                        )}
                                        {connectionHealth.error > 0 && (
                                            <motion.div
                                                className="bg-red-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: `${(connectionHealth.error / connectionHealth.total) * 100}%`,
                                                }}
                                                transition={{ duration: 0.5, delay: 0.2 }}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-2 w-full rounded-full bg-secondary" />
                                )}
                                <div className="flex gap-4 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span className="text-muted-foreground">
                                            Healthy ({connectionHealth.healthy})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                                        <span className="text-muted-foreground">
                                            Warning ({connectionHealth.warning})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        <span className="text-muted-foreground">
                                            Error ({connectionHealth.error})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Vector Count */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Total Vectors</span>
                                    <span className="font-medium">
                                        {stats.totalVectors.toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: stats.totalVectors > 0 ? "100%" : "0%",
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                            </div>

                            {/* Storage */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Estimated Storage</span>
                                    <span className="font-medium">{stats.storageUsedGB} GB</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-amber-500 to-amber-500/60 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${Math.min((stats.estimatedStorageMB / 10240) * 100, 100)}%`,
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                    />
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="pt-2 flex items-center gap-2 text-sm">
                                {stats.errorCount > 0 ? (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        <span className="text-red-500">
                                            {stats.errorCount} connection(s) need attention
                                        </span>
                                    </>
                                ) : stats.totalConnections > 0 ? (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-muted-foreground">
                                            All systems operational
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-2 w-2 rounded-full bg-zinc-500" />
                                        <span className="text-muted-foreground">
                                            No active connections
                                        </span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Connection Types Overview */}
            {connections.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-muted-foreground" />
                                Connections Overview
                            </CardTitle>
                            <CardDescription>
                                Your connected databases and services
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {connections.slice(0, 6).map((conn) => (
                                    <Link key={conn.id} href="/connections">
                                        <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Database className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs font-medium truncate">
                                                    {conn.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px]",
                                                        conn.status === "connected"
                                                            ? "text-emerald-500 border-emerald-500/30"
                                                            : conn.status === "error"
                                                                ? "text-red-500 border-red-500/30"
                                                                : "text-zinc-500"
                                                    )}
                                                >
                                                    {conn.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {connections.length > 6 && (
                                    <Link href="/connections">
                                        <div className="p-3 rounded-lg border border-dashed bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-center h-full">
                                            <span className="text-xs text-muted-foreground">
                                                +{connections.length - 6} more
                                            </span>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </motion.div>
    );
}
