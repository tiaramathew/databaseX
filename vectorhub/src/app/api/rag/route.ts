import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { SearchResult } from "@/lib/db/adapters/base";
import OpenAI from "openai";
import { MongoClient } from "mongodb";
import { generateEmbedding } from "@/lib/embeddings";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface RAGRequest {
    query: string;
    collection?: string;
    topK?: number;
    minScore?: number;
    history?: { role: string; content: string }[];
    connectionConfig?: {
        connectionString: string;
        database: string;
        vectorSearchIndexName?: string;
        embeddingField?: string;
    };
    agent?: {
        type: "mcp" | "webhook" | "mock";
        endpoint?: string;
        authHeader?: string;
        name?: string;
        config?: {
            type?: "stdio" | "sse";
            command?: string;
            args?: string[];
            url?: string;
            baseUrl?: string;
            webhookUrl?: string;
            authToken?: string;
        };
    };
}

// Search MongoDB Atlas using vector search
async function searchMongoDB(
    connectionString: string,
    database: string,
    collection: string,
    query: string,
    topK: number,
    minScore: number,
    vectorSearchIndexName: string = "vector_index",
    embeddingField: string = "embedding"
): Promise<SearchResult[]> {
    const client = new MongoClient(connectionString);
    
    try {
        await client.connect();
        const db = client.db(database);
        const col = db.collection(collection);
        
        // Generate embedding for the query
        const vector = await generateEmbedding(query);
        
        // Use MongoDB Atlas Vector Search
        const pipeline = [
            {
                $vectorSearch: {
                    index: vectorSearchIndexName,
                    path: embeddingField,
                    queryVector: vector,
                    numCandidates: topK * 10,
                    limit: topK,
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    metadata: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
            {
                $match: {
                    score: { $gte: minScore },
                },
            },
        ];
        
        const results = await col.aggregate(pipeline).toArray();
        
        return results.map((doc) => ({
            id: doc._id.toString(),
            score: doc.score,
            content: doc.content || "",
            metadata: doc.metadata || {},
        }));
    } finally {
        await client.close();
    }
}

interface RAGResponse {
    response: string;
    context: SearchResult[];
    agentUsed: string;
}

// Generate an AI response using OpenAI based on query and context
async function generateAIResponse(
    query: string, 
    context: SearchResult[], 
    agentName?: string,
    history?: { role: string; content: string }[]
): Promise<string> {
    try {
        // Build context string from retrieved documents
        let contextStr = "";
        if (context.length > 0) {
            contextStr = context
                .map((c, i) => {
                    const source = (c.metadata?.source as string) || `Document ${i + 1}`;
                    return `[Source: ${source}, Score: ${(c.score * 100).toFixed(0)}%]\n${c.content}`;
                })
                .join("\n\n---\n\n");
        }

        // Build message history for chat
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
            {
                role: "system",
                content: `You are VectorHub Assistant, a helpful AI that answers questions based on the user's documents stored in a vector database.

${context.length > 0 ? `You have access to the following relevant documents retrieved from the database:

${contextStr}

Use these documents to answer the user's question. If the information in the documents is relevant, cite the sources. If the documents don't contain enough information to fully answer, say so and provide what you can based on the available context.` : `No documents were found matching the user's query. Let them know this and offer helpful suggestions like:
- Uploading relevant documents on the Upload page
- Selecting a different collection
- Lowering the minimum similarity score
- Trying different search terms`}

Be concise, helpful, and conversational. Format your responses using markdown when appropriate.`
            }
        ];

        // Add conversation history if provided
        if (history && history.length > 0) {
            for (const msg of history.slice(-10)) { // Keep last 10 messages for context
                if (msg.role === "user" || msg.role === "assistant") {
                    messages.push({
                        role: msg.role as "user" | "assistant",
                        content: msg.content
                    });
                }
            }
        }

        // Add current query
        messages.push({
            role: "user",
            content: query
        });

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using a faster, cheaper model for chat
            messages,
            max_tokens: 1024,
            temperature: 0.7,
        });

        const aiResponse = response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
        
        return aiResponse;
    } catch (error) {
        logger.error("OpenAI API call failed", error instanceof Error ? error : undefined);
        // Fallback to simple response if AI fails
        return generateFallbackResponse(query, context, agentName);
    }
}

