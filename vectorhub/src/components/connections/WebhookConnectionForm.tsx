"use client";

import { useState } from "react";
import { ConnectionConfig, WebhookConfig } from "@/types/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WebhookConnectionFormProps {
    onSubmit: (data: Partial<ConnectionConfig>) => void;
    onCancel: () => void;
}

export function WebhookConnectionForm({ onSubmit, onCancel }: WebhookConnectionFormProps) {
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                    id="baseUrl"
                    placeholder="https://api.example.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    required
                />
            </div>

            <Tabs defaultValue="auth" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="auth">Authentication</TabsTrigger>
                    <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
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
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="endpoints" className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="createEndpoint">Create Endpoint (POST)</Label>
                        <Input
                            id="createEndpoint"
                            placeholder="/vectors"
                            value={createEndpoint}
                            onChange={(e) => setCreateEndpoint(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="readEndpoint">Read Endpoint (GET)</Label>
                        <Input
                            id="readEndpoint"
                            placeholder="/vectors"
                            value={readEndpoint}
                            onChange={(e) => setReadEndpoint(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="updateEndpoint">Update Endpoint (PUT)</Label>
                        <Input
                            id="updateEndpoint"
                            placeholder="/vectors"
                            value={updateEndpoint}
                            onChange={(e) => setUpdateEndpoint(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deleteEndpoint">Delete Endpoint (DELETE)</Label>
                        <Input
                            id="deleteEndpoint"
                            placeholder="/vectors"
                            value={deleteEndpoint}
                            onChange={(e) => setDeleteEndpoint(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="searchEndpoint">Search Endpoint (POST)</Label>
                        <Input
                            id="searchEndpoint"
                            placeholder="/vectors/search"
                            value={searchEndpoint}
                            onChange={(e) => setSearchEndpoint(e.target.value)}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">Connect</Button>
            </div>
        </form>
    );
}
