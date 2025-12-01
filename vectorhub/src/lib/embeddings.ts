import fs from 'fs';
import path from 'path';

export async function generateEmbedding(text: string): Promise<number[]> {
    const cleanedText = text.replace(/\n/g, " ").trim();
    if (!cleanedText) {
        throw new Error("Input text cannot be empty or whitespace only");
    }

    let apiKey = process.env.OPENAI_API_KEY;

    // Fallback: Try to read .env manually if not found in process.env
    if (!apiKey) {
        try {
            const envPath = path.join(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                const match = envContent.match(/OPENAI_API_KEY=(.*)/);
                if (match && match[1]) {
                    apiKey = match[1].trim();
                }
            }
        } catch (error) {
            console.warn("Failed to read .env file manually for OpenAI key", error);
        }
    }

    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }

    try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "text-embedding-3-small",
                input: cleanedText,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    } catch (error) {
        console.error("Embedding generation failed:", error);
        throw error;
    }
}
