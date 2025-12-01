import type { SearchQuery, SearchResult } from "@/lib/db/adapters/base";
import { ApiError, type ApiErrorResponse } from "./connections";

const BASE_URL = "/api/search";

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

export interface SearchOptions {
    collection: string;
    query: SearchQuery;
}

export async function searchApi(
    collection: string,
    query: SearchQuery
): Promise<SearchResult[]> {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, query }),
    });
    return handleResponse<SearchResult[]>(res);
}

export async function searchWithOptionsApi(
    options: SearchOptions
): Promise<SearchResult[]> {
    return searchApi(options.collection, options.query);
}
