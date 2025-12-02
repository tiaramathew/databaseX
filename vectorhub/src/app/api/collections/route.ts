import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { ConnectionConfig, MongoDBAtlasConfig, MCPConfig } from "@/types/connections";
import {
    createCollectionSchema,
    validateRequestBody,
} from "@/lib/validations/api";
import type { CreateCollectionConfig, CollectionInfo } from "@/lib/db/adapters/base";
import { logger } from "@/lib/logger";

interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

// Fetch MCP tools from an MCP server
async function listMCPTools(config: MCPConfig): Promise<{ tools: MCPTool[]; error?: string }> {
    // Extract the HTTP endpoint from config
    let endpoint: string | undefined;
    
    // Check various URL fields
    if (config.url) endpoint = config.url;
    else if (config.webhookUrl) endpoint = config.webhookUrl;
    
    // Extract from supergateway args if present
    if (!endpoint && config.args && Array.isArray(config.args)) {
        const streamableIndex = config.args.findIndex((arg: string) => 
            arg === "--streamableHttp" || arg === "--sse"
        );
        if (streamableIndex !== -1 && config.args[streamableIndex + 1]) {
            endpoint = config.args[streamableIndex + 1];
        }
        // Also check for URLs directly in args
        if (!endpoint) {
            const urlArg = config.args.find((arg: string) => 
                arg.startsWith("http://") || arg.startsWith("https://")
            );
            if (urlArg) endpoint = urlArg;
        }
    }
    
    if (!endpoint) {
        logger.warn("No MCP endpoint found in config");
        return { tools: [], error: "No endpoint configured" };
    }
    
    // Extract auth header if present
    let authHeader: string | undefined;
    if ((config as any).authToken) {
        authHeader = (config as any).authToken;
    } else if (config.args && Array.isArray(config.args)) {
        const headerIndex = config.args.findIndex((arg: string) => arg === "--header");
        if (headerIndex !== -1 && config.args[headerIndex + 1]) {
            const headerValue = config.args[headerIndex + 1];
            if (headerValue.toLowerCase().startsWith("authorization:")) {
                authHeader = headerValue.split(":").slice(1).join(":").trim();
            }
        }
    }
    
    try {
        logger.info(`Fetching MCP tools from: ${endpoint}`);
        
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        };
        
        if (authHeader) {
            headers["Authorization"] = authHeader.startsWith("Bearer ") 
                ? authHeader 
                : `Bearer ${authHeader}`;
        }
        
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/list",
                params: {},
            }),
        });
        
        const text = await response.text();
        
        // Parse SSE or JSON response
        let data;
        if (text.includes("data: ")) {
            const lines = text.split("\n");
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        data = JSON.parse(line.slice(6));
                        break;
                    } catch {
                        continue;
                    }
                }
            }
        } else {
            data = JSON.parse(text);
        }
        
        if (data?.result?.tools) {
            logger.info(`Found ${data.result.tools.length} MCP tools`);
            return { tools: data.result.tools };
        }
        
        return { tools: [], error: "No tools found in response" };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to fetch MCP tools: ${errorMsg}`);
        return { tools: [], error: errorMsg };
    }
}

async function createMongoDBCollection(config: MongoDBAtlasConfig, collectionConfig: CreateCollectionConfig): Promise<CollectionInfo> {
    const client = new MongoClient(config.connectionString);
    try {
        await client.connect();
        const db = client.db(config.database);
        await db.createCollection(collectionConfig.name);

        return {
            name: collectionConfig.name,
            documentCount: 0,
            dimensions: collectionConfig.dimensions,
            distanceMetric: collectionConfig.distanceMetric,
        };
    } finally {
        await client.close();
    }
}

const getConnectionConfig = (request: Request): ConnectionConfig => {
    const configHeader = request.headers.get("x-connection-config");
    if (!configHeader) {
        throw new Error("Missing connection configuration");
    }
    return JSON.parse(configHeader) as ConnectionConfig;
};

// Direct MongoDB connection for listing collections
async function listMongoDBCollections(config: MongoDBAtlasConfig): Promise<CollectionInfo[]> {
    logger.info("Connecting to MongoDB with config:", {
        database: config.database,
        hasConnectionString: !!config.connectionString,
    });

    if (!config.connectionString) {
        throw new Error("Missing MongoDB connection string. Please check your connection settings.");
    }

    const client = new MongoClient(config.connectionString);

    try {
        await client.connect();
        logger.info("Connected to MongoDB successfully");

        // If no database specified, list available databases for debugging
        if (!config.database) {
            const adminDb = client.db().admin();
            const dbList = await adminDb.listDatabases();
            const dbNames = dbList.databases.map(d => d.name).join(", ");
            logger.info(`No database specified. Available databases: ${dbNames}`);
            throw new Error(`No database name specified. Available databases: ${dbNames}`);
        }

        const db = client.db(config.database);
        const collections = await db.listCollections().toArray();

        logger.info(`Found ${collections.length} collections in database "${config.database}"`);

        // If no collections found, list available databases for debugging
        if (collections.length === 0) {
            try {
                const adminDb = client.db().admin();
                const dbList = await adminDb.listDatabases();
                const dbNames = dbList.databases.map(d => d.name).join(", ");
                logger.info(`Database "${config.database}" has 0 collections. Available databases: ${dbNames}`);
            } catch {
                // Ignore if we can't list databases
            }
        }

        const collectionInfos = await Promise.all(
            collections.map(async (col) => {
                const stats = await db.command({ collStats: col.name });
                return {
                    name: col.name,
                    documentCount: stats.count,
                    dimensions: 0, // Default for existing collections
                    distanceMetric: "cosine", // Default
                };
            })
        );

        return collectionInfos;
    } catch (error) {
        logger.error("MongoDB connection/query failed:", error);
        throw error;
    } finally {
        await client.close();
    }
}

export async function GET(request: Request) {
    try {
        const connectionConfig = getConnectionConfig(request);

        logger.info("Fetching collections for connection type:", { type: connectionConfig.type });

        // Handle different database types
        if (connectionConfig.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            const collections = await listMongoDBCollections(mongoConfig);
            return NextResponse.json(collections);
        }

        // MCP connections - fetch actual tools from the server
        if (connectionConfig.type === "mcp") {
            const mcpConfig = connectionConfig.config as MCPConfig;
            const { tools, error } = await listMCPTools(mcpConfig);
            
            if (tools.length > 0) {
                // Return each tool as a "collection" with its description
                return NextResponse.json(tools.map(tool => ({
                    name: tool.name,
                    description: tool.description || "MCP Tool",
                    documentCount: 0,
                    dimensions: 0,
                    distanceMetric: "MCP",
                    isTool: true,
                })));
            }
            
            // Fallback if no tools found
            return NextResponse.json([{
                name: error ? `Error: ${error}` : "No MCP Tools found",
                documentCount: 0,
                dimensions: 0,
                distanceMetric: "N/A",
            }]);
        }

        // Webhook connections don't have collections
        if (connectionConfig.type === "webhook") {
            return NextResponse.json([{
                name: "Webhook Endpoint",
                documentCount: 0,
                dimensions: 0,
                distanceMetric: "N/A",
            }]);
        }

        // For other database types, return empty array (can be extended)
        logger.info("Connection type not yet implemented for collections:", { type: connectionConfig.type });
        return NextResponse.json([]);
    } catch (error) {
        logger.error("GET /api/collections failed", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const validation = await validateRequestBody(request, createCollectionSchema);

    if (!validation.success) {
        return NextResponse.json(validation.error, { status: 400 });
    }

    const { data } = validation;

    try {
        const connectionConfig = getConnectionConfig(request);

        const config: CreateCollectionConfig = {
            name: data.name,
            description: data.description,
            dimensions: data.dimensions,
            distanceMetric: data.distanceMetric,
            indexType: data.indexType,
            indexOptions: data.indexOptions,
            metadataSchema: data.metadataSchema,
        };

        let created: CollectionInfo;

        if (connectionConfig.type === "mongodb_atlas") {
            const mongoConfig = connectionConfig.config as MongoDBAtlasConfig;
            created = await createMongoDBCollection(mongoConfig, config);
        } else {
            // For other types, return a mock response
            created = {
                name: config.name,
                dimensions: config.dimensions,
                distanceMetric: config.distanceMetric,
                documentCount: 0,
            };
        }

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        logger.error("POST /api/collections failed", error, { collection: data.name });

        // Check for duplicate collection error
        if (
            error instanceof Error &&
            error.message.toLowerCase().includes("already exists")
        ) {
            return NextResponse.json(
                {
                    code: "DUPLICATE_COLLECTION",
                    message: `Collection "${data.name}" already exists`,
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "Failed to create collection",
            },
            { status: 500 }
        );
    }
}
