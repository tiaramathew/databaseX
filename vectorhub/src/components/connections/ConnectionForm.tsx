"use client";

import { useState, useMemo } from "react";
import { ConnectionConfig, VectorDBType } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ConnectionFormProps {
    onSubmit: (data: Partial<ConnectionConfig>) => void;
    onCancel: () => void;
}

// Database categories with icons and descriptions
const databaseOptions: {
    category: string;
    databases: {
        value: VectorDBType;
        label: string;
        description: string;
        badge?: string;
    }[];
}[] = [
    {
        category: "Popular Vector Databases",
        databases: [
            { value: "pinecone", label: "Pinecone", description: "Fully managed vector database" },
            { value: "weaviate", label: "Weaviate", description: "Open-source vector search engine" },
            { value: "qdrant", label: "Qdrant", description: "High-performance vector similarity search" },
            { value: "chromadb", label: "ChromaDB", description: "AI-native open-source embedding database" },
            { value: "milvus", label: "Milvus", description: "Open-source vector database for AI" },
        ],
    },
    {
        category: "Cloud Databases",
        databases: [
            { value: "supabase", label: "Supabase", description: "Open source Firebase alternative with pgvector" },
            { value: "mongodb_atlas", label: "MongoDB Atlas", description: "Multi-cloud vector search" },
            { value: "astra_db", label: "Astra DB", description: "Serverless Cassandra with vector search", badge: "DataStax" },
            { value: "upstash", label: "Upstash", description: "Serverless Redis with vector support" },
            { value: "turbopuffer", label: "Turbopuffer", description: "Serverless vector database" },
        ],
    },
    {
        category: "Graph Databases",
        databases: [
            { value: "neo4j", label: "Neo4j", description: "Graph database with vector index support", badge: "Graph" },
        ],
    },
    {
        category: "Search Engines",
        databases: [
            { value: "elasticsearch", label: "Elasticsearch", description: "Distributed search with vector support" },
            { value: "opensearch", label: "OpenSearch", description: "Open-source search and analytics" },
            { value: "typesense", label: "Typesense", description: "Fast, typo-tolerant search engine" },
            { value: "vespa", label: "Vespa", description: "Big data processing and vector search" },
        ],
    },
    {
        category: "SQL & Relational",
        databases: [
            { value: "pgvector", label: "PostgreSQL + pgvector", description: "Vector similarity in PostgreSQL" },
            { value: "singlestore", label: "SingleStore", description: "Distributed SQL with vector capabilities" },
        ],
    },
    {
        category: "Other Vector Stores",
        databases: [
            { value: "redis", label: "Redis Stack", description: "In-memory vector store" },
            { value: "lancedb", label: "LanceDB", description: "Embedded vector database for AI" },
            { value: "marqo", label: "Marqo", description: "Tensor search engine" },
        ],
    },
];

