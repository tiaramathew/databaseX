import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdvancedSettings } from "./AdvancedSettings";

interface UploadZoneProps {
    onUpload: (files: File[], options?: { chunkSize: number; chunkOverlap: number }) => void;
    disabled?: boolean;
}

export function UploadZone({ onUpload, disabled = false }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [chunkSize, setChunkSize] = useState(1000);
    const [chunkOverlap, setChunkOverlap] = useState(200);
    const [useAdvanced, setUseAdvanced] = useState(false);

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
        },
        [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            const droppedFiles = Array.from(e.dataTransfer.files);
            setFiles((prev) => [...prev, ...droppedFiles]);
        },
        [disabled]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && !disabled) {
                const selectedFiles = Array.from(e.target.files);
                setFiles((prev) => [...prev, ...selectedFiles]);
            }
        },
        [disabled]
    );

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = () => {
        if (files.length > 0 && !disabled) {
            onUpload(files, useAdvanced ? { chunkSize, chunkOverlap } : undefined);
            setFiles([]);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6">
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all duration-200",
                    isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-muted-foreground/25 hover:border-muted-foreground/40",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <motion.div
                    className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center"
                    animate={{ scale: isDragging ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <Upload
                        className={cn(
                            "h-8 w-8 transition-colors",
                            isDragging ? "text-primary" : "text-muted-foreground"
                        )}
                    />
                </motion.div>
                <h3 className="mb-2 text-lg font-semibold">
                    {isDragging ? "Drop files here" : "Drag & drop files here"}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground text-center">
                    Supported formats: PDF, TXT, MD, DOCX, CSV, JSON
                    <br />
                    <span className="text-xs">Max file size: 10 MB</span>
                </p>
                <div className="relative">
                    <Button variant="secondary" disabled={disabled}>
                        Browse Files
                    </Button>
                    <input
                        type="file"
                        multiple
                        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        onChange={handleFileInput}
                        disabled={disabled}
                        accept=".pdf,.txt,.md,.docx,.csv,.json"
                    />
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

            <AnimatePresence mode="popLayout">
                {files.length > 0 && (
                    <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {files.map((file, i) => (
                            <motion.div
                                key={`${file.name}-${i}`}
                                className="flex items-center justify-between rounded-lg border bg-card p-3"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                                        <File className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium truncate max-w-[200px]">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removeFile(i)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleUpload} disabled={disabled}>
                                Upload {files.length} File{files.length !== 1 ? "s" : ""}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
