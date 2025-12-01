import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { AdvancedSettings } from "./AdvancedSettings";

interface TextInputUploadProps {
    onUpload: (title: string, content: string, options?: { chunkSize: number; chunkOverlap: number }) => void;
    disabled?: boolean;
}

export function TextInputUpload({ onUpload, disabled = false }: TextInputUploadProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [chunkSize, setChunkSize] = useState(1000);
    const [chunkOverlap, setChunkOverlap] = useState(200);
    const [useAdvanced, setUseAdvanced] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && content.trim() && !disabled) {
            onUpload(
                title.trim(),
                content.trim(),
                useAdvanced ? { chunkSize, chunkOverlap } : undefined
            );
            setTitle("");
            setContent("");
        }
    };

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const charCount = content.length;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                        id="title"
                        placeholder="e.g., Meeting Notes, Research Summary"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                        id="content"
                        placeholder="Enter or paste your text content here. This will be processed and indexed for semantic search..."
                        className="min-h-[250px] font-mono text-sm resize-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        disabled={disabled}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span>{wordCount.toLocaleString()} words</span>
                            <span>{charCount.toLocaleString()} characters</span>
                        </div>
                        <span>
                            {charCount > 0 && charCount < 100 && (
                                <span className="text-amber-500">Minimum 100 characters recommended</span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <AdvancedSettings
                options={{
                    chunkSize,
                    chunkOverlap,
                }}
                onChange={(opts) => {
                    setChunkSize(opts.chunkSize);
                    setChunkOverlap(opts.chunkOverlap);
                }}
                showParsingOptions={false}
                enabled={useAdvanced}
                onEnabledChange={setUseAdvanced}
            />

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={disabled || !title.trim() || !content.trim()}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Text
                </Button>
            </div>
        </form>
    );
}
