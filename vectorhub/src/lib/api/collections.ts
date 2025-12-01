import type { CollectionInfo, CreateCollectionConfig, CollectionStats } from "@/lib/db/adapters/base";
import { ApiError, type ApiErrorResponse } from "./connections";

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

export async function listCollectionsApi(): Promise<CollectionInfo[]> {
    const res = await fetch(BASE_URL, { method: "GET" });
    return handleResponse<CollectionInfo[]>(res);
}

export async function getCollectionApi(name: string): Promise<CollectionInfo> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}`, {
        method: "GET",
    });
    return handleResponse<CollectionInfo>(res);
}

export async function createCollectionApi(config: CreateCollectionConfig): Promise<CollectionInfo> {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
    });
    return handleResponse<CollectionInfo>(res);
}

export async function deleteCollectionApi(name: string, cascade = true): Promise<void> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}?cascade=${cascade}`, {
        method: "DELETE",
    });
    await handleResponse<{ ok: boolean }>(res);
}

export async function getCollectionStatsApi(name: string): Promise<CollectionStats> {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(name)}/stats`, { method: "GET" });
    return handleResponse<CollectionStats>(res);
}