// Fallback response when AI is unavailable
function generateFallbackResponse(query: string, context: SearchResult[], agentName?: string): string {
    if (context.length > 0) {
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

*${agentName || "Vector Search"}*`;
    }

    return `I received your question: "${query}"

However, I don't have any documents to search through yet, or no documents matched your query.

**To get better results:**
1. Upload relevant documents on the Upload page
2. Select a collection from the Data Source panel
3. Lower the "Min similarity score" to find more results

*${agentName || "Vector Search"}*`;
}

// Make MCP JSON-RPC request
async function mcpRequest(
    url: string,
    method: string,
    params: Record<string, unknown>,
    headers: Record<string, string>
): Promise<any> {
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params,
        }),
    });

    const text = await response.text();

    // Parse SSE or JSON response
    if (text.includes("data: ")) {
        const lines = text.split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                try {
                    return JSON.parse(line.slice(6));
                } catch {
                    continue;
                }
            }
        }
    }

    return JSON.parse(text);
}

// Call any AI agent via HTTP (works for MCP SSE, webhooks, n8n, etc.)
async function callHttpAgent(
    url: string,
    query: string,
    context: SearchResult[],
    agentName: string,
    authHeader?: string,
    history?: { role: string; content: string }[]
): Promise<string> {
    logger.info(`Calling HTTP agent: ${agentName} at ${url}`);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    };

    // Add authorization header if provided
    if (authHeader) {
        headers["Authorization"] = authHeader.startsWith("Bearer ")
            ? authHeader
            : `Bearer ${authHeader}`;
    }

    // Step 1: List available tools
    logger.info("Fetching available MCP tools...");
    let tools: { name: string; description?: string }[] = [];

    try {
        const toolsResponse = await mcpRequest(url, "tools/list", {}, headers);
        if (toolsResponse.result?.tools) {
            tools = toolsResponse.result.tools;
            logger.info(`Found ${tools.length} tools: ${tools.map(t => t.name).join(", ")}`);
        }
    } catch (err) {
        logger.warn("Could not list tools, will try direct call");
    }

    // Step 2: Handle n8n MCP server (management API)
    const hasSearchWorkflows = tools.some(t => t.name === "search_workflows");
    const hasExecuteWorkflow = tools.some(t => t.name === "execute_workflow");

    if (hasSearchWorkflows && hasExecuteWorkflow) {
        logger.info("Detected n8n MCP management server, using workflow execution flow");

        try {
            // Step 2a: Search for workflows (try without filters first to get all, then filter)
            const searchResponse = await mcpRequest(url, "tools/call", {
                name: "search_workflows",
                arguments: { activeOnly: true },
            }, headers);

            if (searchResponse.error) {
                throw new Error(`Failed to search workflows: ${searchResponse.error.message}`);
            }

            // Parse workflow list from response
            let workflows: { id: string; name: string }[] = [];
            const searchResult = searchResponse.result;
            
            logger.info("n8n search_workflows response", { result: searchResult });

            if (searchResult?.content) {
                const contentStr = Array.isArray(searchResult.content)
                    ? searchResult.content.map((c: any) => c.text || c.content || "").join("")
                    : typeof searchResult.content === "string" ? searchResult.content : JSON.stringify(searchResult.content);

                logger.info("Parsed content string", { preview: contentStr.substring(0, 500) });

                // Try to parse as JSON first (n8n might return JSON array)
                try {
                    const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(parsed)) {
                            workflows = parsed.map((w: any) => ({
                                id: w.id || w.workflowId || "",
                                name: w.name || w.title || `Workflow`,
                            })).filter((w: any) => w.id);
                            logger.info(`Parsed ${workflows.length} workflows from JSON`);
                        }
                    }
                } catch {
                    // Not JSON, try regex patterns
                }

                // Fallback to regex patterns if JSON parsing didn't work
                if (workflows.length === 0) {
                    // Try pattern: ID: xxx, Name: xxx
                    const idMatches = contentStr.match(/ID:\s*(\w+)/gi) || [];
                    const nameMatches = contentStr.match(/Name:\s*([^\n,\]]+)/gi) || [];

                    for (let i = 0; i < idMatches.length; i++) {
                        const id = idMatches[i]?.replace(/ID:\s*/i, "").trim();
                        const name = nameMatches[i]?.replace(/Name:\s*/i, "").trim() || `Workflow ${i + 1}`;
                        if (id) {
                            workflows.push({ id, name });
                        }
                    }

                    // Also try pattern: "id": "xxx" or id: xxx
                    if (workflows.length === 0) {
                        const altIdMatches = contentStr.match(/"id"\s*:\s*"([^"]+)"/gi) || 
                                            contentStr.match(/id\s*:\s*(\w+)/gi) || [];
                        const altNameMatches = contentStr.match(/"name"\s*:\s*"([^"]+)"/gi) || [];
                        
                        for (let i = 0; i < altIdMatches.length; i++) {
                            const idMatch = altIdMatches[i].match(/:\s*"?([^"]+)"?/);
                            const nameMatch = altNameMatches[i]?.match(/:\s*"([^"]+)"/);
                            const id = idMatch?.[1]?.trim();
                            const name = nameMatch?.[1]?.trim() || `Workflow ${i + 1}`;
                            if (id) {
                                workflows.push({ id, name });
                            }
                        }
                    }
                }
            }

            logger.info(`Found ${workflows.length} active workflows`);

            if (workflows.length === 0) {
                return `No active workflows found in n8n. Please activate a workflow to use for RAG queries.\n\n**Available n8n MCP tools:**\n${tools.map(t => `- ${t.name}: ${t.description || ""}`).join("\n")}`;
            }

            // Step 2b: Execute the first active workflow with the query
            const workflowToUse = workflows[0];
            logger.info(`Executing workflow: ${workflowToUse.name} (${workflowToUse.id})`);

            const executeResponse = await mcpRequest(url, "tools/call", {
                name: "execute_workflow",
                arguments: {
                    workflowId: workflowToUse.id,
                    data: {
                        message: query,
                        query: query,
                        input: query,
                        history: history, // Pass history to n8n workflow
                        context: context.length > 0 ? context.map(c => c.content).join("\n\n") : undefined,
                    },
                },
            }, headers);

            if (executeResponse.error) {
                throw new Error(`Workflow execution failed: ${executeResponse.error.message}`);
            }

            // Parse execution result
            const execResult = executeResponse.result;
            if (execResult?.content) {
                if (Array.isArray(execResult.content)) {
                    return execResult.content.map((c: any) => c.text || c.content || JSON.stringify(c)).join("\n");
                }
                return typeof execResult.content === "string" ? execResult.content : JSON.stringify(execResult.content, null, 2);
            }

            return execResult ? JSON.stringify(execResult, null, 2) : "Workflow executed but returned no content.";

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            logger.error(`n8n workflow execution failed: ${errorMsg}`);

            // Return helpful message about n8n setup
            let helpfulHint = "";
            if (errorMsg.includes("Unused Respond to Webhook node")) {
                helpfulHint = "\n\n💡 **Hint:** Your n8n workflow has a 'Respond to Webhook' node, but the execution path didn't reach it. Check your workflow logic to ensure the response node is executed.";
            }

            return `**Could not execute n8n workflow.**

Error: ${errorMsg}${helpfulHint}

**To use n8n for RAG queries, you have two options:**

**Option 1: Use n8n Webhook (Recommended)**
1. Create a workflow with a Webhook trigger
2. Add an AI node (OpenAI, Claude, etc.)
3. Copy the webhook URL
4. Add it to your n8n connection's "Webhook URL" field

**Option 2: Use n8n MCP Workflow Execution**
1. Create and activate a workflow in n8n
2. The workflow should accept \`message\` or \`query\` as input
3. Make sure the workflow is Active

*${agentName}*`;
        }
    }

    // Step 3: Try direct tool call for non-n8n MCP servers
    let toolToUse = tools.length > 0 ? tools[0] : null;

    // Prefer tools that seem related to chat/query/AI
    if (tools.length > 1) {
        const preferredNames = ["chat", "message", "ask", "query", "ai", "assistant", "agent", "test", "execute"];
        const preferred = tools.find(t => preferredNames.some(name => t.name.toLowerCase().includes(name)));
        if (preferred) {
            toolToUse = preferred;
        }
    }

    if (toolToUse) {
        logger.info(`Calling tool: ${toolToUse.name}`);

        const toolArgs: Record<string, unknown> = {
            message: query,
            query: query,
            text: query,
            input: query,
            prompt: query,
            question: query,
            history: history, // Pass history to MCP tool
        };

        if (context.length > 0) {
            toolArgs.context = context.map(c => c.content).join("\n\n");
        }

        const toolResponse = await mcpRequest(url, "tools/call", {
            name: toolToUse.name,
            arguments: toolArgs,
        }, headers);

        if (toolResponse.error) {
            const toolList = tools.map(t => `- **${t.name}**${t.description ? `: ${t.description}` : ""}`).join("\n");
            throw new Error(`Tool "${toolToUse.name}" failed: ${toolResponse.error.message}\n\nAvailable tools:\n${toolList}`);
        }

        const result = toolResponse.result;
        if (result?.content) {
            if (Array.isArray(result.content)) {
                return result.content.map((c: any) => c.text || c.content || JSON.stringify(c)).join("\n");
            }
            return typeof result.content === "string" ? result.content : JSON.stringify(result.content);
        }

        return result ? JSON.stringify(result, null, 2) : "Tool executed successfully.";
    }

    // No tools available
    if (tools.length === 0) {
        logger.warn("No MCP tools found on server");
    }

    // No tools available - try simple webhook format
    logger.info("No MCP tools found, trying webhook format...");

    const webhookResponse = await fetch(url, {
        method: "POST",
        headers: {
            ...headers,
            "Accept": "application/json",
        },
        body: JSON.stringify({
            query,
            message: query,
            history: history, // Pass history to webhook
            context: context.map((c) => ({
                content: c.content || "",
                score: c.score,
                source: c.metadata?.source,
            })),
        }),
    });

    if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text().catch(() => "Unknown error");
        throw new Error(`Agent returned ${webhookResponse.status}: ${errorText}`);
    }

    const data = await webhookResponse.json();

    // Handle various response formats
    const response =
        data.response ||
        data.message ||
        data.content ||
        data.text ||
        data.output ||
        data.result?.content ||
        data.result ||
        data.answer;

    if (typeof response === "string") {
        return response;
    } else if (response) {
        return typeof response === "object" ? JSON.stringify(response, null, 2) : String(response);
    }

    return JSON.stringify(data, null, 2);
}

