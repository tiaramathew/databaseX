import type { VectorDocument } from "@/lib/db/adapters/base";
import { ApiError, type ApiErrorResponse } from "./connections";

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

export interface AddDocumentsResult {
    ids: string[];
}

export interface DeleteDocumentsResult {
    ok: boolean;
    deleted: number;
}

export async function addDocumentsApi(
    collection: string,
    documents: VectorDocument[]
): Promise<string[]> {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, documents }),
    });
    const result = await handleResponse<AddDocumentsResult>(res);
    return result.ids;
}

export async function deleteDocumentsApi(
    collection: string,
    ids: string[]
): Promise<DeleteDocumentsResult> {
    const res = await fetch(BASE_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, ids }),
    });
    return handleResponse<DeleteDocumentsResult>(res);
}
