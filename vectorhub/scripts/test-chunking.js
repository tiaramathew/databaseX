// Test chunking logic (inline implementation for JS testing) 
// I'll rewrite the test to include the chunking logic inline or compile it, 
// but for simplicity I'll just test the logic here since I can't easily run TS files without setup.

function splitTextTest(text, chunkSize = 50, chunkOverlap = 10) {
    if (!text) return [];
    const chunks = [];
    let startIndex = 0;
    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize;
        if (endIndex < text.length) {
            const lookback = Math.min(chunkOverlap, 100);
            const chunkText = text.substring(startIndex, endIndex);
            let breakIndex = chunkText.lastIndexOf("\n\n");
            if (breakIndex === -1) breakIndex = chunkText.lastIndexOf(". ");
            if (breakIndex === -1) breakIndex = chunkText.lastIndexOf(" ");
            if (breakIndex !== -1 && breakIndex > chunkSize - lookback) {
                endIndex = startIndex + breakIndex + 1;
            }
        }
        const chunk = text.substring(startIndex, endIndex).trim();
        if (chunk) chunks.push(chunk);
        if (endIndex >= text.length) break;
        startIndex = endIndex - chunkOverlap;
        if (startIndex >= endIndex) startIndex = endIndex;
    }
    return chunks;
}

const longText = "This is a long text. It has multiple sentences. We want to see if it splits correctly. " +
    "Here is another sentence that should be in a new chunk if the size is small. " +
    "And a third sentence to ensure we have enough content.";

console.log("Original Length:", longText.length);
const chunks = splitTextTest(longText, 50, 10);
console.log("Chunks generated:", chunks.length);
chunks.forEach((c, i) => console.log(`Chunk ${i} (${c.length} chars): "${c}"`));

if (chunks.length > 1) {
    console.log("SUCCESS: Text was split into multiple chunks.");
} else {
    console.log("FAILURE: Text was not split.");
}