// Handle local built-in agent requests
async function handleLocalAgent(
    query: string,
    context: SearchResult[]
): Promise<string> {
    const queryLower = query.toLowerCase();

    // Tool: Calculator
    // Detects math expressions like "calculate 5 * 10" or "what is 5 + 5"
    if (queryLower.includes("calculate") || queryLower.match(/[\d]+\s*[\+\-\*\/]\s*[\d]+/)) {
        try {
            // Extract the math expression safely
            // This regex looks for numbers and operators
            const mathMatch = query.match(/(\d+(?:\.\d+)?\s*[\+\-\*\/]\s*\d+(?:\.\d+)?(?:\s*[\+\-\*\/]\s*\d+(?:\.\d+)?)*)/);

            if (mathMatch) {
                const expression = mathMatch[0];
                // Safe evaluation using Function constructor with strict limitations
                // In a real production env, use a math parser library like mathjs
                const result = new Function(`return ${expression}`)();
                return `I used the **calculator** tool to solve that.\n\nResult: **${result}**`;
            }
        } catch (e) {
            // Fall through to normal response if calculation fails
        }
    }

    // Tool: Time
    if (queryLower.includes("time") || queryLower.includes("clock")) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        return `I checked the **system clock** for you.\n\nCurrent Time: **${timeString}**\nDate: **${dateString}**`;
    }

    // Default RAG response if no tools matched - use AI
    return generateAIResponse(query, context, "VectorHub Assistant");
}

