/**
 * Split text into chunks with overlap
 */
export function splitText(
    text: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200
): string[] {
    if (!text) return [];

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize;

        // If we're not at the end of the text, try to find a natural break point
        if (endIndex < text.length) {
            // Look for the last period, newline, or space within the chunk
            const lookback = Math.min(chunkOverlap, 100); // Don't look back too far
            const chunkText = text.substring(startIndex, endIndex);

            // Try to split at paragraph
            let breakIndex = chunkText.lastIndexOf("\n\n");

            // Try to split at sentence
            if (breakIndex === -1) {
                breakIndex = chunkText.lastIndexOf(". ");
            }

            // Try to split at word
            if (breakIndex === -1) {
                breakIndex = chunkText.lastIndexOf(" ");
            }

            // If we found a break point near the end, use it
            if (breakIndex !== -1 && breakIndex > chunkSize - lookback) {
                endIndex = startIndex + breakIndex + 1; // Include the break character
            }
        }

        const chunk = text.substring(startIndex, endIndex).trim();
        if (chunk) {
            chunks.push(chunk);
        }

        // Move start index forward, accounting for overlap
        // If we're at the end, we're done
        if (endIndex >= text.length) break;

        startIndex = endIndex - chunkOverlap;

        // Safety check to prevent infinite loops if overlap is too large relative to progress
        if (startIndex >= endIndex) {
            startIndex = endIndex;
        }
    }

    return chunks;
}
