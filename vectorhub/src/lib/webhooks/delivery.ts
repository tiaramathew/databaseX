import { WebhookConnection } from "@/types/connections";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export interface WebhookPayload {
    id: string;
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
    success: boolean;
    statusCode?: number;
    error?: string;
    duration: number;
    attempts: number;
}

interface DeliveryOptions {
    maxRetries?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<DeliveryOptions> = {
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 30000,
};

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifySignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expected = generateSignature(payload, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}

/**
 * Create a webhook payload
 */
export function createWebhookPayload(
    type: string,
    data: Record<string, unknown>
): WebhookPayload {
    return {
        id: crypto.randomUUID(),
        type,
        timestamp: new Date().toISOString(),
        data,
    };
}

/**
 * Deliver a webhook with retries
 */
export async function deliverWebhook(
    connection: WebhookConnection,
    payload: WebhookPayload,
    secret?: string,
    options: DeliveryOptions = {}
): Promise<WebhookDeliveryResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const payloadString = JSON.stringify(payload);
    const startTime = Date.now();
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < opts.maxRetries) {
        attempts++;

        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "X-Webhook-ID": payload.id,
                "X-Webhook-Timestamp": payload.timestamp,
                "X-Webhook-Event": payload.type,
            };

            // Add signature if secret is configured
            if (secret && connection.secretConfigured) {
                headers["X-Webhook-Signature"] = `sha256=${generateSignature(
                    payloadString,
                    secret
                )}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                opts.timeoutMs
            );

            const response = await fetch(connection.url, {
                method: "POST",
                headers,
                body: payloadString,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const duration = Date.now() - startTime;

            if (response.ok) {
                logger.info("Webhook delivered successfully", {
                    webhookId: connection.id,
                    payloadId: payload.id,
                    eventType: payload.type,
                    statusCode: response.status,
                    attempts,
                    duration,
                });

                return {
                    success: true,
                    statusCode: response.status,
                    duration,
                    attempts,
                };
            }

            // Non-retryable status codes
            if (response.status >= 400 && response.status < 500) {
                const errorText = await response.text().catch(() => "Unknown error");
                logger.error("Webhook delivery failed (non-retryable)", undefined, {
                    webhookId: connection.id,
                    statusCode: response.status,
                    error: errorText,
                });

                return {
                    success: false,
                    statusCode: response.status,
                    error: `HTTP ${response.status}: ${errorText}`,
                    duration,
                    attempts,
                };
            }

            // Retryable error
            lastError = `HTTP ${response.status}`;
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    lastError = "Request timeout";
                } else {
                    lastError = error.message;
                }
            } else {
                lastError = "Unknown error";
            }
        }

        // Wait before retry (with exponential backoff)
        if (attempts < opts.maxRetries) {
            const delay = opts.retryDelayMs * Math.pow(2, attempts - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    const duration = Date.now() - startTime;

    logger.error("Webhook delivery failed after retries", undefined, {
        webhookId: connection.id,
        payloadId: payload.id,
        attempts,
        lastError,
        duration,
    });

    return {
        success: false,
        error: lastError,
        duration,
        attempts,
    };
}

/**
 * Deliver to all webhooks subscribed to an event type
 */
export async function broadcastWebhook(
    webhooks: WebhookConnection[],
    eventType: string,
    data: Record<string, unknown>,
    secret?: string
): Promise<Map<string, WebhookDeliveryResult>> {
    const payload = createWebhookPayload(eventType, data);
    const results = new Map<string, WebhookDeliveryResult>();

    // Filter webhooks subscribed to this event type
    const subscribedWebhooks = webhooks.filter(
        (w) =>
            w.status === "connected" &&
            (w.eventTypes.includes(eventType) || w.eventTypes.includes("*"))
    );

    // Deliver in parallel
    const deliveryPromises = subscribedWebhooks.map(async (webhook) => {
        const result = await deliverWebhook(webhook, payload, secret);
        results.set(webhook.id, result);
    });

    await Promise.all(deliveryPromises);

    return results;
}

/**
 * Test webhook delivery (sends a test event)
 */
export async function testWebhook(
    connection: WebhookConnection,
    secret?: string
): Promise<WebhookDeliveryResult> {
    const payload = createWebhookPayload("webhook.test", {
        message: "This is a test webhook delivery from VectorHub",
        webhookName: connection.name,
        subscribedEvents: connection.eventTypes,
    });

    return deliverWebhook(connection, payload, secret, {
        maxRetries: 1,
        timeoutMs: 10000,
    });
}