// Extract HTTP URL from config (handles supergateway and other patterns)
function extractHttpUrl(agent: RAGRequest["agent"]): string | undefined {
    if (!agent) return undefined;

    // Direct endpoint
    if (agent.endpoint) return agent.endpoint;

    // Config URL fields
    if (agent.config?.webhookUrl) return agent.config.webhookUrl;
    if (agent.config?.url) return agent.config.url;
    if (agent.config?.baseUrl) return agent.config.baseUrl;

    // Extract from supergateway args
    if (agent.config?.args && Array.isArray(agent.config.args)) {
        const args = agent.config.args;

        // Look for --streamableHttp or --sse followed by URL
        const streamableIndex = args.findIndex((arg: string) =>
            arg === "--streamableHttp" || arg === "--sse"
        );
        if (streamableIndex !== -1 && args[streamableIndex + 1]) {
            return args[streamableIndex + 1];
        }

        // Look for any URL in args
        const urlArg = args.find((arg: string) =>
            arg.startsWith("http://") || arg.startsWith("https://")
        );
        if (urlArg) return urlArg;
    }

    return undefined;
}

// Extract auth header from config
function extractAuthHeader(agent: RAGRequest["agent"]): string | undefined {
    if (!agent) return undefined;

    // Direct auth header
    if (agent.authHeader) return agent.authHeader;
    if (agent.config?.authToken) return agent.config.authToken;

    // Extract from supergateway args (--header authorization:Bearer xxx)
    if (agent.config?.args && Array.isArray(agent.config.args)) {
        const args = agent.config.args;
        const headerIndex = args.findIndex((arg: string) => arg === "--header");
        if (headerIndex !== -1 && args[headerIndex + 1]) {
            const headerValue = args[headerIndex + 1];
            if (headerValue.toLowerCase().startsWith("authorization:")) {
                return headerValue.split(":").slice(1).join(":").trim();
            }
        }
    }

    return undefined;
}

