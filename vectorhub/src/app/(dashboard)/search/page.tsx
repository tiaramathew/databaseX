"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/store";
import { RAGChat, type AIAgent } from "@/components/search/RAGChat";
import { SearchResult } from "@/lib/db/adapters/base";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
    Search,
    Sparkles,
    Settings2,
    Database,
    Zap,
    Globe,
    Link2,
    Plus,
} from "lucide-react";
import Link from "next/link";

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

export default function SearchPage() {
    const collections = useStore((state) => state.collections);
    const connections = useStore((state) => state.connections);
    const mcpConnections = useStore((state) => state.mcpConnections);
    const webhookConnections = useStore((state) => state.webhookConnections);

    const [selectedCollection, setSelectedCollection] = useState<string>("");
    const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
    const [topK, setTopK] = useState([5]);
    const [minScore, setMinScore] = useState([0.5]);

    // Build agents list from:
    // 1. Main connections array (type === "mcp" or "webhook")
    // 2. Legacy mcpConnections and webhookConnections arrays
    const agents: AIAgent[] = [
        // MCP connections from main connections array
        ...connections
            .filter((c) => c.type === "mcp")
            .map((mcp) => ({
                id: mcp.id,
                name: mcp.name,
                type: "mcp" as const,
                endpoint: (mcp.config as any)?.url || (mcp.config as any)?.command || "",
                status: mcp.status,
            })),
        // Webhook connections from main connections array
        ...connections
            .filter((c) => c.type === "webhook")
            .map((webhook) => ({
                id: webhook.id,
                name: webhook.name,
                type: "webhook" as const,
                endpoint: (webhook.config as any)?.baseUrl || "",
                status: webhook.status,
            })),
        // Legacy mcpConnections array
        ...mcpConnections.map((mcp) => ({
            id: mcp.id,
            name: mcp.name,
            type: "mcp" as const,
            endpoint: mcp.endpoint,
            status: mcp.status,
        })),
        // Legacy webhookConnections array (filtered by event types)
        ...webhookConnections
            .filter((w) => w.eventTypes?.includes("rag.query") || w.eventTypes?.includes("*"))
            .map((webhook) => ({
                id: webhook.id,
                name: webhook.name,
                type: "webhook" as const,
                endpoint: webhook.url,
                status: webhook.status,
            })),
    ].filter((agent, index, self) => 
        // Remove duplicates by id
        index === self.findIndex((a) => a.id === agent.id)
    );

    // Set default collection when available
    useEffect(() => {
        if (collections.length > 0 && !selectedCollection) {
            setSelectedCollection(collections[0].name);
        }
    }, [collections, selectedCollection]);

    const handleSendMessage = useCallback(
        async (
            message: string,
            agent: AIAgent | null
        ): Promise<{ response: string; context: SearchResult[] }> => {
            if (!selectedCollection) {
                toast.error("No collection selected", {
                    description: "Please select a collection to search.",
                });
                return { response: "Please select a collection first.", context: [] };
            }

            try {
                const response = await fetch("/api/rag", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        query: message,
                        collection: selectedCollection,
                        topK: topK[0],
                        minScore: minScore[0],
                        agent: agent
                            ? {
                                  type: agent.type,
                                  endpoint: agent.endpoint,
                                  name: agent.name,
                              }
                            : null,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || "Request failed");
                }

                const data = await response.json();
                return {
                    response: data.response,
                    context: data.context,
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                toast.error("Request failed", { description: message });
                return { response: `Error: ${message}`, context: [] };
            }
        },
        [selectedCollection, topK, minScore]
    );

    const connectedAgentsCount = agents.filter((a) => a.status === "connected").length;

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                    RAG Playground
                </h2>
                <p className="text-muted-foreground">
                    Test your vector database with AI-powered retrieval augmented generation.
                </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
                {/* Configuration Panel */}
                <motion.div variants={itemVariants} className="space-y-4">
                    {/* Collection Selector */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                Data Source
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Select the collection to search
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Select
                                value={selectedCollection}
                                onValueChange={setSelectedCollection}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a collection" />
                                </SelectTrigger>
                                <SelectContent>
                                    {collections.length === 0 ? (
                                        <SelectItem value="_empty" disabled>
                                            No collections available
                                        </SelectItem>
                                    ) : (
                                        collections.map((c) => (
                                            <SelectItem key={c.name} value={c.name}>
                                                <span className="flex items-center gap-2">
                                                    {c.name}
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {c.documentCount} docs
                                                    </Badge>
                                                </span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {collections.length === 0 && (
                                <div className="mt-3 p-3 rounded-md bg-muted/50 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        No collections found
                                    </p>
                                    <Link href="/upload">
                                        <Button size="sm" variant="outline" className="text-xs">
                                            <Plus className="h-3 w-3 mr-1" />
                                            Upload Documents
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Search Settings */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-muted-foreground" />
                                Retrieval Settings
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Configure search parameters
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Results to retrieve</Label>
                                    <span className="text-xs font-medium tabular-nums">
                                        {topK[0]}
                                    </span>
                                </div>
                                <Slider
                                    value={topK}
                                    onValueChange={setTopK}
                                    min={1}
                                    max={20}
                                    step={1}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">Min similarity score</Label>
                                    <span className="text-xs font-medium tabular-nums">
                                        {(minScore[0] * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <Slider
                                    value={minScore}
                                    onValueChange={setMinScore}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Agents */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                AI Agents
                                {connectedAgentsCount > 0 && (
                                    <Badge variant="secondary" className="ml-auto text-[10px]">
                                        {connectedAgentsCount} connected
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Connect AI models to generate responses
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {agents.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-xs text-muted-foreground mb-3">
                                        No AI agents configured.
                                        <br />
                                        Using demo mode for responses.
                                    </p>
                                    <Tabs defaultValue="mcp" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2 h-8">
                                            <TabsTrigger value="mcp" className="text-xs">
                                                <Zap className="h-3 w-3 mr-1" />
                                                MCP
                                            </TabsTrigger>
                                            <TabsTrigger value="webhook" className="text-xs">
                                                <Globe className="h-3 w-3 mr-1" />
                                                Webhook
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="mcp" className="mt-3">
                                            <Link href="/connections">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add MCP Connection
                                                </Button>
                                            </Link>
                                            <p className="text-[10px] text-muted-foreground mt-2">
                                                Connect MCP-compatible AI services like Claude, GPT, etc.
                                            </p>
                                        </TabsContent>
                                        <TabsContent value="webhook" className="mt-3">
                                            <Link href="/connections">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Webhook
                                                </Button>
                                            </Link>
                                            <p className="text-[10px] text-muted-foreground mt-2">
                                                Use webhooks to connect custom AI endpoints.
                                                Add &quot;rag.query&quot; or &quot;*&quot; to event types.
                                            </p>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {agents.map((agent) => (
                                        <div
                                            key={agent.id}
                                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                                        >
                                            <div className="flex items-center gap-2">
                                                {agent.type === "mcp" ? (
                                                    <Zap className="h-3 w-3 text-amber-500" />
                                                ) : (
                                                    <Globe className="h-3 w-3 text-blue-500" />
                                                )}
                                                <span className="text-xs font-medium">
                                                    {agent.name}
                                                </span>
                                            </div>
                                            <Badge
                                                variant={
                                                    agent.status === "connected"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                className="text-[10px]"
                                            >
                                                {agent.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    <Link href="/connections" className="block mt-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="w-full text-xs"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Manage Connections
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Chat Interface */}
                <motion.div variants={itemVariants}>
                    <RAGChat
                        onSendMessage={handleSendMessage}
                        agents={agents}
                        selectedAgent={selectedAgent}
                        onSelectAgent={setSelectedAgent}
                        collectionName={selectedCollection}
                        disabled={!selectedCollection || collections.length === 0}
                    />
                </motion.div>
            </div>
        </motion.div>
    );
}
