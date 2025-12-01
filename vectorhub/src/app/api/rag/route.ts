import { NextResponse } from "next/server";
import { mockDbClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import type { SearchResult } from "@/lib/db/adapters/base";

interface RAGRequest {
    query: string;
    collection: string;
    topK?: number;
    minScore?: number;
    agent?: {
        type: "mcp" | "webhook" | "mock";
        endpoint?: string;
        name?: string;
    };
}

interface RAGResponse {
    response: string;
    context: SearchResult[];
    agentUsed: string;
}

// Mock AI response generator for demonstration
function generateMockResponse(query: string, context: SearchResult[]): string {
    if (context.length === 0) {
        return `I couldn't find any relevant information in the database for your query: "${query}". Please try rephrasing your question or ensure that relevant documents have been uploaded.`;
    }

    const contextSummary = context
        .slice(0, 3)
        .map((c, i) => `[${i + 1}] ${c.content?.slice(0, 200)}...`)
        .join("\n\n");

    return `Based on the ${context.length} relevant document(s) I found in your vector database, here's what I can tell you:

**Summary:**
The documents contain information related to your query "${query}". The most relevant sources have similarity scores ranging from ${(context[context.length - 1]?.score * 100).toFixed(0)}% to ${(context[0]?.score * 100).toFixed(0)}%.

**Key Information:**
${contextSummary}

**Note:** This is a demonstration response. Connect an AI agent (via MCP or Webhook) to get intelligent responses based on the retrieved context.`;
}

// Call webhook agent
async function callWebhookAgent(
    endpoint: string,
    query: string,
    context: SearchResult[]
): Promise<string> {
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                context: context.map((c) => ({
                    content: c.content,
                    score: c.score,
                    metadata: c.metadata,
                })),
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}`);
        }

        const data = await response.json();
        return data.response || data.message || data.content || JSON.stringify(data);
    } catch (error) {
        logger.error("Webhook agent call failed", error instanceof Error ? error : undefined);
        throw error;
    }
}

// Call MCP agent
async function callMcpAgent(
    endpoint: string,
    query: string,
    context: SearchResult[]
): Promise<string> {
    try {
        // MCP protocol - using a simplified version
        // In a real implementation, this would follow the full MCP spec
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                method: "completion",
                params: {
                    prompt: query,
                    context: context.map((c) => ({
                        content: c.content,
                        relevance: c.score,
                        source: c.metadata?.source,
                    })),
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`MCP endpoint returned ${response.status}`);
        }

        const data = await response.json();
        return data.result?.content || data.response || data.completion || JSON.stringify(data);
    } catch (error) {
        logger.error("MCP agent call failed", error instanceof Error ? error : undefined);
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const body: RAGRequest = await request.json();
        const { query, collection, topK = 5, minScore = 0.5, agent } = body;

        if (!query || !collection) {
            return NextResponse.json(
                {
                    code: "VALIDATION_ERROR",
                    message: "Query and collection are required",
                },
                { status: 400 }
            );
        }

        // Step 1: Retrieve relevant context from vector database
        let context: SearchResult[] = [];
        try {
            context = await mockDbClient.search(collection, {
                text: query,
                topK,
                minScore,
                includeContent: true,
                includeMetadata: true,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.toLowerCase().includes("not found")) {
                return NextResponse.json(
                    {
                        code: "COLLECTION_NOT_FOUND",
                        message: `Collection "${collection}" does not exist`,
                    },
                    { status: 404 }
                );
            }
            throw error;
        }

        // Step 2: Generate response based on agent type
        let response: string;
        let agentUsed: string;

        if (!agent || agent.type === "mock") {
            // Use mock response generator
            response = generateMockResponse(query, context);
            agentUsed = "Demo Mode";
        } else if (agent.type === "webhook" && agent.endpoint) {
            // Call webhook agent
            try {
                response = await callWebhookAgent(agent.endpoint, query, context);
                agentUsed = agent.name || "Webhook Agent";
            } catch {
                response = generateMockResponse(query, context);
                response += "\n\n⚠️ *Webhook agent call failed. Showing demo response.*";
                agentUsed = "Demo Mode (Webhook failed)";
            }
        } else if (agent.type === "mcp" && agent.endpoint) {
            // Call MCP agent
            try {
                response = await callMcpAgent(agent.endpoint, query, context);
                agentUsed = agent.name || "MCP Agent";
            } catch {
                response = generateMockResponse(query, context);
                response += "\n\n⚠️ *MCP agent call failed. Showing demo response.*";
                agentUsed = "Demo Mode (MCP failed)";
            }
        } else {
            response = generateMockResponse(query, context);
            agentUsed = "Demo Mode";
        }

        const result: RAGResponse = {
            response,
            context,
            agentUsed,
        };

        return NextResponse.json(result);
    } catch (error) {
        logger.error("POST /api/rag failed", error instanceof Error ? error : undefined);
        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: "Failed to process RAG request",
            },
            { status: 500 }
        );
    }
}

