"use client";

import { useState } from "react";
import { VectorDocument } from "@/lib/db/adapters/base";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    FileText,
    Trash2,
    Eye,
    Globe,
    FileSpreadsheet,
    FileType,
    Copy,
    Check,
    ExternalLink,
    Hash,
    Calendar,
    Layers,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DocumentListProps {
    documents: VectorDocument[];
    onDelete: (id: string) => void;
}

const getDocumentIcon = (type?: string) => {
    if (!type) return FileText;
    const lowerType = type.toLowerCase();
    if (lowerType.includes("pdf")) return FileText;
    if (lowerType.includes("excel") || lowerType.includes("spreadsheet")) return FileSpreadsheet;
    if (lowerType.includes("word") || lowerType.includes("doc")) return FileType;
    if (lowerType.includes("webpage") || lowerType.includes("url") || lowerType.includes("http")) return Globe;
    return FileText;
};

const getDocumentTitle = (doc: VectorDocument) => {
    return (
        (doc.metadata?.title as string) ||
        (doc.metadata?.source as string) ||
        (doc.id || "unknown").slice(0, 8) + "..."
    );
};

const getDocumentType = (doc: VectorDocument) => {
    const type = (doc.metadata?.type as string) || (doc.metadata?.documentType as string);
    if (!type) return "text";
    if (type.includes("/")) return type.split("/")[1];
    return type;
};

export function DocumentList({ documents, onDelete }: DocumentListProps) {
    const [selectedDoc, setSelectedDoc] = useState<VectorDocument | null>(null);
    const [copied, setCopied] = useState(false);

    const copyContent = () => {
        if (selectedDoc) {
            navigator.clipboard.writeText(selectedDoc.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <>
            <ScrollArea className="h-[calc(100vh-350px)] min-h-[400px]">
                <div className="grid gap-3 pr-4">
                    {documents.map((doc, index) => {
                        const Icon = getDocumentIcon(doc.metadata?.type as string);
                        const title = getDocumentTitle(doc);
                        const type = getDocumentType(doc);
                        const collection = doc.metadata?.collectionName as string;
                        const createdAt = doc.metadata?.created_at;
                        const contentPreview = doc.content.slice(0, 150);
                        const wordCount = doc.content.split(/\s+/).filter(Boolean).length;

                        return (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                <Icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium truncate">{title}</h3>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {type}
                                                            </Badge>
                                                            {collection && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    <Layers className="h-3 w-3 mr-1" />
                                                                    {collection}
                                                                </Badge>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {wordCount.toLocaleString()} words
                                                            </span>
                                                            {createdAt && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    • {formatDistanceToNow(new Date(createdAt as string | Date), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDoc(doc);
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(doc.id || "");
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                    {contentPreview}
                                                    {doc.content.length > 150 && "..."}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Document Preview Dialog */}
            <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedDoc && (
                                <>
                                    {(() => {
                                        const Icon = getDocumentIcon(selectedDoc.metadata?.type as string);
                                        return <Icon className="h-5 w-5 text-muted-foreground" />;
                                    })()}
                                    {getDocumentTitle(selectedDoc)}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription className="flex flex-wrap items-center gap-2">
                            {selectedDoc && (
                                <>
                                    <Badge variant="secondary">
                                        {getDocumentType(selectedDoc)}
                                    </Badge>
                                    {selectedDoc.metadata?.collectionName && (
                                        <Badge variant="outline">
                                            <Layers className="h-3 w-3 mr-1" />
                                            {selectedDoc.metadata.collectionName as string}
                                        </Badge>
                                    )}
                                    <span className="text-xs">
                                        {selectedDoc.content.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                                    </span>
                                    {selectedDoc.metadata?.source && (
                                        <a
                                            href={selectedDoc.metadata.source as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            View source <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDoc && (
                        <>
                            <div className="grid grid-cols-3 gap-4 py-4 border-y">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">
                                        {selectedDoc.content.split(/\s+/).filter(Boolean).length.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Words</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">
                                        {selectedDoc.content.length.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Characters</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold">
                                        {(selectedDoc.content.length / 4).toFixed(0)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Est. Tokens</div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Content</span>
                                    <Button variant="ghost" size="sm" onClick={copyContent}>
                                        {copied ? (
                                            <Check className="h-4 w-4 mr-1 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 mr-1" />
                                        )}
                                        {copied ? "Copied!" : "Copy"}
                                    </Button>
                                </div>
                                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
                                    <pre className="text-sm whitespace-pre-wrap font-mono">
                                        {selectedDoc.content}
                                    </pre>
                                </ScrollArea>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-2 pt-4">
                                <span className="text-sm font-medium">Metadata</span>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Object.entries(selectedDoc.metadata || {})
                                        .filter(([key]) => !["content", "embedding"].includes(key))
                                        .map(([key, value]) => (
                                            <div key={key} className="flex justify-between p-2 rounded bg-muted/50">
                                                <span className="text-muted-foreground">{key}</span>
                                                <span className="font-mono text-xs truncate max-w-[200px]">
                                                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
