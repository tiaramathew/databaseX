import type { CollectionInfo, CreateCollectionConfig, CollectionStats } from "@/lib/db/adapters/base";
import { ApiError, type ApiErrorResponse } from "./connections";
import { ConnectionConfig } from "@/types/connections";

const BASE_URL = "/api/collections";

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorData: ApiErrorResponse;
        try {
            errorData = await response.json();
        } catch {
            errorData = {
                code: "UNKNOWN_ERROR",
                message: `Request failed with status ${response.status}`,
            };
        }
        throw new ApiError(errorData, response.status);
    }
    return response.json();
}

// Helper to add connection config to headers
const getHeaders = (config?: ConnectionConfig) => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (config) {
        headers["x-connection-config"] = JSON.stringify(config);
    }
    return headers;
};

export async function listCollectionsApi(config?: ConnectionConfig): Promise<CollectionInfo[]> {
    const res = await fetch(BASE_URL, {
        method: "GET",
        headers: getHeaders(config),
    });
    return handleResponse<CollectionInfo[]>(res);
}

export async function getCollectionApi(name: string, config?: ConnectionConfig): Promise<CollectionInfo> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}`, {
        method: "GET",
        headers: getHeaders(config),
    });
    return handleResponse<CollectionInfo>(res);
}

export async function createCollectionApi(config: CreateCollectionConfig, connectionConfig?: ConnectionConfig): Promise<CollectionInfo> {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: getHeaders(connectionConfig),
        body: JSON.stringify(config),
    });
    return handleResponse<CollectionInfo>(res);
}

export async function deleteCollectionApi(name: string, cascade = true, config?: ConnectionConfig): Promise<void> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}?cascade=${cascade}`, {
        method: "DELETE",
        headers: getHeaders(config),
    });
    await handleResponse<{ ok: boolean }>(res);
}

export async function getCollectionStatsApi(name: string, config?: ConnectionConfig): Promise<CollectionStats> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}/stats`, {
        method: "GET",
        headers: getHeaders(config),
    });
    return handleResponse<CollectionStats>(res);
}

export async function updateCollectionApi(name: string, updates: Partial<CollectionInfo>, config?: ConnectionConfig): Promise<void> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: getHeaders(config),
        body: JSON.stringify(updates),
    });
    await handleResponse<{ ok: boolean }>(res);
}
