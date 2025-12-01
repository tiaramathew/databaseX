"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Settings, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface AdvancedOptions {
    chunkSize: number;
    chunkOverlap: number;
    scrapeFormat?: "markdown" | "html" | "rawHtml";
    onlyMainContent?: boolean;
}

interface AdvancedSettingsProps {
    options: AdvancedOptions;
    onChange: (options: AdvancedOptions) => void;
    showParsingOptions?: boolean;
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
}

export function AdvancedSettings({
    options,
    onChange,
    showParsingOptions = false,
    enabled,
    onEnabledChange,
}: AdvancedSettingsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleReset = useCallback(() => {
        onChange({
            chunkSize: 1000,
            chunkOverlap: 200,
            scrapeFormat: "markdown",
            onlyMainContent: true,
        });
    }, [onChange]);

    const updateOption = <K extends keyof AdvancedOptions>(key: K, value: AdvancedOptions[K]) => {
        onChange({ ...options, [key]: value });
    };

    return (
        <Collapsible
            open={isOpen && enabled}
            onOpenChange={(open) => {
                if (enabled) setIsOpen(open);
            }}
        >
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Advanced Options
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={(checked) => {
                                        onEnabledChange(checked);
                                        if (checked) setIsOpen(true);
                                    }}
                                />
                                <Label className="text-xs font-normal text-muted-foreground">
                                    {enabled ? "Enabled" : "Disabled"}
                                </Label>
                            </div>
                        </div>
                        {enabled && (
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-9 p-0">
                                    {isOpen ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Toggle</span>
                                </Button>
                            </CollapsibleTrigger>
                        )}
                    </div>
                    <CardDescription className="text-xs">
                        Configure {showParsingOptions ? "parsing formats and " : ""}chunking strategy
                    </CardDescription>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                        <Separator className="mb-4" />

                        <div className="flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reset to Defaults
                            </Button>
                        </div>

                        {/* Parsing Options */}
                        {showParsingOptions && (
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Parsing</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Output Format</Label>
                                        <Select
                                            value={options.scrapeFormat}
                                            onValueChange={(v) => updateOption("scrapeFormat", v as any)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="markdown">Markdown (Best for LLMs)</SelectItem>
                                                <SelectItem value="html">Clean HTML</SelectItem>
                                                <SelectItem value="rawHtml">Raw HTML</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between space-y-0 pt-8">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm">Only Main Content</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Skip navs, footers, ads
                                            </p>
                                        </div>
                                        <Switch
                                            checked={options.onlyMainContent}
                                            onCheckedChange={(v) => updateOption("onlyMainContent", v)}
                                        />
                                    </div>
                                </div>
                                <Separator />
                            </div>
                        )}

                        {/* Chunking Options */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Chunking</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Chunk Size</Label>
                                        <span className="text-xs font-medium tabular-nums">
                                            {options.chunkSize} chars
                                        </span>
                                    </div>
                                    <Slider
                                        value={[options.chunkSize]}
                                        onValueChange={(v) => updateOption("chunkSize", v[0])}
                                        min={100}
                                        max={4000}
                                        step={100}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Target size for each text segment
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Chunk Overlap</Label>
                                        <span className="text-xs font-medium tabular-nums">
                                            {options.chunkOverlap} chars
                                        </span>
                                    </div>
                                    <Slider
                                        value={[options.chunkOverlap]}
                                        onValueChange={(v) => updateOption("chunkOverlap", v[0])}
                                        min={0}
                                        max={500}
                                        step={10}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Overlap between chunks to preserve context
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
