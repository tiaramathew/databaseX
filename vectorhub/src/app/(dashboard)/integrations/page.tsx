"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Key,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Cpu,
    Bot,
    Globe,
    Database,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Settings2,
    Copy,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// API Key Types
interface ApiKey {
    id: string;
    name: string;
    type: "llm" | "scraper" | "embedding" | "other";
    provider: string;
    key: string;
    createdAt: Date;
    lastUsed?: Date;
    isActive: boolean;
}

// MCP Server Types
interface McpServer {
    id: string;
    name: string;
    type: "stdio" | "sse";
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    isActive: boolean;
    lastConnected?: Date;
}

// Provider configurations
const llmProviders = [
    { value: "openai", label: "OpenAI", placeholder: "sk-..." },
    { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
    { value: "google", label: "Google AI", placeholder: "AIza..." },
    { value: "cohere", label: "Cohere", placeholder: "..." },
    { value: "mistral", label: "Mistral AI", placeholder: "..." },
    { value: "groq", label: "Groq", placeholder: "gsk_..." },
    { value: "together", label: "Together AI", placeholder: "..." },
    { value: "fireworks", label: "Fireworks AI", placeholder: "..." },
    { value: "replicate", label: "Replicate", placeholder: "r8_..." },
    { value: "huggingface", label: "Hugging Face", placeholder: "hf_..." },
];

const scraperProviders = [
    { value: "firecrawl", label: "Firecrawl", placeholder: "fc-..." },
    { value: "browserless", label: "Browserless", placeholder: "..." },
    { value: "scrapingbee", label: "ScrapingBee", placeholder: "..." },
    { value: "apify", label: "Apify", placeholder: "apify_api_..." },
    { value: "diffbot", label: "Diffbot", placeholder: "..." },
];

const embeddingProviders = [
    { value: "openai", label: "OpenAI Embeddings", placeholder: "sk-..." },
    { value: "cohere", label: "Cohere Embeddings", placeholder: "..." },
    { value: "voyageai", label: "Voyage AI", placeholder: "..." },
    { value: "jina", label: "Jina AI", placeholder: "..." },
];

export default function IntegrationsPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

    const fetchKeys = useCallback(async () => {
        try {
            const res = await fetch("/api/integrations/keys", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data);
            }
        } catch (error) {
            console.error("Failed to fetch keys", error);
        }
    }, []);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    const [mcpServers, setMcpServers] = useState<McpServer[]>([
        {
            id: "1",
            name: "mongodb",
            type: "stdio",
            command: "npx",
            args: ["-y", "mongodb-mcp-server@latest"],
            env: { MDB_MCP_CONNECTION_STRING: "mongodb+srv://..." },
            isActive: true,
            lastConnected: new Date(),
        },
    ]);

    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [addKeyOpen, setAddKeyOpen] = useState(false);
    const [addMcpOpen, setAddMcpOpen] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    // New key form state
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyType, setNewKeyType] = useState<ApiKey["type"]>("llm");
    const [newKeyProvider, setNewKeyProvider] = useState("");
    const [newKeyValue, setNewKeyValue] = useState("");

    // New MCP form state
    const [newMcpName, setNewMcpName] = useState("");
    const [newMcpType, setNewMcpType] = useState<"stdio" | "sse">("stdio");
    const [newMcpCommand, setNewMcpCommand] = useState("npx");
    const [newMcpArgs, setNewMcpArgs] = useState("");
    const [newMcpEnv, setNewMcpEnv] = useState("");
    const [newMcpUrl, setNewMcpUrl] = useState("");

    const toggleKeyVisibility = (id: string) => {
        setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const maskKey = (key: string) => {
        if (key.length <= 8) return "••••••••";
        return key.slice(0, 4) + "••••••••" + key.slice(-4);
    };

    const getProvidersList = (type: ApiKey["type"]) => {
        switch (type) {
            case "llm":
                return llmProviders;
            case "scraper":
                return scraperProviders;
            case "embedding":
                return embeddingProviders;
            default:
                return [];
        }
    };

    const handleAddKey = useCallback(async () => {
        if (!newKeyName || !newKeyProvider || !newKeyValue) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            // Determine the env key based on provider
            let envKey = newKeyName.toUpperCase().replace(/\s+/g, "_");
            if (newKeyProvider === "openai") envKey = "OPENAI_API_KEY";
            if (newKeyProvider === "firecrawl") envKey = "FIRECRAWL_API_KEY";
            if (newKeyProvider === "anthropic") envKey = "ANTHROPIC_API_KEY";
            if (newKeyProvider === "cohere") envKey = "COHERE_API_KEY";

            const res = await fetch("/api/integrations/keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: envKey, value: newKeyValue }),
            });

            if (!res.ok) throw new Error("Failed to save key");

            await fetchKeys();
            setAddKeyOpen(false);
            setNewKeyName("");
            setNewKeyProvider("");
            setNewKeyValue("");
            toast.success("API key added", {
                description: `${newKeyName} has been saved.`,
            });
        } catch (error) {
            toast.error("Failed to save key");
        }
    }, [newKeyName, newKeyType, newKeyProvider, newKeyValue, fetchKeys]);

    const handleAddMcp = useCallback(() => {
        if (!newMcpName) {
            toast.error("Please provide a server name");
            return;
        }

        const newServer: McpServer = {
            id: crypto.randomUUID(),
            name: newMcpName,
            type: newMcpType,
            ...(newMcpType === "stdio"
                ? {
                    command: newMcpCommand,
                    args: newMcpArgs.split(" ").filter(Boolean),
                    env: newMcpEnv
                        ? Object.fromEntries(
                            newMcpEnv.split("\n").map((line) => {
                                const [key, ...value] = line.split("=");
                                return [key.trim(), value.join("=").trim()];
                            })
                        )
                        : {},
                }
                : { url: newMcpUrl }),
            isActive: true,
        };

        setMcpServers((prev) => [...prev, newServer]);
        setAddMcpOpen(false);
        setNewMcpName("");
        setNewMcpArgs("");
        setNewMcpEnv("");
        setNewMcpUrl("");
        toast.success("MCP server added", {
            description: `${newMcpName} has been configured.`,
        });
    }, [newMcpName, newMcpType, newMcpCommand, newMcpArgs, newMcpEnv, newMcpUrl]);

    const handleDeleteKey = async (id: string) => {
        try {
            const res = await fetch("/api/integrations/keys", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: id }),
            });

            if (!res.ok) throw new Error("Failed to delete key");

            await fetchKeys();
            toast.success("API key removed");
        } catch (error) {
            toast.error("Failed to delete key");
        }
    };

    const handleDeleteMcp = (id: string) => {
        const server = mcpServers.find((s) => s.id === id);
        setMcpServers((prev) => prev.filter((s) => s.id !== id));
        toast.success("MCP server removed", {
            description: `${server?.name} has been deleted.`,
        });
    };

    const handleToggleKey = (id: string) => {
        setApiKeys((prev) =>
            prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k))
        );
    };

    const handleToggleMcp = (id: string) => {
        setMcpServers((prev) =>
            prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
        );
    };

    const getTypeIcon = (type: ApiKey["type"]) => {
        switch (type) {
            case "llm":
                return <Bot className="h-4 w-4" />;
            case "scraper":
                return <Globe className="h-4 w-4" />;
            case "embedding":
                return <Sparkles className="h-4 w-4" />;
            default:
                return <Key className="h-4 w-4" />;
        }
    };

    const getTypeColor = (type: ApiKey["type"]) => {
        switch (type) {
            case "llm":
                return "bg-purple-500/10 text-purple-500";
            case "scraper":
                return "bg-blue-500/10 text-blue-500";
            case "embedding":
                return "bg-amber-500/10 text-amber-500";
            default:
                return "bg-zinc-500/10 text-zinc-500";
        }
    };

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Settings2 className="h-8 w-8 text-muted-foreground" />
                    Integrations
                </h2>
                <p className="text-muted-foreground">
                    Manage your API keys, MCP servers, and external service connections.
                </p>
            </motion.div>

            <Tabs defaultValue="api-keys" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="api-keys" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Keys
                    </TabsTrigger>
                    <TabsTrigger value="mcp-servers" className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        MCP Servers
                    </TabsTrigger>
                </TabsList>

                {/* API Keys Tab */}
                <TabsContent value="api-keys" className="space-y-6">
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>API Keys</CardTitle>
                                    <CardDescription>
                                        Store API keys for LLMs, scrapers, and other services
                                    </CardDescription>
                                </div>
                                <Dialog open={addKeyOpen} onOpenChange={setAddKeyOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add API Key
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add API Key</DialogTitle>
                                            <DialogDescription>
                                                Store a new API key securely
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input
                                                    placeholder="e.g., OpenAI Production"
                                                    value={newKeyName}
                                                    onChange={(e) => setNewKeyName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Type</Label>
                                                <Select
                                                    value={newKeyType}
                                                    onValueChange={(v) => {
                                                        setNewKeyType(v as ApiKey["type"]);
                                                        setNewKeyProvider("");
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="llm">LLM Provider</SelectItem>
                                                        <SelectItem value="scraper">Web Scraper</SelectItem>
                                                        <SelectItem value="embedding">Embedding Model</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Provider</Label>
                                                <Select
                                                    value={newKeyProvider}
                                                    onValueChange={setNewKeyProvider}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select provider" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {getProvidersList(newKeyType).map((p) => (
                                                            <SelectItem key={p.value} value={p.value}>
                                                                {p.label}
                                                            </SelectItem>
                                                        ))}
                                                        {newKeyType === "other" && (
                                                            <SelectItem value="custom">Custom</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Key</Label>
                                                <Input
                                                    type="password"
                                                    placeholder={
                                                        getProvidersList(newKeyType).find(
                                                            (p) => p.value === newKeyProvider
                                                        )?.placeholder || "Enter API key"
                                                    }
                                                    value={newKeyValue}
                                                    onChange={(e) => setNewKeyValue(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setAddKeyOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleAddKey}>Save Key</Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {apiKeys.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Key className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium">No API keys</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Add your first API key to get started
                                        </p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-3">
                                            {apiKeys.map((apiKey) => (
                                                <div
                                                    key={apiKey.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-4 rounded-lg border",
                                                        apiKey.isActive
                                                            ? "bg-card"
                                                            : "bg-muted/50 opacity-60"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className={cn(
                                                                "h-10 w-10 rounded-lg flex items-center justify-center",
                                                                getTypeColor(apiKey.type)
                                                            )}
                                                        >
                                                            {getTypeIcon(apiKey.type)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{apiKey.name}</p>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {apiKey.provider}
                                                                </Badge>
                                                                {apiKey.isActive ? (
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                                ) : (
                                                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                                                    {showKeys[apiKey.id]
                                                                        ? apiKey.key
                                                                        : maskKey(apiKey.key)}
                                                                </code>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => toggleKeyVisibility(apiKey.id)}
                                                                >
                                                                    {showKeys[apiKey.id] ? (
                                                                        <EyeOff className="h-3 w-3" />
                                                                    ) : (
                                                                        <Eye className="h-3 w-3" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() =>
                                                                        copyToClipboard(apiKey.id, apiKey.key)
                                                                    }
                                                                >
                                                                    {copied === apiKey.id ? (
                                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="h-3 w-3" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={apiKey.isActive}
                                                            onCheckedChange={() => handleToggleKey(apiKey.id)}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => handleDeleteKey(apiKey.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Quick Reference */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Supported Providers</CardTitle>
                                <CardDescription>
                                    Quick reference for supported integrations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Bot className="h-4 w-4 text-purple-500" />
                                            LLM Providers
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {llmProviders.map((p) => (
                                                <Badge key={p.value} variant="outline" className="text-xs">
                                                    {p.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Globe className="h-4 w-4 text-blue-500" />
                                            Web Scrapers
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {scraperProviders.map((p) => (
                                                <Badge key={p.value} variant="outline" className="text-xs">
                                                    {p.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Sparkles className="h-4 w-4 text-amber-500" />
                                            Embeddings
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {embeddingProviders.map((p) => (
                                                <Badge key={p.value} variant="outline" className="text-xs">
                                                    {p.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>

                {/* MCP Servers Tab */}
                <TabsContent value="mcp-servers" className="space-y-6">
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>MCP Servers</CardTitle>
                                    <CardDescription>
                                        Configure Model Context Protocol servers for AI tools
                                    </CardDescription>
                                </div>
                                <Dialog open={addMcpOpen} onOpenChange={setAddMcpOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add MCP Server
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-xl">
                                        <DialogHeader>
                                            <DialogTitle>Add MCP Server</DialogTitle>
                                            <DialogDescription>
                                                Configure a new MCP server connection
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Server Name</Label>
                                                <Input
                                                    placeholder="e.g., mongodb, filesystem"
                                                    value={newMcpName}
                                                    onChange={(e) => setNewMcpName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Transport Type</Label>
                                                <Select
                                                    value={newMcpType}
                                                    onValueChange={(v) => setNewMcpType(v as "stdio" | "sse")}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="stdio">stdio (Local Command)</SelectItem>
                                                        <SelectItem value="sse">SSE (Remote Server)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {newMcpType === "stdio" ? (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label>Command</Label>
                                                        <Select
                                                            value={newMcpCommand}
                                                            onValueChange={setNewMcpCommand}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="npx">npx</SelectItem>
                                                                <SelectItem value="node">node</SelectItem>
                                                                <SelectItem value="python">python</SelectItem>
                                                                <SelectItem value="uvx">uvx</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Arguments (space-separated)</Label>
                                                        <Input
                                                            placeholder="-y mongodb-mcp-server@latest"
                                                            value={newMcpArgs}
                                                            onChange={(e) => setNewMcpArgs(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Environment Variables (KEY=value, one per line)</Label>
                                                        <Textarea
                                                            placeholder="MDB_MCP_CONNECTION_STRING=mongodb+srv://..."
                                                            value={newMcpEnv}
                                                            onChange={(e) => setNewMcpEnv(e.target.value)}
                                                            className="font-mono text-sm"
                                                            rows={3}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label>Server URL</Label>
                                                    <Input
                                                        placeholder="http://localhost:3001/sse"
                                                        value={newMcpUrl}
                                                        onChange={(e) => setNewMcpUrl(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-2 pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setAddMcpOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleAddMcp}>Add Server</Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {mcpServers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-medium">No MCP servers</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Add your first MCP server configuration
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {mcpServers.map((server) => (
                                            <div
                                                key={server.id}
                                                className={cn(
                                                    "p-4 rounded-lg border",
                                                    server.isActive ? "bg-card" : "bg-muted/50 opacity-60"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Cpu className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{server.name}</p>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {server.type}
                                                                </Badge>
                                                                {server.isActive && (
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                                )}
                                                            </div>
                                                            <code className="text-xs text-muted-foreground font-mono">
                                                                {server.type === "stdio"
                                                                    ? `${server.command} ${server.args?.join(" ")}`
                                                                    : server.url}
                                                            </code>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={server.isActive}
                                                            onCheckedChange={() => handleToggleMcp(server.id)}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => handleDeleteMcp(server.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                {server.env && Object.keys(server.env).length > 0 && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                                            Environment Variables
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.keys(server.env).map((key) => (
                                                                <Badge
                                                                    key={key}
                                                                    variant="secondary"
                                                                    className="text-xs font-mono"
                                                                >
                                                                    {key}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* JSON Export */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Export Configuration</CardTitle>
                                <CardDescription>
                                    Copy this JSON to use in Claude Desktop or other MCP clients
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
                                    {JSON.stringify(
                                        {
                                            mcpServers: Object.fromEntries(
                                                mcpServers
                                                    .filter((s) => s.isActive)
                                                    .map((s) => [
                                                        s.name,
                                                        s.type === "stdio"
                                                            ? {
                                                                type: s.type,
                                                                command: s.command,
                                                                args: s.args,
                                                                env: s.env,
                                                            }
                                                            : { type: s.type, url: s.url },
                                                    ])
                                            ),
                                        },
                                        null,
                                        2
                                    )}
                                </pre>
                                <Button
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => {
                                        const config = {
                                            mcpServers: Object.fromEntries(
                                                mcpServers
                                                    .filter((s) => s.isActive)
                                                    .map((s) => [
                                                        s.name,
                                                        s.type === "stdio"
                                                            ? {
                                                                type: s.type,
                                                                command: s.command,
                                                                args: s.args,
                                                                env: s.env,
                                                            }
                                                            : { type: s.type, url: s.url },
                                                    ])
                                            ),
                                        };
                                        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                                        toast.success("Configuration copied to clipboard");
                                    }}
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Configuration
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}

