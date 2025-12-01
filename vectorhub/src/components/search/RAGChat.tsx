"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Send,
    Loader2,
    Bot,
    User,
    FileText,
    Sparkles,
    Copy,
    Check,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Zap,
    Globe,
    Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchResult } from "@/lib/db/adapters/base";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    context?: SearchResult[];
    agentUsed?: string;
    isLoading?: boolean;
}

export interface AIAgent {
    id: string;
    name: string;
    type: "mcp" | "webhook" | "mock";
    endpoint?: string;
    status: "connected" | "disconnected" | "error";
}

interface RAGChatProps {
    onSendMessage: (
        message: string,
        agent: AIAgent | null
    ) => Promise<{ response: string; context: SearchResult[] }>;
    agents: AIAgent[];
    selectedAgent: AIAgent | null;
    onSelectAgent: (agent: AIAgent | null) => void;
    collectionName: string;
    disabled?: boolean;
}

function ContextPanel({ context }: { context: SearchResult[] }) {
    const [expanded, setExpanded] = useState(false);

    if (context.length === 0) return null;

    return (
        <div className="mt-3 border-t border-border/50 pt-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
                <Database className="h-3 w-3" />
                <span>{context.length} source{context.length !== 1 ? "s" : ""} retrieved</span>
                {expanded ? (
                    <ChevronUp className="h-3 w-3 ml-auto" />
                ) : (
                    <ChevronDown className="h-3 w-3 ml-auto" />
                )}
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 space-y-2">
                            {context.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-2 rounded-md bg-muted/50 text-xs"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium flex items-center gap-1">
                                            <FileText className="h-3 w-3" />
                                            {(item.metadata?.source as string) || `Source ${idx + 1}`}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] h-4">
                                            {(item.score * 100).toFixed(0)}%
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground line-clamp-2">
                                        {item.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MessageBubble({ message }: { message: Message }) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === "user";

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-3", isUser && "flex-row-reverse")}
        >
            <div
                className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                )}
            >
                {isUser ? (
                    <User className="h-4 w-4" />
                ) : (
                    <Bot className="h-4 w-4" />
                )}
            </div>
            <div
                className={cn(
                    "flex-1 max-w-[85%]",
                    isUser && "flex flex-col items-end"
                )}
            >
                <Card
                    className={cn(
                        "inline-block",
                        isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-card"
                    )}
                >
                    <CardContent className="p-3">
                        {message.isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Thinking...</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm whitespace-pre-wrap">
                                    {message.content}
                                </p>
                                {!isUser && message.context && (
                                    <ContextPanel context={message.context} />
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
                <div
                    className={cn(
                        "flex items-center gap-2 mt-1 text-xs text-muted-foreground",
                        isUser && "flex-row-reverse"
                    )}
                >
                    <span>
                        {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                    {message.agentUsed && (
                        <Badge variant="outline" className="text-[10px] h-4">
                            {message.agentUsed}
                        </Badge>
                    )}
                    {!isUser && !message.isLoading && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={handleCopy}
                        >
                            {copied ? (
                                <Check className="h-3 w-3" />
                            ) : (
                                <Copy className="h-3 w-3" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export function RAGChat({
    onSendMessage,
    agents,
    selectedAgent,
    onSelectAgent,
    collectionName,
    disabled = false,
}: RAGChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        const loadingMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isLoading: true,
            agentUsed: selectedAgent?.name || "Vector Search",
        };

        setMessages((prev) => [...prev, userMessage, loadingMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const { response, context } = await onSendMessage(
                input.trim(),
                selectedAgent
            );

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === loadingMessage.id
                        ? {
                              ...msg,
                              content: response,
                              context,
                              isLoading: false,
                          }
                        : msg
                )
            );
        } catch {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === loadingMessage.id
                        ? {
                              ...msg,
                              content:
                                  "Sorry, I encountered an error processing your request. Please try again.",
                              isLoading: false,
                          }
                        : msg
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const getAgentIcon = (type: string) => {
        switch (type) {
            case "mcp":
                return <Zap className="h-3 w-3" />;
            case "webhook":
                return <Globe className="h-3 w-3" />;
            default:
                return <Sparkles className="h-3 w-3" />;
        }
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-lg bg-card">
            {/* Header with agent selector */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold">RAG Assistant</h3>
                        <p className="text-xs text-muted-foreground">
                            Searching in: {collectionName || "No collection selected"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearChat}
                            className="text-muted-foreground"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Agent selector */}
            <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Response via:
                    </span>
                    <Button
                        variant={selectedAgent === null ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onSelectAgent(null)}
                    >
                        <Database className="h-3 w-3 mr-1" />
                        Vector Only
                    </Button>
                    {agents.map((agent) => (
                        <Button
                            key={agent.id}
                            variant={
                                selectedAgent?.id === agent.id
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onSelectAgent(agent)}
                            disabled={agent.status !== "connected"}
                        >
                            {getAgentIcon(agent.type)}
                            <span className="ml-1">{agent.name}</span>
                            <span
                                className={cn(
                                    "ml-1 h-1.5 w-1.5 rounded-full",
                                    agent.status === "connected"
                                        ? "bg-emerald-500"
                                        : agent.status === "error"
                                        ? "bg-red-500"
                                        : "bg-zinc-400"
                                )}
                            />
                        </Button>
                    ))}
                    {agents.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                            No AI agents connected. Add MCP or Webhook connections.
                        </span>
                    )}
                </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Sparkles className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            Start a Conversation
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Ask questions about your documents. The assistant will
                            search the vector database and provide relevant answers.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {[
                                "What are the main topics?",
                                "Summarize the documents",
                                "Find information about...",
                            ].map((suggestion) => (
                                <Button
                                    key={suggestion}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setInput(suggestion)}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Input area */}
            <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Textarea
                        ref={textareaRef}
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="min-h-[44px] max-h-32 resize-none"
                        rows={1}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="h-11 w-11 flex-shrink-0"
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

