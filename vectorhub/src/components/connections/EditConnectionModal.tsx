"use client";

import { useState, useEffect, useMemo } from "react";
import { ConnectionConfig, VectorDBType } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Database, Save, Loader2 } from "lucide-react";

interface EditConnectionModalProps {
    connection: ConnectionConfig | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, updates: Partial<ConnectionConfig>) => Promise<void>;
}

// Field configuration for each database type
const getFieldsForType = (type: VectorDBType) => {
    switch (type) {
        case "pinecone":
            return [
                { name: "apiKey", label: "API Key", type: "password", placeholder: "pc-..." },
                { name: "environment", label: "Environment", type: "text", placeholder: "us-east-1-aws" },
                { name: "indexName", label: "Index Name", type: "text", placeholder: "my-index" },
            ];
        case "weaviate":
            return [
                { name: "host", label: "Host", type: "text", placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", placeholder: "8080" },
                { name: "apiKey", label: "API Key", type: "password", placeholder: "Optional" },
            ];
        case "qdrant":
            return [
                { name: "host", label: "Host", type: "text", placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", placeholder: "6333" },
                { name: "apiKey", label: "API Key", type: "password", placeholder: "Optional" },
                { name: "https", label: "Use HTTPS", type: "switch" },
            ];
        case "chromadb":
            return [
                { name: "host", label: "Host", type: "text", placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", placeholder: "8000" },
                { name: "authToken", label: "Auth Token", type: "password", placeholder: "Optional" },
            ];
        case "supabase":
            return [
                { name: "projectUrl", label: "Project URL", type: "text", placeholder: "https://xxx.supabase.co" },
                { name: "anonKey", label: "Anon Key", type: "password", placeholder: "eyJ..." },
            ];
        case "mongodb_atlas":
            return [
                { name: "connectionString", label: "Connection String", type: "password", placeholder: "mongodb+srv://..." },
                { name: "database", label: "Database Name", type: "text", placeholder: "my_database" },
                { name: "vectorSearchIndexName", label: "Vector Index Name", type: "text", placeholder: "vector_index" },
            ];
        case "neo4j":
            return [
                { name: "uri", label: "URI", type: "text", placeholder: "neo4j://localhost:7687" },
                { name: "username", label: "Username", type: "text", placeholder: "neo4j" },
                { name: "password", label: "Password", type: "password", placeholder: "password" },
                { name: "database", label: "Database", type: "text", placeholder: "neo4j" },
            ];
        case "elasticsearch":
            return [
                { name: "node", label: "Node URL", type: "text", placeholder: "http://localhost:9200" },
                { name: "username", label: "Username", type: "text", placeholder: "Optional" },
                { name: "password", label: "Password", type: "password", placeholder: "Optional" },
                { name: "indexName", label: "Index Name", type: "text", placeholder: "my_vectors" },
            ];
        case "pgvector":
            return [
                { name: "host", label: "Host", type: "text", placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", placeholder: "5432" },
                { name: "database", label: "Database", type: "text", placeholder: "postgres" },
                { name: "username", label: "Username", type: "text", placeholder: "postgres" },
                { name: "password", label: "Password", type: "password", placeholder: "password" },
                { name: "ssl", label: "Use SSL", type: "switch" },
            ];
        case "redis":
            return [
                { name: "host", label: "Host", type: "text", placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", placeholder: "6379" },
                { name: "password", label: "Password", type: "password", placeholder: "Optional" },
                { name: "tls", label: "Use TLS", type: "switch" },
            ];
        default:
            return [
                { name: "host", label: "Host", type: "text", placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", placeholder: "8000" },
            ];
    }
};

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
    webhook: "Webhook",
    mcp: "MCP Server",
};

export function EditConnectionModal({
    connection,
    open,
    onOpenChange,
    onSave,
}: EditConnectionModalProps) {
    const [name, setName] = useState("");
    const [configValues, setConfigValues] = useState<Record<string, string | boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    const fields = useMemo(
        () => (connection ? getFieldsForType(connection.type) : []),
        [connection]
    );

    useEffect(() => {
        if (connection) {
            setName(connection.name);
            // Extract current config values
            const config = connection.config as unknown as Record<string, unknown>;
            const values: Record<string, string | boolean> = {};
            fields.forEach((field) => {
                if (config[field.name] !== undefined) {
                    values[field.name] = config[field.name] as string | boolean;
                }
            });
            setConfigValues(values);
        }
    }, [connection, fields]);

    const handleConfigChange = (fieldName: string, value: string | boolean) => {
        setConfigValues((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleSave = async () => {
        if (!connection) return;

        setIsSaving(true);
        try {
            // Build config object
            const config: Record<string, unknown> = {};
            fields.forEach((field) => {
                const value = configValues[field.name];
                if (value !== undefined && value !== "") {
                    if (field.type === "number") {
                        config[field.name] = parseInt(value as string);
                    } else {
                        config[field.name] = value;
                    }
                }
            });

            await onSave(connection.id, {
                name,
                config: config as unknown as ConnectionConfig["config"],
                lastSync: new Date(),
            });
            onOpenChange(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!connection) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Edit Connection</DialogTitle>
                            <DialogDescription>
                                {dbTypeLabels[connection.type] || connection.type}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-4 py-4 pr-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Connection Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Connection"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Database Type</Label>
                            <Input
                                value={dbTypeLabels[connection.type] || connection.type}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                Database type cannot be changed. Create a new connection instead.
                            </p>
                        </div>

                        {fields.map((field) => (
                            <div key={field.name} className="space-y-2">
                                {field.type === "switch" ? (
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor={field.name}>{field.label}</Label>
                                        <Switch
                                            id={field.name}
                                            checked={!!configValues[field.name]}
                                            onCheckedChange={(checked) =>
                                                handleConfigChange(field.name, checked)
                                            }
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <Label htmlFor={field.name}>{field.label}</Label>
                                        <Input
                                            id={field.name}
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={(configValues[field.name] as string) || ""}
                                            onChange={(e) =>
                                                handleConfigChange(field.name, e.target.value)
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        ))}

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={connection.status} disabled>
                                <SelectTrigger className="bg-muted">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="connected">Connected</SelectItem>
                                    <SelectItem value="disconnected">Disconnected</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !name}>
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

