"use client";

import { useState } from "react";
import { CreateCollectionConfig } from "@/lib/db/adapters/base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Layers, Loader2 } from "lucide-react";

interface CreateCollectionModalProps {
    onSubmit: (config: CreateCollectionConfig) => Promise<void> | void;
    disabled?: boolean;
}

const EMBEDDING_PRESETS = [
    { label: "OpenAI text-embedding-3-small", value: "1536" },
    { label: "OpenAI text-embedding-3-large", value: "3072" },
    { label: "Cohere embed-english-v3.0", value: "1024" },
    { label: "Custom", value: "custom" },
];

export function CreateCollectionModal({ onSubmit, disabled }: CreateCollectionModalProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [dimensionPreset, setDimensionPreset] = useState("1536");
    const [customDimensions, setCustomDimensions] = useState("");
    const [metric, setMetric] = useState<"cosine" | "euclidean" | "dot_product">("cosine");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dimensions =
        dimensionPreset === "custom"
            ? parseInt(customDimensions) || 0
            : parseInt(dimensionPreset);

    const isValid = name.trim().length > 0 && dimensions > 0 && dimensions <= 10000;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                name: name.trim(),
                dimensions,
                distanceMetric: metric,
            });
            setOpen(false);
            resetForm();
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setName("");
        setDimensionPreset("1536");
        setCustomDimensions("");
        setMetric("cosine");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={disabled}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Collection
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Create New Collection
                    </DialogTitle>
                    <DialogDescription>
                        Configure the schema and index settings for your new vector collection.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Collection Name</Label>
                        <Input
                            id="name"
                            placeholder="my_documents"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            pattern="^[a-zA-Z][a-zA-Z0-9_-]*$"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Start with a letter. Use letters, numbers, underscores, or hyphens.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Embedding Model</Label>
                        <Select value={dimensionPreset} onValueChange={setDimensionPreset}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                {EMBEDDING_PRESETS.map((preset) => (
                                    <SelectItem key={preset.value} value={preset.value}>
                                        {preset.label}
                                        {preset.value !== "custom" && (
                                            <span className="ml-2 text-muted-foreground">
                                                ({preset.value}d)
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {dimensionPreset === "custom" && (
                        <div className="space-y-2">
                            <Label htmlFor="dimensions">Custom Dimensions</Label>
                            <Input
                                id="dimensions"
                                type="number"
                                placeholder="768"
                                value={customDimensions}
                                onChange={(e) => setCustomDimensions(e.target.value)}
                                min={1}
                                max={10000}
                                required
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Distance Metric</Label>
                        <Select
                            value={metric}
                            onValueChange={(v) =>
                                setMetric(v as "cosine" | "euclidean" | "dot_product")
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cosine">
                                    <div className="flex flex-col">
                                        <span>Cosine Similarity</span>
                                        <span className="text-xs text-muted-foreground">
                                            Best for normalized embeddings
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="euclidean">
                                    <div className="flex flex-col">
                                        <span>Euclidean Distance</span>
                                        <span className="text-xs text-muted-foreground">
                                            L2 distance between vectors
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="dot_product">
                                    <div className="flex flex-col">
                                        <span>Dot Product</span>
                                        <span className="text-xs text-muted-foreground">
                                            Inner product similarity
                                        </span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!isValid || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? "Creating..." : "Create Collection"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
