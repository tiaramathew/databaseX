"use client";

import { useState } from "react";
import { ConnectionConfig, MCPConfig } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MCPConnectionFormProps {
    onSubmit: (data: Partial<ConnectionConfig>) => void;
    onCancel: () => void;
}

export function MCPConnectionForm({ onSubmit, onCancel }: MCPConnectionFormProps) {
    const [name, setName] = useState("");
    const [serverUrl, setServerUrl] = useState("");
    const [serverName, setServerName] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [vectorCreate, setVectorCreate] = useState(true);
    const [vectorUpdate, setVectorUpdate] = useState(true);
    const [vectorDelete, setVectorDelete] = useState(true);
    const [vectorSearch, setVectorSearch] = useState(true);
    const [embeddingModel, setEmbeddingModel] = useState("");
    const [dimensions, setDimensions] = useState("1536");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const config: MCPConfig = {
            serverUrl,
            serverName,
            authToken: authToken || undefined,
            capabilities: {
                vectorCreate,
                vectorUpdate,
                vectorDelete,
                vectorSearch,
            },
            modelPreferences: {
                embeddingModel: embeddingModel || undefined,
                dimensions: dimensions ? parseInt(dimensions) : undefined,
            },
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
            <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                    id="name"
                    placeholder="My MCP Connection"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="serverUrl">MCP Server URL</Label>
                <Input
                    id="serverUrl"
                    placeholder="http://localhost:3001"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="serverName">Server Name</Label>
                <Input
                    id="serverName"
                    placeholder="vector-db-server"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token (Optional)</Label>
                <Input
                    id="authToken"
                    type="password"
                    placeholder="Enter authentication token"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                />
            </div>

            <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">Capabilities</Label>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="vectorCreate" className="font-normal">Create Vectors</Label>
                        <Switch
                            id="vectorCreate"
                            checked={vectorCreate}
                            onCheckedChange={setVectorCreate}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="vectorUpdate" className="font-normal">Update Vectors</Label>
                        <Switch
                            id="vectorUpdate"
                            checked={vectorUpdate}
                            onCheckedChange={setVectorUpdate}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="vectorDelete" className="font-normal">Delete Vectors</Label>
                        <Switch
                            id="vectorDelete"
                            checked={vectorDelete}
                            onCheckedChange={setVectorDelete}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="vectorSearch" className="font-normal">Search Vectors</Label>
                        <Switch
                            id="vectorSearch"
                            checked={vectorSearch}
                            onCheckedChange={setVectorSearch}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">Model Preferences (Optional)</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="embeddingModel" className="font-normal">Embedding Model</Label>
                        <Input
                            id="embeddingModel"
                            placeholder="text-embedding-ada-002"
                            value={embeddingModel}
                            onChange={(e) => setEmbeddingModel(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dimensions" className="font-normal">Dimensions</Label>
                        <Input
                            id="dimensions"
                            type="number"
                            placeholder="1536"
                            value={dimensions}
                            onChange={(e) => setDimensions(e.target.value)}
                        />
                    </div>
                </div>
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
