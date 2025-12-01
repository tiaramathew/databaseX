import { NextResponse } from "next/server";
import { mockDbClient } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import type { SearchResult } from "@/lib/db/adapters/base";

interface RAGRequest {
    query: string;
    collection?: string;
    topK?: number;
    minScore?: number;
    agent?: {
        type: "mcp" | "webhook" | "mock";
        endpoint?: string;
        name?: string;
        config?: {
            type?: "stdio" | "sse";
            command?: string;
            args?: string[];
            url?: string;
            baseUrl?: string;
        };
    };
}

interface RAGResponse {
    response: string;
    context: SearchResult[];
    agentUsed: string;
}

// Generate an AI-like response based on query and context
function generateResponse(query: string, context: SearchResult[], agentName?: string): string {
    const queryLower = query.toLowerCase();
    
    // Handle common conversational queries
    if (queryLower.includes("who are you") || queryLower.includes("what are you")) {
        return `I'm the RAG Assistant for VectorHub! I help you search through your vector database and retrieve relevant information from your uploaded documents.

**My capabilities:**
- Search your vector database for relevant documents
- Retrieve context based on semantic similarity
- Connect to external AI agents (via MCP or Webhook) for intelligent responses

${context.length > 0 ? `\nI found ${context.length} document(s) that might be relevant to your question.` : "\nNo documents are currently loaded. Upload some documents to get started!"}

*${agentName || "Vector Search"}*`;
    }
    
    if (queryLower.includes("where are you from") || queryLower.includes("where do you come from")) {
        return `I'm a RAG (Retrieval-Augmented Generation) assistant built into VectorHub. I run locally in your browser and connect to your configured vector databases and AI services.

${context.length > 0 ? `I'm currently searching through ${context.length} relevant document(s) from your database.` : "I don't have any documents loaded yet - upload some to start exploring!"}

*${agentName || "Vector Search"}*`;
    }
    
    if (queryLower.includes("hello") || queryLower.includes("hi") || queryLower.includes("hey")) {
        return `Hello! 👋 I'm your RAG Assistant. I can help you search through your documents and find relevant information.

**Try asking me:**
- Questions about your uploaded documents
- To summarize specific topics
- To find information about a particular subject

${context.length > 0 ? `\nI found ${context.length} potentially relevant document(s).` : "\n📝 Upload some documents first to unlock my full potential!"}

*${agentName || "Vector Search"}*`;
    }

    if (queryLower.includes("help") || queryLower.includes("what can you do")) {
        return `**Here's what I can do:**

1. **Search Documents** - Find relevant passages from your uploaded files
2. **Semantic Search** - Understand meaning, not just keywords
3. **Connect AI Agents** - Route queries to external AI services (n8n, Make.com, etc.)

**To get started:**
1. Upload documents via the Upload page
2. Select a collection to search
3. Ask me anything about your documents!

${context.length > 0 ? `\n✅ Found ${context.length} document(s) matching your query.` : "\n⚠️ No documents found. Upload some files to search through!"}

*${agentName || "Vector Search"}*`;
    }

    // If we have context, provide a more intelligent response
    if (context.length > 0) {
        const topDoc = context[0];
        const source = (topDoc.metadata?.source as string) || "your documents";
        const preview = topDoc.content?.slice(0, 500) || "";
        
        const contextSummary = context
            .slice(0, 3)
            .map((c, i) => {
                const docSource = (c.metadata?.source as string) || `Document ${i + 1}`;
                const docPreview = c.content?.slice(0, 200) || "No content";
                return `**[${i + 1}] ${docSource}** (${(c.score * 100).toFixed(0)}% match)\n${docPreview}${c.content && c.content.length > 200 ? "..." : ""}`;
            })
            .join("\n\n");

        return `Based on your question "${query}", I found ${context.length} relevant document(s):

${contextSummary}

---
📊 *Searched ${context.length} documents with similarity scores from ${(context[context.length - 1]?.score * 100).toFixed(0)}% to ${(context[0]?.score * 100).toFixed(0)}%*

💡 **Tip:** Connect an AI agent (MCP/Webhook) in the Connections page for more intelligent, conversational responses!

*${agentName || "Vector Search"}*`;
    }

    // No context - general response
    return `I received your question: "${query}"

However, I don't have any documents to search through yet, or no documents matched your query.

**To get better results:**
1. 📤 Upload relevant documents on the Upload page
2. 📁 Select a collection from the Data Source panel
3. 🔧 Lower the "Min similarity score" to find more results
4. 🤖 Connect an AI agent (n8n, Make.com) for intelligent responses

*${agentName || "Vector Search"}*`;
}

// Call any AI agent via HTTP (works for MCP SSE, webhooks, n8n, etc.)
async function callHttpAgent(
    url: string,
    query: string,
    context: SearchResult[],
    agentName: string
): Promise<string> {
    logger.info(`Calling HTTP agent: ${agentName} at ${url}`);
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            // Send in multiple formats for compatibility with different platforms
            query,
            message: query,
            prompt: query,
            text: query,
            context: context.map((c) => ({
                content: c.content,
                score: c.score,
                relevance: c.score,
                metadata: c.metadata,
                source: c.metadata?.source,
            })),
            documents: context.map((c) => c.content),
            timestamp: new Date().toISOString(),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Agent returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Handle various response formats from different platforms
    const result = 
        data.response || 
        data.message || 
        data.content || 
        data.text || 
        data.output || 
        data.result?.content ||
        data.result ||
        data.completion ||
        data.answer;
    
    if (typeof result === "string") {
        return result;
    } else if (result) {
        return typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
    }
    
    // If no known field, return the whole response
    return JSON.stringify(data, null, 2);
}

export async function POST(request: Request) {
    try {
        const body: RAGRequest = await request.json();
        const { query, collection, topK = 5, minScore = 0.5, agent } = body;

        if (!query) {
            return NextResponse.json(
                {
                    code: "VALIDATION_ERROR",
                    message: "Query is required",
                },
                { status: 400 }
            );
        }

        // Step 1: Retrieve relevant context from vector database (if collection specified)
        let context: SearchResult[] = [];
        
        if (collection) {
            try {
                context = await mockDbClient.search(collection, {
                    text: query,
                    topK,
                    minScore,
                    includeContent: true,
                    includeMetadata: true,
                });
                logger.info(`Retrieved ${context.length} documents from collection "${collection}"`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                logger.warn(`Collection search failed: ${errorMessage}`);
                // Continue without context rather than failing
            }
        }

        // Step 2: Generate response based on agent type
        let response: string;
        let agentUsed: string;
        const agentName = agent?.name || "Vector Search";

        if (!agent || agent.type === "mock") {
            // Use built-in response generator
            response = generateResponse(query, context, "Vector Search");
            agentUsed = "Vector Search";
        } else {
            // For both webhook and MCP types, try to call the HTTP endpoint
            const endpoint = agent.endpoint || agent.config?.url || agent.config?.baseUrl;
            
            if (endpoint) {
                try {
                    response = await callHttpAgent(endpoint, query, context, agentName);
                    agentUsed = agentName;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : "Unknown error";
                    logger.error(`Agent call failed (${agent.type}): ${errorMsg}`);
                    response = generateResponse(query, context, agentName);
                    response += `\n\n⚠️ *Could not reach ${agentName}.*\n*Error: ${errorMsg}*`;
                    agentUsed = `${agentName} (fallback)`;
                }
            } else {
                // No endpoint - use vector search only
                response = generateResponse(query, context, "Vector Search");
                response += `\n\n💡 *No HTTP endpoint configured for ${agentName}. Please add a webhook URL in the connection settings.*`;
                agentUsed = "Vector Search";
            }
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
                message: error instanceof Error ? error.message : "Failed to process RAG request",
            },
            { status: 500 }
        );
    }
}

