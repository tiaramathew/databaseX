"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Globe,
    Plus,
    Trash2,
    Loader2,
    Download,
    FileText,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Link as LinkIcon,
    FileSpreadsheet,
    FileType,
} from "lucide-react";

interface ScrapeJob {
    id: string;
    url: string;
    status: "pending" | "scraping" | "completed" | "error";
    progress: number;
    title?: string;
    content?: string;
    documentType?: string;
    wordCount?: number;
    error?: string;
    lastScraped?: Date;
    hasChanges?: boolean;
}

export interface ScrapedDocument {
    id: string;
    url: string;
    title: string;
    content: string;
    metadata: {
        source: string;
        type: string;
        wordCount: number;
        scrapedAt: Date;
        documentType?: string;
    };
}

// Supported document formats from Firecrawl
const supportedFormats = [
    { ext: ".pdf", label: "PDF Documents", icon: FileText },
    { ext: ".xlsx/.xls", label: "Excel Spreadsheets", icon: FileSpreadsheet },
    { ext: ".docx/.doc", label: "Word Documents", icon: FileType },
    { ext: ".odt/.rtf", label: "OpenDocument/RTF", icon: FileType },
];

export function ScrapeUpload({ onUpload, disabled }: ScrapeUploadProps) {
    const [urls, setUrls] = useState<ScrapeJob[]>([]);
    const [newUrl, setNewUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [enableChangeTracking, setEnableChangeTracking] = useState(true);
    const [autoReplace, setAutoReplace] = useState(true);
    const [scrapeDepth, setScrapeDepth] = useState<"single" | "crawl">("single");
    const [maxPages, setMaxPages] = useState("10");

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const getDocumentType = (url: string) => {
        const ext = url.split(".").pop()?.toLowerCase();
        if (["pdf"].includes(ext || "")) return "pdf";
        if (["xlsx", "xls"].includes(ext || "")) return "excel";
        if (["docx", "doc", "odt", "rtf"].includes(ext || "")) return "word";
        return "webpage";
    };

    const addUrl = useCallback(() => {
        if (!newUrl.trim()) return;

        if (!isValidUrl(newUrl)) {
            toast.error("Invalid URL", {
                description: "Please enter a valid URL starting with http:// or https://",
            });
            return;
        }

        if (urls.some((u) => u.url === newUrl)) {
            toast.error("URL already added", {
                description: "This URL is already in the list",
            });
            return;
        }

        setUrls((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                url: newUrl,
                status: "pending",
                progress: 0,
                documentType: getDocumentType(newUrl),
            },
        ]);
        setNewUrl("");
    }, [newUrl, urls]);

    const removeUrl = useCallback((id: string) => {
        setUrls((prev) => prev.filter((u) => u.id !== id));
    }, []);

    const performScrape = useCallback(async (job: ScrapeJob): Promise<ScrapeJob> => {
        try {
            // Initial progress
            setUrls((prev) =>
                prev.map((u) => (u.id === job.id ? { ...u, progress: 10, status: "scraping" } : u))
            );

            const response = await fetch("/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: job.url,
                    formats: ["markdown"],
                    onlyMainContent: true
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Failed to scrape URL");
            }

            // Success
            return {
                ...job,
                status: "completed",
                progress: 100,
                title: result.data.metadata?.title || result.data.metadata?.source || job.url,
                content: result.data.content,
                wordCount: result.data.content.split(/\s+/).length,
                lastScraped: new Date(),
                hasChanges: false, // TODO: Implement change detection logic if needed
                documentType: result.data.metadata?.type || "webpage",
            };
        } catch (error) {
            return {
                ...job,
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Failed to scrape content",
            };
        }
    }, []);

    const handleScrape = useCallback(async () => {
        const pendingJobs = urls.filter((u) => u.status === "pending" || u.status === "error");

        if (pendingJobs.length === 0) {
            toast.error("No URLs to scrape", {
                description: "Add some URLs first or retry failed ones",
            });
            return;
        }

        setIsScraping(true);
        const toastId = toast.loading(`Scraping ${pendingJobs.length} URL(s)...`);

        const results: ScrapeJob[] = [];

        for (const job of pendingJobs) {
            const result = await performScrape(job);
            results.push(result);
            setUrls((prev) => prev.map((u) => (u.id === result.id ? result : u)));
        }

        const successful = results.filter((r) => r.status === "completed");
        const failed = results.filter((r) => r.status === "error");

        toast.dismiss(toastId);

        if (successful.length > 0) {
            toast.success(`Scraped ${successful.length} URL(s)`, {
                description: `${successful.reduce((acc, r) => acc + (r.wordCount || 0), 0).toLocaleString()} words extracted`,
            });
        }

        if (failed.length > 0) {
            toast.error(`Failed to scrape ${failed.length} URL(s)`, {
                description: "Check the errors and retry",
            });
        }

        setIsScraping(false);
    }, [urls, performScrape]);

    const handleUpload = useCallback(async () => {
        const completedJobs = urls.filter((u) => u.status === "completed" && u.content);

        if (completedJobs.length === 0) {
            toast.error("No scraped content to upload", {
                description: "Scrape some URLs first",
            });
            return;
        }

        const documents: ScrapedDocument[] = completedJobs.map((job) => ({
            id: job.id,
            url: job.url,
            title: job.title || "Untitled",
            content: job.content || "",
            metadata: {
                source: job.url,
                type: job.documentType || "webpage",
                wordCount: job.wordCount || 0,
                scrapedAt: job.lastScraped || new Date(),
                documentType: job.documentType,
            },
        }));

        await onUpload(documents);

        // Clear completed jobs
        setUrls((prev) => prev.filter((u) => u.status !== "completed"));
    }, [urls, onUpload]);

    {/* Supported Formats Info */ }
    <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Parsing
            </CardTitle>
            <CardDescription className="text-xs">
                Firecrawl automatically parses these document formats
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-2">
                {supportedFormats.map((format) => (
                    <Badge key={format.ext} variant="outline" className="text-xs">
                        <format.icon className="h-3 w-3 mr-1" />
                        {format.ext}
                    </Badge>
                ))}
            </div>
        </CardContent>
    </Card>

    {/* URL List */ }
    {
        urls.length > 0 && (
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                            URLs to Scrape ({urls.length})
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {completedCount > 0 && (
                                <Badge variant="secondary">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {completedCount} ready
                                </Badge>
                            )}
                            {totalWords > 0 && (
                                <Badge variant="outline">{totalWords.toLocaleString()} words</Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[250px]">
                        <AnimatePresence>
                            <div className="space-y-2">
                                {urls.map((job) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: -10 }}
                    </CardContent>
                        </Card>
            )}

                        {/* Actions */}
                    </Button>
                                )}
                </div>

                {/* Empty State */}
                {urls.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Globe className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium">No URLs added</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            Add website URLs or document links to scrape content and upload to your
                            vector database.
                        </p>
                    </div>
                )}
            </div>
        );
    }
