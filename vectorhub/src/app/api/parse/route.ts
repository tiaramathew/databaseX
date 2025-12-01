import { NextResponse } from "next/server";
// @ts-ignore
const pdf = require("pdf-parse");
// @ts-ignore
const mammoth = require("mammoth");

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = "";
        let metadata = {};

        if (file.type === "application/pdf") {
            const data = await pdf(buffer);
            text = data.text;
            metadata = {
                info: data.info,
                metadata: data.metadata,
                version: data.version,
                numpages: data.numpages,
            };
        } else if (
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.name.endsWith(".docx")
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
            if (result.messages && result.messages.length > 0) {
                console.warn("Mammoth messages:", result.messages);
            }
        } else {
            return NextResponse.json(
                { error: "Invalid file type. Only PDF and DOCX are supported." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            text,
            ...metadata,
        });
    } catch (error) {
        console.error("File parsing error:", error);
        return NextResponse.json(
            { error: "Failed to parse file" },
            { status: 500 }
        );
    }
}
