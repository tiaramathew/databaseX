"use client";

import { useState, useCallback } from "react";
import { ConnectionConfig, WebhookConfig } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Webhook,
    ExternalLink,
    Copy,
    Check,
    Zap,
    ArrowRight,
    Info,
    Settings,
    Link as LinkIcon,
    Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WebhookConnectionFormProps {
    onSubmit: (data: Partial<ConnectionConfig>) => void;
    onCancel: () => void;
}

// Platform integrations
const platforms = [
    {
        id: "make",
        name: "Make.com",
        logo: "🔄",
        description: "Visual automation platform (formerly Integromat)",
        color: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
        docsUrl: "https://www.make.com/en/help/app/webhooks",
        webhookType: "incoming",
        instructions: [
            "Create a new scenario in Make.com",
            "Add the 'Webhooks' module as a trigger",
            "Choose 'Custom webhook' and copy the webhook URL",
            "Paste the URL below as Base URL",
            "Use HTTP module to send data to VectorHub"
        ],
    },
    {
        id: "n8n",
        name: "n8n",
        logo: "⚡",
        description: "Open-source workflow automation",
        color: "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
        docsUrl: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/",
        webhookType: "both",
        instructions: [
            "Create a new workflow in n8n",
            "Add a Webhook node as the trigger",
            "Set the HTTP Method to match your needs (POST/GET)",
            "Copy the production/test URL",
            "Use the HTTP Request node to call VectorHub APIs"
        ],
    },
    {
        id: "zapier",
        name: "Zapier",
        logo: "⚡",
        description: "Connect your apps and automate workflows",
        color: "bg-orange-600/10 border-orange-600/20 text-orange-700 dark:text-orange-400",
        docsUrl: "https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks",
        webhookType: "incoming",
        instructions: [
            "Create a new Zap in Zapier",
            "Choose 'Webhooks by Zapier' as the trigger",
            "Select 'Catch Hook' to receive data",
            "Copy your custom webhook URL",
            "Use 'Webhooks by Zapier' action to send data to VectorHub"
        ],
    },
    {
        id: "pipedream",
        name: "Pipedream",
        logo: "🔗",
        description: "Connect APIs, remarkably fast",
        color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        docsUrl: "https://pipedream.com/docs/workflows/building-workflows/",
        webhookType: "both",
        instructions: [
            "Create a new workflow in Pipedream",
            "Select HTTP/Webhook as the trigger",
            "Copy the unique endpoint URL",
            "Add Node.js or Python steps to process data",
            "Use HTTP Request action to call VectorHub"
        ],
    },
    {
        id: "activepieces",
        name: "Activepieces",
        logo: "🧩",
        description: "Open-source no-code automation",
        color: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
        docsUrl: "https://www.activepieces.com/docs/pieces/overview",
        webhookType: "both",
        instructions: [
            "Create a new flow in Activepieces",
            "Add Webhook trigger to receive events",
            "Configure the webhook settings",
            "Use HTTP Request piece to connect to VectorHub",
            "Set up authentication with API key"
        ],
    },
    {
        id: "custom",
        name: "Custom Webhook",
        logo: "🔧",
        description: "Configure your own webhook endpoint",
        color: "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400",
        docsUrl: "",
        webhookType: "custom",
        instructions: [
            "Enter your webhook endpoint URL",
            "Configure authentication if required",
            "Set up the endpoint paths for CRUD operations",
            "Optionally configure retry and timeout settings"
        ],
    },
];