// Field configuration for each database type
const getFieldsForType = (type: VectorDBType) => {
    switch (type) {
        case "pinecone":
            return [
                { name: "apiKey", label: "API Key", type: "password", required: true, placeholder: "pc-..." },
                { name: "environment", label: "Environment", type: "text", required: true, placeholder: "us-east-1-aws" },
                { name: "indexName", label: "Index Name", type: "text", required: false, placeholder: "my-index" },
            ];
        case "weaviate":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost or weaviate.example.com" },
                { name: "port", label: "Port", type: "number", required: false, placeholder: "8080" },
                { name: "scheme", label: "Scheme", type: "select", options: ["http", "https"], required: true },
                { name: "apiKey", label: "API Key", type: "password", required: false, placeholder: "Optional" },
            ];
        case "qdrant":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "6333" },
                { name: "apiKey", label: "API Key", type: "password", required: false, placeholder: "Optional" },
                { name: "https", label: "Use HTTPS", type: "switch", required: false },
            ];
        case "chromadb":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "8000" },
                { name: "authToken", label: "Auth Token", type: "password", required: false, placeholder: "Optional" },
            ];
        case "milvus":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "19530" },
                { name: "username", label: "Username", type: "text", required: false, placeholder: "Optional" },
                { name: "password", label: "Password", type: "password", required: false, placeholder: "Optional" },
                { name: "secure", label: "Use TLS", type: "switch", required: false },
            ];
        case "supabase":
            return [
                { name: "projectUrl", label: "Project URL", type: "text", required: true, placeholder: "https://xxx.supabase.co" },
                { name: "anonKey", label: "Anon Key", type: "password", required: true, placeholder: "eyJ..." },
                { name: "serviceRoleKey", label: "Service Role Key", type: "password", required: false, placeholder: "Optional for admin operations" },
            ];
        case "mongodb_atlas":
            return [
                { name: "connectionString", label: "Connection String", type: "password", required: true, placeholder: "mongodb+srv://..." },
                { name: "database", label: "Database Name", type: "text", required: true, placeholder: "my_database" },
                { name: "vectorSearchIndexName", label: "Vector Index Name", type: "text", required: true, placeholder: "vector_index" },
            ];
        case "neo4j":
            return [
                { name: "uri", label: "URI", type: "text", required: true, placeholder: "neo4j://localhost:7687" },
                { name: "username", label: "Username", type: "text", required: true, placeholder: "neo4j" },
                { name: "password", label: "Password", type: "password", required: true, placeholder: "password" },
                { name: "database", label: "Database", type: "text", required: false, placeholder: "neo4j (default)" },
            ];
        case "elasticsearch":
            return [
                { name: "node", label: "Node URL", type: "text", required: true, placeholder: "http://localhost:9200" },
                { name: "username", label: "Username", type: "text", required: false, placeholder: "Optional" },
                { name: "password", label: "Password", type: "password", required: false, placeholder: "Optional" },
                { name: "cloudId", label: "Cloud ID", type: "text", required: false, placeholder: "For Elastic Cloud" },
                { name: "indexName", label: "Index Name", type: "text", required: true, placeholder: "my_vectors" },
            ];
        case "pgvector":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "5432" },
                { name: "database", label: "Database", type: "text", required: true, placeholder: "postgres" },
                { name: "username", label: "Username", type: "text", required: true, placeholder: "postgres" },
                { name: "password", label: "Password", type: "password", required: true, placeholder: "password" },
                { name: "tableName", label: "Table Name", type: "text", required: true, placeholder: "embeddings" },
                { name: "ssl", label: "Use SSL", type: "switch", required: false },
            ];
        case "opensearch":
            return [
                { name: "node", label: "Node URL", type: "text", required: true, placeholder: "https://localhost:9200" },
                { name: "username", label: "Username", type: "text", required: false, placeholder: "admin" },
                { name: "password", label: "Password", type: "password", required: false, placeholder: "password" },
                { name: "indexName", label: "Index Name", type: "text", required: true, placeholder: "my_vectors" },
                { name: "ssl", label: "Use SSL", type: "switch", required: false },
            ];
        case "astra_db":
            return [
                { name: "endpoint", label: "API Endpoint", type: "text", required: true, placeholder: "https://xxx.apps.astra.datastax.com" },
                { name: "token", label: "Application Token", type: "password", required: true, placeholder: "AstraCS:..." },
                { name: "collectionName", label: "Collection Name", type: "text", required: true, placeholder: "my_collection" },
            ];
        case "singlestore":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "svc-xxx.svc.singlestore.com" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "3306" },
                { name: "username", label: "Username", type: "text", required: true, placeholder: "admin" },
                { name: "password", label: "Password", type: "password", required: true, placeholder: "password" },
                { name: "database", label: "Database", type: "text", required: true, placeholder: "my_database" },
            ];
        case "typesense":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "8108" },
                { name: "protocol", label: "Protocol", type: "select", options: ["http", "https"], required: true },
                { name: "apiKey", label: "API Key", type: "password", required: true, placeholder: "xyz" },
                { name: "collectionName", label: "Collection Name", type: "text", required: true, placeholder: "documents" },
            ];
        case "vespa":
            return [
                { name: "endpoint", label: "Endpoint", type: "text", required: true, placeholder: "https://my-app.vespa-cloud.io" },
                { name: "apiKey", label: "API Key", type: "password", required: false, placeholder: "Optional" },
                { name: "namespace", label: "Namespace", type: "text", required: true, placeholder: "default" },
            ];
        case "redis":
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "6379" },
                { name: "password", label: "Password", type: "password", required: false, placeholder: "Optional" },
                { name: "tls", label: "Use TLS", type: "switch", required: false },
            ];
        case "upstash":
            return [
                { name: "url", label: "REST URL", type: "text", required: true, placeholder: "https://xxx.upstash.io" },
                { name: "token", label: "Token", type: "password", required: true, placeholder: "AXxx..." },
            ];
        case "lancedb":
            return [
                { name: "uri", label: "URI", type: "text", required: true, placeholder: "./lancedb or s3://bucket/path" },
                { name: "tableName", label: "Table Name", type: "text", required: true, placeholder: "vectors" },
            ];
        case "marqo":
            return [
                { name: "url", label: "URL", type: "text", required: true, placeholder: "http://localhost:8882" },
                { name: "apiKey", label: "API Key", type: "password", required: false, placeholder: "Optional" },
                { name: "indexName", label: "Index Name", type: "text", required: true, placeholder: "my_index" },
            ];
        case "turbopuffer":
            return [
                { name: "apiKey", label: "API Key", type: "password", required: true, placeholder: "tpuf_..." },
                { name: "namespace", label: "Namespace", type: "text", required: true, placeholder: "my_namespace" },
            ];
        default:
            return [
                { name: "host", label: "Host", type: "text", required: true, placeholder: "localhost" },
                { name: "port", label: "Port", type: "number", required: true, placeholder: "8000" },
            ];
    }
};

