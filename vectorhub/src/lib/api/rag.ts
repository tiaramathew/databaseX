import type { SearchResult } from "@/lib/db/adapters/base";
import { ApiError, type ApiErrorResponse } from "./connections";

const BASE_URL = "/api/rag";

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

export interface RAGAgentConfig {
    type: "mcp" | "webhook" | "mock";
    endpoint?: string;
    name?: string;
}

export interface RAGQueryInput {
    query: string;
    collection: string;
    topK?: number;
    minScore?: number;
    agent?: RAGAgentConfig;
}

export interface RAGQueryResult {
    response: string;
    context: SearchResult[];
    agentUsed: string;
}

export async function ragQueryApi(input: RAGQueryInput): Promise<RAGQueryResult> {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    return handleResponse<RAGQueryResult>(res);
}

