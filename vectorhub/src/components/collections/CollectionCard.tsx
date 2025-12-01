"use client";

import { CollectionInfo } from "@/lib/db/adapters/base";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Trash2, Edit, BarChart3, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionCardProps {
    collection: CollectionInfo;
    onDelete: (name: string) => void;
    onEdit: (name: string) => void;
    onViewStats: (name: string) => void;
    onViewDetails?: (collection: CollectionInfo) => void;
}

const metricColors: Record<string, string> = {
    cosine: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    euclidean: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    dot_product: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function CollectionCard({
    collection,
    onDelete,
    onEdit,
    onViewStats,
    onViewDetails,
}: CollectionCardProps) {
    const metricColor = metricColors[collection.distanceMetric] || metricColors.cosine;

    return (
        <Card 
            className="card-hover cursor-pointer transition-all hover:border-primary/50"
            onClick={() => onViewDetails?.(collection)}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <span className="truncate max-w-[150px]">{collection.name}</span>
                    </div>
                </CardTitle>
                <Badge variant="outline" className={cn("text-xs", metricColor)}>
                    {collection.distanceMetric}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-3xl font-bold tabular-nums">
                    {collection.documentCount.toLocaleString()}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {collection.dimensions.toLocaleString()} dimensions
                    </span>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-0" onClick={(e) => e.stopPropagation()}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewStats(collection.name)}
                >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Stats
                </Button>
                <div className="flex space-x-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(collection.name)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(collection.name)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