export function ConnectionForm({ onSubmit, onCancel }: ConnectionFormProps) {
    const [name, setName] = useState("");
    const [type, setType] = useState<VectorDBType>("pinecone");
    const [configValues, setConfigValues] = useState<Record<string, string | boolean>>({});

    const fields = useMemo(() => getFieldsForType(type), [type]);

    const handleConfigChange = (fieldName: string, value: string | boolean) => {
        setConfigValues((prev) => ({ ...prev, [fieldName]: value }));
    };

    const handleTypeChange = (newType: VectorDBType) => {
        setType(newType);
        setConfigValues({}); // Reset config values when type changes
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Build config object from field values
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

        onSubmit({
            name,
            type,
            status: "connected",
            lastSync: new Date(),
            config: config as ConnectionConfig["config"],
        });
    };

    const selectedDb = databaseOptions
        .flatMap((cat) => cat.databases)
        .find((db) => db.value === type);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                    id="name"
                    placeholder="My Vector DB"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="type">Database Type</Label>
                <Select value={type} onValueChange={(v) => handleTypeChange(v as VectorDBType)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select database type" />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[300px]">
                            {databaseOptions.map((category) => (
                                <SelectGroup key={category.category}>
                                    <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-2">
                                        {category.category}
                                    </SelectLabel>
                                    {category.databases.map((db) => (
                                        <SelectItem key={db.value} value={db.value} className="py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{db.label}</span>
                                                {db.badge && (
                                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                                        {db.badge}
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
                {selectedDb && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedDb.description}</p>
                )}
            </div>

            <div className="space-y-4 pt-2">
                {fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                        {field.type === "switch" ? (
                            <div className="flex items-center justify-between">
                                <Label htmlFor={field.name}>{field.label}</Label>
                                <Switch
                                    id={field.name}
                                    checked={!!configValues[field.name]}
                                    onCheckedChange={(checked) => handleConfigChange(field.name, checked)}
                                />
                            </div>
                        ) : field.type === "select" ? (
                            <>
                                <Label htmlFor={field.name}>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                <Select
                                    value={(configValues[field.name] as string) || ""}
                                    onValueChange={(v) => handleConfigChange(field.name, v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {field.options?.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        ) : (
                            <>
                                <Label htmlFor={field.name}>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                <Input
                                    id={field.name}
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    value={(configValues[field.name] as string) || ""}
                                    onChange={(e) => handleConfigChange(field.name, e.target.value)}
                                    required={field.required}
                                />
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">Connect</Button>
            </div>
        </form>
    );
}
