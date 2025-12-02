import { NextResponse } from "next/server";
import { dbClient } from "@/lib/db/client";
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
    authHeader?: string
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
            // Step 2a: Search for workflows
            const searchResponse = await mcpRequest(url, "tools/call", {
                name: "search_workflows",
                arguments: { query: "", active: true },
            }, headers);

            if (searchResponse.error) {
                throw new Error(`Failed to search workflows: ${searchResponse.error.message}`);
            }

            // Parse workflow list from response
            let workflows: { id: string; name: string }[] = [];
            const searchResult = searchResponse.result;

            if (searchResult?.content) {
                const contentStr = Array.isArray(searchResult.content)
                    ? searchResult.content.map((c: any) => c.text || "").join("")
                    : typeof searchResult.content === "string" ? searchResult.content : JSON.stringify(searchResult.content);

                // Try to parse workflow IDs from the response
                const idMatches = contentStr.match(/ID:\s*(\w+)/g) || [];
                const nameMatches = contentStr.match(/Name:\s*([^\n,]+)/g) || [];

                for (let i = 0; i < idMatches.length; i++) {
                    const id = idMatches[i]?.replace("ID:", "").trim();
                    const name = nameMatches[i]?.replace("Name:", "").trim() || `Workflow ${i + 1}`;
                    if (id) {
                        workflows.push({ id, name });
                    }
                }
            }

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

    // Default RAG response if no tools matched
    return generateResponse(query, context, "VectorHub Assistant");
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
                context = await dbClient.search(collection, {
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

        // Filter out documents with empty content to prevent errors in downstream agents
        context = context.filter(doc => doc.content && doc.content.trim().length > 0);

        // Step 2: Generate response based on agent type
        let response: string;
        let agentUsed: string;
        const agentName = agent?.name || "Vector Search";

        if (!agent || agent.type === "mock") {
            // Use built-in response generator
            response = generateResponse(query, context, "Vector Search");
            agentUsed = "Vector Search";
        } else {
            // Extract endpoint and auth from agent config
            const endpoint = extractHttpUrl(agent);
            const authHeader = extractAuthHeader(agent);

            if (endpoint) {
                try {
                    logger.info(`Calling agent ${agentName} at ${endpoint} (auth: ${authHeader ? "yes" : "no"})`);
                    response = await callHttpAgent(endpoint, query, context, agentName, authHeader);
                    agentUsed = agentName;
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : "Unknown error";
                    logger.error(`Agent call failed (${agent.type}): ${errorMsg}`);
                    response = generateResponse(query, context, agentName);
                    response += `\n\n⚠️ *Could not reach ${agentName}.*\n*Error: ${errorMsg}*`;
                    agentUsed = `${agentName} (fallback)`;
                }
            } else if (agent.endpoint === "local") {
                // Handle built-in local agent
                response = await handleLocalAgent(query, context);
                agentUsed = "VectorHub Assistant";
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

