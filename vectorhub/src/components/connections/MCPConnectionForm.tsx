"use client";

import { useState, useCallback } from "react";
import { ConnectionConfig, MCPConfig } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Trash2, Terminal, Globe, ChevronDown, FileJson, Copy, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MCPConnectionFormProps {
    onSubmit: (data: Partial<ConnectionConfig>) => void;
    onCancel: () => void;
}

interface EnvVar {
    key: string;
    value: string;
}

// Popular MCP server templates
const mcpTemplates = [
    {
        name: "MongoDB MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "mongodb-mcp-server@latest", "--readOnly"],
            env: { MDB_MCP_CONNECTION_STRING: "" },
        },
        description: "Connect to MongoDB databases",
        envPlaceholders: { MDB_MCP_CONNECTION_STRING: "mongodb+srv://user:pass@cluster.mongodb.net/" },
    },
    {
        name: "PostgreSQL MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-postgres"],
            env: { POSTGRES_CONNECTION_STRING: "" },
        },
        description: "Connect to PostgreSQL databases",
        envPlaceholders: { POSTGRES_CONNECTION_STRING: "postgresql://user:pass@localhost:5432/db" },
    },
    {
        name: "Filesystem MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
            env: {},
        },
        description: "Access local filesystem",
        envPlaceholders: {},
    },
    {
        name: "GitHub MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-github"],
            env: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
        },
        description: "Interact with GitHub repositories",
        envPlaceholders: { GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_xxxxxxxxxxxx" },
    },
    {
        name: "Brave Search MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-brave-search"],
            env: { BRAVE_API_KEY: "" },
        },
        description: "Web search with Brave API",
        envPlaceholders: { BRAVE_API_KEY: "BSAxxxxxxxxxxxx" },
    },
    {
        name: "Google Drive MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-gdrive"],
            env: {},
        },
        description: "Access Google Drive files",
        envPlaceholders: {},
    },
    {
        name: "Slack MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-slack"],
            env: { SLACK_BOT_TOKEN: "", SLACK_TEAM_ID: "" },
        },
        description: "Interact with Slack workspaces",
        envPlaceholders: { SLACK_BOT_TOKEN: "xoxb-xxxx", SLACK_TEAM_ID: "T0XXXXXXX" },
    },
    {
        name: "Puppeteer MCP Server",
        config: {
            type: "stdio" as const,
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-puppeteer"],
            env: {},
        },
        description: "Browser automation with Puppeteer",
        envPlaceholders: {},
    },
    {
        name: "Custom SSE Server",
        config: {
            type: "sse" as const,
            url: "",
        },
        description: "Connect via Server-Sent Events",
        envPlaceholders: {},
    },
];