export async function POST(request: Request) {
    try {
        const body: RAGRequest = await request.json();
        const { query, collection, topK = 5, minScore = 0.5, agent, connectionConfig } = body;

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
                // Use provided connection config or fallback to environment variable
                const connString = connectionConfig?.connectionString || process.env.MONGODB_URI;
                const database = connectionConfig?.database || "Knowledge_base";
                
                if (connString) {
                    context = await searchMongoDB(
                        connString,
                        database,
                        collection,
                        query,
                        topK,
                        minScore,
                        connectionConfig?.vectorSearchIndexName || "vector_index",
                        connectionConfig?.embeddingField || "embedding"
                    );
                    logger.info(`Retrieved ${context.length} documents from collection "${collection}"`);
                } else {
                    logger.warn("No MongoDB connection string available");
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                logger.warn(`Collection search failed: ${errorMessage}`);
                // Continue without context rather than failing
            }
        }

        // Filter out documents with empty content to prevent errors in downstream agents
        context = context.filter(doc => doc.content && doc.content.trim().length > 0);

        // Step 2: Generate response based on agent type
        let response: string;
        let agentUsed: string;
        const agentName = agent?.name || "Vector Search";

        if (!agent || agent.type === "mock") {
            // Use built-in AI response generator with OpenAI
            response = await generateAIResponse(query, context, "Vector Search", body.history);
            agentUsed = "Vector Search";
        } else {
            // Extract endpoint and auth from agent config
            const endpoint = extractHttpUrl(agent);
            const authHeader = extractAuthHeader(agent);

            if (agent.endpoint === "local") {
                // Handle built-in local agent
                response = await handleLocalAgent(query, context);
                agentUsed = "VectorHub Assistant";
            } else if (endpoint) {
                try {
                    logger.info(`Calling agent ${agentName} at ${endpoint} (auth: ${authHeader ? "yes" : "no"})`);
                    response = await callHttpAgent(endpoint, query, context, agentName, authHeader, body.history);
                    agentUsed = agentName;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : "Unknown error";
                    logger.error(`Agent call failed (${agent.type}): ${errorMsg}`);
                    response = await generateAIResponse(query, context, agentName, body.history);
                    response += `\n\n⚠️ *Could not reach ${agentName}.*\n*Error: ${errorMsg}*`;
                    agentUsed = `${agentName} (fallback)`;
                }
            } else {
                // No endpoint - use AI response
                response = await generateAIResponse(query, context, "Vector Search", body.history);
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

