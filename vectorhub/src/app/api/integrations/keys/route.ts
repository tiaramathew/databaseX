import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");

// Helper to read .env file
function readEnvFile(): Record<string, string> {
    if (!fs.existsSync(ENV_PATH)) {
        return {};
    }
    const content = fs.readFileSync(ENV_PATH, "utf-8");
    const env: Record<string, string> = {};
    content.split("\n").forEach((line) => {
        const [key, ...value] = line.split("=");
        if (key && value) {
            env[key.trim()] = value.join("=").trim();
        }
    });
    return env;
}

// Helper to write .env file
function writeEnvFile(env: Record<string, string>) {
    const content = Object.entries(env)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
    fs.writeFileSync(ENV_PATH, content);
}

// Known keys mapping to friendly names and types
const KNOWN_KEYS: Record<string, { name: string; type: string; provider: string }> = {
    OPENAI_API_KEY: { name: "OpenAI API Key", type: "llm", provider: "openai" },
    FIRECRAWL_API_KEY: { name: "Firecrawl API Key", type: "scraper", provider: "firecrawl" },
    ANTHROPIC_API_KEY: { name: "Anthropic API Key", type: "llm", provider: "anthropic" },
    COHERE_API_KEY: { name: "Cohere API Key", type: "llm", provider: "cohere" },
    // Add more as needed
};

export async function GET() {
    try {
        const env = readEnvFile();
        const keys = Object.entries(env)
            .filter(([key]) => KNOWN_KEYS[key] || key.endsWith("_API_KEY"))
            .map(([key, value]) => {
                const known = KNOWN_KEYS[key];
                return {
                    id: key,
                    name: known?.name || key,
                    type: known?.type || "other",
                    provider: known?.provider || "custom",
                    key: value,
                    createdAt: new Date(), // We don't track this in .env
                    isActive: true,
                };
            });
        return NextResponse.json(keys);
    } catch (error) {
        return NextResponse.json({ error: "Failed to read keys" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { key, value } = await request.json();

        // Map provider/type to standard env keys if possible
        let envKey = key;
        if (key === "openai" || key === "OpenAI") envKey = "OPENAI_API_KEY";
        if (key === "firecrawl" || key === "Firecrawl") envKey = "FIRECRAWL_API_KEY";

        const env = readEnvFile();
        env[envKey] = value;
        writeEnvFile(env);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save key" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { key } = await request.json();
        const env = readEnvFile();
        delete env[key];
        writeEnvFile(env);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
    }
}
