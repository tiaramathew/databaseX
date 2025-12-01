import type { VectorDocument } from "@/lib/db/adapters/base";
import { ApiError, type ApiErrorResponse } from "./connections";
import { ConnectionConfig } from "@/types/connections";

const BASE_URL = "/api/documents";

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

export interface AddDocumentsResult {
    ids: string[];
}

export interface DeleteDocumentsResult {
    ok: boolean;
    deleted: number;
}

export async function listDocumentsApi(
    collection: string,
    config?: ConnectionConfig,
    limit = 100,
    skip = 0
): Promise<VectorDocument[]> {
    const params = new URLSearchParams({
        collection,
        limit: limit.toString(),
        skip: skip.toString(),
    });
    
    const res = await fetch(`${BASE_URL}?${params}`, {
        method: "GET",
        headers: getHeaders(config),
    });
    return handleResponse<VectorDocument[]>(res);
}

export async function addDocumentsApi(
    collection: string,
    documents: VectorDocument[],
    config?: ConnectionConfig
): Promise<string[]> {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: getHeaders(config),
        body: JSON.stringify({ collection, documents }),
    });
    const result = await handleResponse<AddDocumentsResult>(res);
    return result.ids;
}

export async function deleteDocumentsApi(
    collection: string,
    ids: string[],
    config?: ConnectionConfig
): Promise<DeleteDocumentsResult> {
    const res = await fetch(BASE_URL, {
        method: "DELETE",
        headers: getHeaders(config),
        body: JSON.stringify({ collection, ids }),
    });
    return handleResponse<DeleteDocumentsResult>(res);
}