export function MCPConnectionForm({ onSubmit, onCancel }: MCPConnectionFormProps) {
    const [name, setName] = useState("");
    const [transportType, setTransportType] = useState<"stdio" | "sse">("stdio");
    const [command, setCommand] = useState("npx");
    const [args, setArgs] = useState<string[]>([]);
    const [argsInput, setArgsInput] = useState("");
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [sseUrl, setSseUrl] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [jsonInput, setJsonInput] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<"form" | "json">("form");
    const [copied, setCopied] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const addEnvVar = useCallback(() => {
        setEnvVars((prev) => [...prev, { key: "", value: "" }]);
    }, []);

    const removeEnvVar = useCallback((index: number) => {
        setEnvVars((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateEnvVar = useCallback((index: number, field: "key" | "value", value: string) => {
        setEnvVars((prev) =>
            prev.map((env, i) => (i === index ? { ...env, [field]: value } : env))
        );
    }, []);

    const addArg = useCallback(() => {
        if (argsInput.trim()) {
            setArgs((prev) => [...prev, argsInput.trim()]);
            setArgsInput("");
        }
    }, [argsInput]);

    const removeArg = useCallback((index: number) => {
        setArgs((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const applyTemplate = useCallback((template: typeof mcpTemplates[0]) => {
        setName(template.name);
        setTransportType(template.config.type);
        
        if (template.config.type === "stdio") {
            setCommand(template.config.command || "npx");
            setArgs(template.config.args || []);
            const envArray = Object.entries(template.config.env || {}).map(([key, value]) => ({
                key,
                value: value || template.envPlaceholders[key] || "",
            }));
            setEnvVars(envArray);
        } else {
            setSseUrl(template.config.url || "");
        }
    }, []);

    const parseJsonConfig = useCallback((json: string) => {
        try {
            const parsed = JSON.parse(json);
            setJsonError(null);
            
            // Handle the format: { "servers": { "name": { ... } } }
            if (parsed.servers) {
                const serverNames = Object.keys(parsed.servers);
                if (serverNames.length > 0) {
                    const serverName = serverNames[0];
                    const serverConfig = parsed.servers[serverName];
                    
                    setName(serverName);
                    setTransportType(serverConfig.type || "stdio");
                    
                    if (serverConfig.type === "sse") {
                        setSseUrl(serverConfig.url || "");
                    } else {
                        setCommand(serverConfig.command || "npx");
                        setArgs(serverConfig.args || []);
                        const envArray = Object.entries(serverConfig.env || {}).map(([key, value]) => ({
                            key,
                            value: value as string,
                        }));
                        setEnvVars(envArray);
                    }
                }
            } else {
                // Handle direct config format
                setTransportType(parsed.type || "stdio");
                if (parsed.type === "sse") {
                    setSseUrl(parsed.url || "");
                } else {
                    setCommand(parsed.command || "npx");
                    setArgs(parsed.args || []);
                    const envArray = Object.entries(parsed.env || {}).map(([key, value]) => ({
                        key,
                        value: value as string,
                    }));
                    setEnvVars(envArray);
                }
            }
        } catch {
            setJsonError("Invalid JSON format");
        }
    }, []);

    const generateJsonConfig = useCallback(() => {
        const config: Record<string, unknown> = {
            servers: {
                [name || "server"]: {
                    type: transportType,
                    ...(transportType === "stdio"
                        ? {
                            command,
                            args,
                            env: envVars.reduce((acc, { key, value }) => {
                                if (key) acc[key] = value;
                                return acc;
                            }, {} as Record<string, string>),
                        }
                        : {
                            url: sseUrl,
                        }),
                },
            },
        };
        return JSON.stringify(config, null, 2);
    }, [name, transportType, command, args, envVars, sseUrl]);

    const copyToClipboard = useCallback(() => {
        navigator.clipboard.writeText(generateJsonConfig());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [generateJsonConfig]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const config: MCPConfig = {
            type: transportType,
            ...(transportType === "stdio"
                ? {
                    command,
                    args,
                    env: envVars.reduce((acc, { key, value }) => {
                        if (key) acc[key] = value;
                        return acc;
                    }, {} as Record<string, string>),
                }
                : {
                    url: sseUrl,
                }),
            authToken: authToken || undefined,
        };

        onSubmit({
            name,
            type: "mcp",
            status: "connected",
            lastSync: new Date(),
            config,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Mode Toggle */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "form" | "json")}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form" className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Form
                    </TabsTrigger>
                    <TabsTrigger value="json" className="flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        JSON Config
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="form" className="space-y-4 mt-4">
                    {/* Templates */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Quick Start Templates</Label>
                        <ScrollArea className="h-[100px]">
                            <div className="flex flex-wrap gap-2">
                                {mcpTemplates.map((template) => (
                                    <Badge
                                        key={template.name}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5"
                                        onClick={() => applyTemplate(template)}
                                    >
                                        {template.name}
                                    </Badge>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Connection Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Server Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            placeholder="mongodb, filesystem, github, etc."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Transport Type */}
                    <div className="space-y-2">
                        <Label>Transport Type</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={transportType === "stdio" ? "default" : "outline"}
                                className="w-full justify-start"
                                onClick={() => setTransportType("stdio")}
                            >
                                <Terminal className="mr-2 h-4 w-4" />
                                stdio
                            </Button>
                            <Button
                                type="button"
                                variant={transportType === "sse" ? "default" : "outline"}
                                className="w-full justify-start"
                                onClick={() => setTransportType("sse")}
                            >
                                <Globe className="mr-2 h-4 w-4" />
                                SSE
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {transportType === "stdio"
                                ? "Run a local command (most common for npx packages)"
                                : "Connect to a remote server via Server-Sent Events"}
                        </p>
                    </div>

                    {transportType === "stdio" ? (
                        <>
                            {/* Command */}
                            <div className="space-y-2">
                                <Label htmlFor="command">
                                    Command <span className="text-destructive">*</span>
                                </Label>
                                <Select value={command} onValueChange={setCommand}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select command" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="npx">npx</SelectItem>
                                        <SelectItem value="node">node</SelectItem>
                                        <SelectItem value="python">python</SelectItem>
                                        <SelectItem value="python3">python3</SelectItem>
                                        <SelectItem value="uvx">uvx</SelectItem>
                                        <SelectItem value="docker">docker</SelectItem>
                                        <SelectItem value="custom">Custom...</SelectItem>
                                    </SelectContent>
                                </Select>
                                {command === "custom" && (
                                    <Input
                                        placeholder="Enter custom command"
                                        onChange={(e) => setCommand(e.target.value)}
                                        className="mt-2"
                                    />
                                )}
                            </div>

                            {/* Arguments */}
                            <div className="space-y-2">
                                <Label>Arguments</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add argument (e.g., -y, @scope/package@latest)"
                                        value={argsInput}
                                        onChange={(e) => setArgsInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addArg();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={addArg}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {args.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {args.map((arg, index) => (
                                            <Badge
                                                key={index}
                                                variant="secondary"
                                                className="flex items-center gap-1 pr-1"
                                            >
                                                <code className="text-xs">{arg}</code>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 hover:bg-destructive/20"
                                                    onClick={() => removeArg(index)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Press Enter or click + to add each argument
                                </p>
                            </div>

                            {/* Environment Variables */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Environment Variables</Label>
                                    <Button type="button" variant="ghost" size="sm" onClick={addEnvVar}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                                {envVars.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">
                                        No environment variables. Click &quot;Add&quot; to configure.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {envVars.map((env, index) => (
                                            <div key={index} className="flex gap-2 items-start">
                                                <Input
                                                    placeholder="KEY"
                                                    value={env.key}
                                                    onChange={(e) => updateEnvVar(index, "key", e.target.value)}
                                                    className="w-1/3 font-mono text-sm"
                                                />
                                                <Input
                                                    placeholder="value"
                                                    type="password"
                                                    value={env.value}
                                                    onChange={(e) => updateEnvVar(index, "value", e.target.value)}
                                                    className="flex-1 font-mono text-sm"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => removeEnvVar(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* SSE URL */
                        <div className="space-y-2">
                            <Label htmlFor="sseUrl">
                                Server URL <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="sseUrl"
                                placeholder="http://localhost:3001/sse"
                                value={sseUrl}
                                onChange={(e) => setSseUrl(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {/* Advanced Options */}
                    <div className="space-y-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-between"
                            onClick={() => setAdvancedOpen(!advancedOpen)}
                        >
                            <span className="text-sm text-muted-foreground">Advanced Options</span>
                            <ChevronDown
                                className={cn(
                                    "h-4 w-4 transition-transform",
                                    advancedOpen && "rotate-180"
                                )}
                            />
                        </Button>
                        {advancedOpen && (
                            <div className="space-y-4 pt-2 pl-2">
                                <div className="space-y-2">
                                    <Label htmlFor="authToken">Auth Token (Optional)</Label>
                                    <Input
                                        id="authToken"
                                        type="password"
                                        placeholder="Bearer token for authenticated servers"
                                        value={authToken}
                                        onChange={(e) => setAuthToken(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {name && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Generated Config</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 mr-1" />
                                    ) : (
                                        <Copy className="h-4 w-4 mr-1" />
                                    )}
                                    {copied ? "Copied!" : "Copy"}
                                </Button>
                            </div>
                            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
                                {generateJsonConfig()}
                            </pre>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="json" className="space-y-4 mt-4">
                    <div className="rounded-md bg-muted/50 p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            Paste your MCP server configuration JSON. Supports both the full format 
                            {" "}<code className="bg-muted px-1 rounded">{"{ servers: { ... } }"}</code> and 
                            direct server config.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="jsonConfig">JSON Configuration</Label>
                        <Textarea
                            id="jsonConfig"
                            placeholder={`{
  "servers": {
    "mongodb": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server@latest"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "mongodb+srv://..."
      }
    }
  }
}`}
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                if (e.target.value.trim()) {
                                    parseJsonConfig(e.target.value);
                                }
                            }}
                            className="min-h-[200px] font-mono text-sm"
                        />
                        {jsonError && (
                            <p className="text-xs text-destructive">{jsonError}</p>
                        )}
                    </div>

                    {!jsonError && jsonInput && name && (
                        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3">
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                ✓ Valid configuration parsed for server &quot;{name}&quot;
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name-json">
                            Server Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name-json"
                            placeholder="Server name (auto-filled from JSON)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!name}>
                    Add Server
                </Button>
            </div>
        </form>
    );
}