export function WebhookConnectionForm({ onSubmit, onCancel }: WebhookConnectionFormProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [authType, setAuthType] = useState<WebhookConfig["authType"]>("none");
    const [authValue, setAuthValue] = useState("");
    const [createEndpoint, setCreateEndpoint] = useState("/vectors");
    const [readEndpoint, setReadEndpoint] = useState("/vectors");
    const [updateEndpoint, setUpdateEndpoint] = useState("/vectors");
    const [deleteEndpoint, setDeleteEndpoint] = useState("/vectors");
    const [searchEndpoint, setSearchEndpoint] = useState("/vectors/search");
    const [retryCount, setRetryCount] = useState("3");
    const [timeoutMs, setTimeoutMs] = useState("30000");
    const [copied, setCopied] = useState<string | null>(null);

    const handlePlatformSelect = useCallback((platformId: string) => {
        const platform = platforms.find((p) => p.id === platformId);
        if (platform) {
            setSelectedPlatform(platformId);
            setName(`${platform.name} Integration`);
        }
    }, []);

    const copyToClipboard = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(null), 2000);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const config: WebhookConfig = {
            baseUrl,
            authType,
            authValue: authValue || undefined,
            endpoints: {
                create: createEndpoint,
                read: readEndpoint,
                update: updateEndpoint,
                delete: deleteEndpoint,
                search: searchEndpoint,
            },
            retryCount: parseInt(retryCount),
            timeoutMs: parseInt(timeoutMs),
        };

        onSubmit({
            name,
            type: "webhook",
            status: "connected",
            lastSync: new Date(),
            config,
        });
    };

    const currentPlatform = platforms.find((p) => p.id === selectedPlatform);

    // Example webhook URL for the user's instance
    const exampleWebhookUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/api/webhooks/incoming`
        : "https://your-vectorhub-instance.com/api/webhooks/incoming";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[70vh]">
            <ScrollArea className="h-[calc(70vh-80px)] pr-4">
                <div className="space-y-4 pb-2">
                    {/* Platform Selection */}
                    <div className="space-y-2">
                        <Label>Integration Platform</Label>
                        <Select 
                            value={selectedPlatform || ""} 
                            onValueChange={handlePlatformSelect}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a platform...">
                                    {selectedPlatform && (
                                        <span className="flex items-center gap-2">
                                            <span>{platforms.find(p => p.id === selectedPlatform)?.logo}</span>
                                            <span>{platforms.find(p => p.id === selectedPlatform)?.name}</span>
                                        </span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {platforms.map((platform) => (
                                    <SelectItem key={platform.id} value={platform.id}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{platform.logo}</span>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{platform.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {platform.description}
                                                </span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Platform Instructions */}
                    {currentPlatform && currentPlatform.id !== "custom" && (
                        <Card className="border">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <span>{currentPlatform.logo}</span>
                                    {currentPlatform.name} Setup
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                <ol className="text-xs space-y-2">
                                    {currentPlatform.instructions.map((step, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="flex-shrink-0 h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center justify-center mt-0.5">
                                                {i + 1}
                                            </span>
                                            <span className="text-muted-foreground">{step}</span>
                                        </li>
                                    ))}
                                </ol>

                                <div className="flex items-center gap-3 pt-2">
                                    {currentPlatform.docsUrl && (
                                        <a
                                            href={currentPlatform.docsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                            View docs
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>

                                <Separator />
                                
                                <div className="space-y-1.5">
                                    <Label className="text-xs">VectorHub Webhook URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={exampleWebhookUrl}
                                            className="h-8 text-xs font-mono bg-muted"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2"
                                            onClick={() => copyToClipboard(exampleWebhookUrl, "webhook")}
                                        >
                                            {copied === "webhook" ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Use this URL in {currentPlatform.name} to send data to VectorHub
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Separator />

                    {/* Connection Details */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Connection Name</Label>
                        <Input
                            id="name"
                            placeholder="My Webhook Connection"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="baseUrl">
                            {currentPlatform?.webhookType === "incoming" 
                                ? "Webhook URL (from " + (currentPlatform?.name || "platform") + ")"
                                : "Base URL"
                            }
                        </Label>
                        <Input
                            id="baseUrl"
                            placeholder="https://hook.make.com/xxx or https://api.example.com"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            {currentPlatform?.webhookType === "incoming"
                                ? `Paste the webhook URL you copied from ${currentPlatform?.name}`
                                : "The base URL for your webhook endpoint"
                            }
                        </p>
                    </div>

                    <Tabs defaultValue="auth" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="auth" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Auth
                            </TabsTrigger>
                            <TabsTrigger value="endpoints" className="text-xs">
                                <LinkIcon className="h-3 w-3 mr-1" />
                                Endpoints
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="text-xs">
                                <Settings className="h-3 w-3 mr-1" />
                                Settings
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="auth" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="authType">Authentication Type</Label>
                                <Select value={authType} onValueChange={(v) => setAuthType(v as WebhookConfig["authType"])}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select auth type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="api_key">API Key</SelectItem>
                                        <SelectItem value="bearer">Bearer Token</SelectItem>
                                        <SelectItem value="basic">Basic Auth</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {authType !== "none" && (
                                <div className="space-y-2">
                                    <Label htmlFor="authValue">
                                        {authType === "api_key" && "API Key"}
                                        {authType === "bearer" && "Bearer Token"}
                                        {authType === "basic" && "Credentials (user:pass)"}
                                    </Label>
                                    <Input
                                        id="authValue"
                                        type="password"
                                        placeholder={
                                            authType === "api_key" ? "Enter API key" :
                                            authType === "bearer" ? "Enter bearer token" :
                                            "username:password"
                                        }
                                        value={authValue}
                                        onChange={(e) => setAuthValue(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="rounded-md bg-muted/50 p-3 flex items-start gap-2">
                                <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                    Most automation platforms like Make.com and Zapier handle authentication 
                                    through their UI. You may not need to configure auth here.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="endpoints" className="space-y-3 mt-4">
                            <p className="text-xs text-muted-foreground">
                                Configure endpoint paths for different operations. These are appended to the Base URL.
                            </p>
                            <div className="grid gap-3">
                                <div className="grid grid-cols-4 gap-2 items-center">
                                    <Label className="text-xs text-right">Create (POST)</Label>
                                    <Input
                                        className="col-span-3 h-8 text-xs"
                                        placeholder="/vectors"
                                        value={createEndpoint}
                                        onChange={(e) => setCreateEndpoint(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2 items-center">
                                    <Label className="text-xs text-right">Read (GET)</Label>
                                    <Input
                                        className="col-span-3 h-8 text-xs"
                                        placeholder="/vectors"
                                        value={readEndpoint}
                                        onChange={(e) => setReadEndpoint(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2 items-center">
                                    <Label className="text-xs text-right">Update (PUT)</Label>
                                    <Input
                                        className="col-span-3 h-8 text-xs"
                                        placeholder="/vectors"
                                        value={updateEndpoint}
                                        onChange={(e) => setUpdateEndpoint(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2 items-center">
                                    <Label className="text-xs text-right">Delete (DELETE)</Label>
                                    <Input
                                        className="col-span-3 h-8 text-xs"
                                        placeholder="/vectors"
                                        value={deleteEndpoint}
                                        onChange={(e) => setDeleteEndpoint(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2 items-center">
                                    <Label className="text-xs text-right">Search (POST)</Label>
                                    <Input
                                        className="col-span-3 h-8 text-xs"
                                        placeholder="/vectors/search"
                                        value={searchEndpoint}
                                        onChange={(e) => setSearchEndpoint(e.target.value)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="retryCount">Retry Count</Label>
                                    <Input
                                        id="retryCount"
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={retryCount}
                                        onChange={(e) => setRetryCount(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Number of retry attempts on failure
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="timeoutMs">Timeout (ms)</Label>
                                    <Input
                                        id="timeoutMs"
                                        type="number"
                                        min="1000"
                                        max="120000"
                                        value={timeoutMs}
                                        onChange={(e) => setTimeoutMs(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Request timeout in milliseconds
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* API Documentation */}
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Webhook className="h-4 w-4" />
                                VectorHub API Endpoints
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                    <code className="text-xs">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">POST</span>
                                        <span className="ml-2 text-muted-foreground">/api/documents</span>
                                    </code>
                                    <span className="text-[10px] text-muted-foreground">Add Documents</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                    <code className="text-xs">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">POST</span>
                                        <span className="ml-2 text-muted-foreground">/api/search</span>
                                    </code>
                                    <span className="text-[10px] text-muted-foreground">Vector Search</span>
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                    <code className="text-xs">
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">POST</span>
                                        <span className="ml-2 text-muted-foreground">/api/rag</span>
                                    </code>
                                    <span className="text-[10px] text-muted-foreground">RAG Query</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

            <div className="flex justify-end space-x-2 pt-4 border-t mt-4 flex-shrink-0">
                <Button variant="outline" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!name || !baseUrl}>
                    <Zap className="mr-2 h-4 w-4" />
                    Connect
                </Button>
            </div>
        </form>
    );
}
