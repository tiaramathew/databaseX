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
    Clock,
    Zap,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrapeUploadProps {
    onUpload: (documents: ScrapedDocument[]) => Promise<void>;
    disabled?: boolean;
}

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

    const simulateScrape = async (job: ScrapeJob): Promise<ScrapeJob> => {
        // Simulate scraping with progress updates
        for (let i = 0; i <= 100; i += 20) {
            await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
            setUrls((prev) =>
                prev.map((u) => (u.id === job.id ? { ...u, progress: i, status: "scraping" } : u))
            );
        }

        // Simulate success/failure
        const success = Math.random() > 0.1; // 90% success rate

        if (success) {
            const docType = job.documentType || "webpage";
            const mockContent = generateMockContent(docType, job.url);

            return {
                ...job,
                status: "completed",
                progress: 100,
                title: mockContent.title,
                content: mockContent.content,
                wordCount: mockContent.content.split(/\s+/).length,
                lastScraped: new Date(),
                hasChanges: enableChangeTracking ? Math.random() > 0.5 : undefined,
            };
        } else {
            return {
                ...job,
                status: "error",
                progress: 0,
                error: "Failed to scrape content. Please check the URL and try again.",
            };
        }
    };

    const generateMockContent = (docType: string, url: string) => {
        const domain = new URL(url).hostname;

        switch (docType) {
            case "pdf":
                return {
                    title: `Document from ${domain}`,
                    content: `This is parsed content from a PDF document hosted on ${domain}. The document contains important information that has been extracted using optical character recognition and text parsing. Headers, paragraphs, lists, and tables have been preserved in the markdown output.`,
                };
            case "excel":
                return {
                    title: `Spreadsheet from ${domain}`,
                    content: `## Sheet1\n\n| Column A | Column B | Column C |\n|----------|----------|----------|\n| Data 1 | Data 2 | Data 3 |\n| Data 4 | Data 5 | Data 6 |\n\n## Sheet2\n\n| Name | Value |\n|------|-------|\n| Item 1 | 100 |\n| Item 2 | 200 |`,
                };
            case "word":
                return {
                    title: `Word Document from ${domain}`,
                    content: `# Document Title\n\nThis is the content extracted from a Word document. The original formatting has been preserved including:\n\n- Bullet points\n- **Bold text**\n- *Italic text*\n\n## Section 2\n\nAdditional content from the document follows here with proper paragraph structure.`,
                };
            default:
                return {
                    title: `Web Page: ${domain}`,
                    content: `This is the main content extracted from ${url}. The page contains valuable information about the topic. All relevant text has been extracted while removing navigation, ads, and other non-essential elements.\n\nKey points from this page:\n- Important information 1\n- Important information 2\n- Important information 3\n\nThe content has been cleaned and formatted for optimal use in RAG applications.`,
                };
        }
    };

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
            const result = await simulateScrape(job);
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
    }, [urls, enableChangeTracking]);

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

    const completedCount = urls.filter((u) => u.status === "completed").length;
    const pendingCount = urls.filter((u) => u.status === "pending" || u.status === "error").length;
    const totalWords = urls
        .filter((u) => u.status === "completed")
        .reduce((acc, u) => acc + (u.wordCount || 0), 0);

    return (
        <div className="space-y-6">
            {/* URL Input */}
            <div className="space-y-2">
                <Label>Add URL to Scrape</Label>
                <div className="flex gap-2">
                    <Input
                        placeholder="https://example.com/page or https://example.com/document.pdf"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addUrl();
                            }
                        }}
                        disabled={disabled}
                    />
                    <Button onClick={addUrl} disabled={disabled || !newUrl}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Supports web pages and documents (PDF, Excel, Word).{" "}
                    <a
                        href="https://docs.firecrawl.dev/features/document-parsing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                        View supported formats
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </p>
            </div>

            {/* Options */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Scrape Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Scrape Mode</Label>
                            <Select
                                value={scrapeDepth}
                                onValueChange={(v) => setScrapeDepth(v as "single" | "crawl")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">Single Page</SelectItem>
                                    <SelectItem value="crawl">Crawl Site</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {scrapeDepth === "crawl" && (
                            <div className="space-y-2">
                                <Label>Max Pages</Label>
                                <Input
                                    type="number"
                                    value={maxPages}
                                    onChange={(e) => setMaxPages(e.target.value)}
                                    min="1"
                                    max="100"
                                />
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm">Change Tracking</Label>
                            <p className="text-xs text-muted-foreground">
                                Detect changes on re-scrape using Firecrawl
                            </p>
                        </div>
                        <Switch
                            checked={enableChangeTracking}
                            onCheckedChange={setEnableChangeTracking}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm">Auto-Replace on Update</Label>
                            <p className="text-xs text-muted-foreground">
                                Replace existing documents when content changes
                            </p>
                        </div>
                        <Switch checked={autoReplace} onCheckedChange={setAutoReplace} />
                    </div>
                </CardContent>
            </Card>

            {/* Supported Formats Info */}
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

            {/* URL List */}
            {urls.length > 0 && (
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
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border",
                                                job.status === "completed" && "bg-emerald-500/5 border-emerald-500/20",
                                                job.status === "error" && "bg-destructive/5 border-destructive/20",
                                                job.status === "scraping" && "bg-primary/5 border-primary/20"
                                            )}
                                        >
                                            <div className="flex-shrink-0">
                                                {job.status === "scraping" ? (
                                                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                                ) : job.status === "completed" ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                ) : job.status === "error" ? (
                                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                                ) : job.documentType === "pdf" ? (
                                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                                ) : job.documentType === "excel" ? (
                                                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                                                ) : job.documentType === "word" ? (
                                                    <FileType className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <Globe className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium truncate">
                                                        {job.title || new URL(job.url).hostname}
                                                    </p>
                                                    {job.hasChanges && (
                                                        <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                                                            <RefreshCw className="h-2 w-2 mr-1" />
                                                            Changed
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {job.url}
                                                </p>
                                                {job.status === "scraping" && (
                                                    <Progress value={job.progress} className="h-1 mt-2" />
                                                )}
                                                {job.status === "completed" && job.wordCount && (
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                        {job.wordCount.toLocaleString()} words extracted
                                                    </p>
                                                )}
                                                {job.status === "error" && (
                                                    <p className="text-xs text-destructive mt-1">{job.error}</p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="flex-shrink-0"
                                                onClick={() => removeUrl(job.id)}
                                                disabled={job.status === "scraping"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
                {pendingCount > 0 && (
                    <Button
                        onClick={handleScrape}
                        disabled={disabled || isScraping}
                        variant="outline"
                    >
                        {isScraping ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="mr-2 h-4 w-4" />
                        )}
                        {isScraping ? "Scraping..." : `Scrape ${pendingCount} URL(s)`}
                    </Button>
                )}
                {completedCount > 0 && (
                    <Button onClick={handleUpload} disabled={disabled || isScraping}>
                        <Download className="mr-2 h-4 w-4" />
                        Upload {completedCount} Document(s)
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

