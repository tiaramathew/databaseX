import { NextResponse } from "next/server";
import { dbClient } from "@/lib/db/client";

interface HealthStatus {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    version: string;
    uptime: number;
    checks: {
        database: {
            status: "up" | "down";
            latency?: number;
            message?: string;
        };
        memory: {
            status: "ok" | "warning" | "critical";
            heapUsed: number;
            heapTotal: number;
            percentage: number;
        };
    };
}

// Track server start time for uptime calculation
const startTime = Date.now();

export async function GET() {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Check database connectivity
    let dbStatus: HealthStatus["checks"]["database"];
    const dbStartTime = Date.now();

    try {
        // Test database connection
        await dbClient.listCollections();
        const latency = Date.now() - dbStartTime;

        dbStatus = {
            status: "up",
            latency,
        };
    } catch (error) {
        dbStatus = {
            status: "down",
            message: error instanceof Error ? error.message : "Unknown error",
        };
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapPercentage = Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    );

    const memoryStatus: HealthStatus["checks"]["memory"] = {
        status: heapPercentage > 90 ? "critical" : heapPercentage > 75 ? "warning" : "ok",
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: heapPercentage,
    };

    // Determine overall health status
    let overallStatus: HealthStatus["status"] = "healthy";

    if (dbStatus.status === "down") {
        overallStatus = "unhealthy";
    } else if (memoryStatus.status === "critical") {
        overallStatus = "unhealthy";
    } else if (memoryStatus.status === "warning") {
        overallStatus = "degraded";
    }

    const health: HealthStatus = {
        status: overallStatus,
        timestamp,
        version: process.env.npm_package_version || "1.0.0",
        uptime,
        checks: {
            database: dbStatus,
            memory: memoryStatus,
        },
    };

    // Return appropriate HTTP status code based on health
    const httpStatus =
        overallStatus === "healthy"
            ? 200
            : overallStatus === "degraded"
                ? 200
                : 503;

    return NextResponse.json(health, { status: httpStatus });
}

