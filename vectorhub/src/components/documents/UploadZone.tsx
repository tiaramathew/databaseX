"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File as FileIcon, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface UploadZoneProps {
    onUpload: (files: File[]) => Promise<void>;
    disabled?: boolean;
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Filter for supported files
        const supportedFiles = acceptedFiles.filter(file =>
            file.type === "application/pdf" ||
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.name.endsWith(".pdf") ||
            file.name.endsWith(".docx")
        );

        if (supportedFiles.length === 0) {
            toast.error("No supported files found. Please upload PDF or DOCX files.");
            return;
        }

        if (supportedFiles.length < acceptedFiles.length) {
            toast.warning(`Skipped ${acceptedFiles.length - supportedFiles.length} unsupported files.`);
        }

        setFiles(prev => [...prev, ...supportedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
        },
        disabled: disabled || isUploading,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            await onUpload(files);
            setFiles([]);
            toast.success("Files uploaded successfully");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload files");
        } finally {
            setIsUploading(false);
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
                {...getRootProps()}
                className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all duration-200 cursor-pointer",
                    isDragActive
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-muted-foreground/25 hover:border-muted-foreground/40",
                    (disabled || isUploading) && "opacity-50 cursor-not-allowed"
                )}
            >
                <input {...getInputProps()} />
                <motion.div
                    className="mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center"
                    animate={{ scale: isDragActive ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <Upload
                        className={cn(
                            "h-8 w-8 transition-colors",
                            isDragActive ? "text-primary" : "text-muted-foreground"
                        )}
                    />
                </motion.div>
                <h3 className="mb-2 text-lg font-semibold">
                    {isDragActive ? "Drop files here" : "Drag & drop files here"}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground text-center">
                    Supported formats: PDF, DOCX
                    <br />
                    <span className="text-xs">Max file size: 10 MB</span>
                </p>
                <Button variant="secondary" disabled={disabled || isUploading}>
                    Browse Files
                </Button>
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
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
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(i);
                                        }}
                                        disabled={isUploading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleUpload} disabled={disabled || isUploading}>
                                {isUploading ? (
                                    <>Uploading...</>
                                ) : (
                                    <>Upload {files.length} File{files.length !== 1 ? "s" : ""}</>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
