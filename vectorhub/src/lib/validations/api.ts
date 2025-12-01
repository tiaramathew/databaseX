import { z } from "zod";

// Collection schemas
export const createCollectionSchema = z.object({
    name: z
        .string()
        .min(1, "Collection name is required")
        .max(64, "Collection name must be 64 characters or less")
        .regex(
            /^[a-zA-Z][a-zA-Z0-9_-]*$/,
            "Collection name must start with a letter and contain only letters, numbers, underscores, and hyphens"
        ),
    description: z.string().max(256).optional(),
    dimensions: z
        .number()
        .int()
        .min(1, "Dimensions must be at least 1")
        .max(10000, "Dimensions must be 10000 or less"),
    distanceMetric: z.enum(["cosine", "euclidean", "dot_product"], {
        errorMap: () => ({ message: "Invalid distance metric" }),
    }),
    indexType: z.enum(["hnsw", "flat", "ivf"]).optional(),
    indexOptions: z.record(z.any()).optional(),
    metadataSchema: z
        .record(
            z.object({
                type: z.enum(["string", "number", "boolean", "date", "string[]"]),
                index: z.boolean(),
            })
        )
        .optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// Document schemas
export const vectorDocumentSchema = z.object({
    id: z.string().optional(),
    content: z.string().min(1, "Content is required"),
    embedding: z.array(z.number()).optional(),
    metadata: z.record(z.any()).default({}).transform((val) => val ?? {}),
});

export const addDocumentsSchema = z.object({
    collection: z.string().min(1, "Collection name is required"),
    documents: z
        .array(vectorDocumentSchema)
        .min(1, "At least one document is required")
        .max(1000, "Maximum 1000 documents per request"),
});

export type AddDocumentsInput = z.infer<typeof addDocumentsSchema>;

export const deleteDocumentsSchema = z.object({
    collection: z.string().min(1, "Collection name is required"),
    ids: z
        .array(z.string())
        .min(1, "At least one document ID is required")
        .max(1000, "Maximum 1000 IDs per request"),
});

export type DeleteDocumentsInput = z.infer<typeof deleteDocumentsSchema>;

// Search schemas
export const searchQuerySchema = z.object({
    collection: z.string().min(1, "Collection name is required"),
    query: z.object({
        vector: z.array(z.number()).optional(),
        text: z.string().optional(),
        topK: z
            .number()
            .int()
            .min(1, "topK must be at least 1")
            .max(100, "topK must be 100 or less"),
        minScore: z.number().min(0).max(1).optional(),
        filter: z.record(z.any()).optional(),
        includeMetadata: z.boolean().optional().default(true),
        includeContent: z.boolean().optional().default(true),
    }),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

// MCP connection schemas
export const createMcpConnectionSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or less"),
    endpoint: z
        .string()
        .url("Endpoint must be a valid URL")
        .max(512, "Endpoint URL is too long"),
    tags: z
        .array(
            z
                .string()
                .min(1, "Tag cannot be empty")
                .max(64, "Tag must be 64 characters or less")
        )
        .max(20, "A maximum of 20 tags is allowed")
        .optional(),
});

export type CreateMcpConnectionInput = z.infer<typeof createMcpConnectionSchema>;

// Webhook connection schemas
export const createWebhookConnectionSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or less"),
    url: z
        .string()
        .url("URL must be a valid URL")
        .max(512, "URL is too long"),
    eventTypes: z
        .array(
            z
                .string()
                .min(1, "Event type cannot be empty")
                .max(64, "Event type must be 64 characters or less")
        )
        .min(1, "At least one event type is required")
        .max(50, "A maximum of 50 event types is allowed"),
    secretConfigured: z.boolean().default(false),
});

export type CreateWebhookConnectionInput = z.infer<typeof createWebhookConnectionSchema>;

// Error response helper
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, string[]>;
}

export function formatZodError(error: z.ZodError): ApiError {
    const details: Record<string, string[]> = {};

    error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!details[path]) {
            details[path] = [];
        }
        details[path].push(err.message);
    });

    return {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details,
    };
}

// Helper to validate and parse request body
export async function validateRequestBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            return {
                success: false,
                error: formatZodError(result.error),
            };
        }

        return { success: true, data: result.data };
    } catch {
        return {
            success: false,
            error: {
                code: "INVALID_JSON",
                message: "Request body must be valid JSON",
            },
        };
    }
}

