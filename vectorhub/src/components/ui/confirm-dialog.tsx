"use client";

import * as React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void | Promise<void>;
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    onConfirm,
    isLoading = false,
}: ConfirmDialogProps) {
    const [isPending, setIsPending] = React.useState(false);

    const handleConfirm = async () => {
        setIsPending(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } finally {
            setIsPending(false);
        }
    };

    const loading = isLoading || isPending;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={loading}
                        className={cn(
                            variant === "destructive" &&
                                buttonVariants({ variant: "destructive" })
                        )}
                    >
                        {loading ? "Please wait..." : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// Hook for easier confirm dialog usage
export function useConfirmDialog() {
    const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

    const [state, setState] = React.useState<{
        open: boolean;
        title: string;
        description: string;
        confirmText?: string;
        variant?: "default" | "destructive";
    }>({
        open: false,
        title: "",
        description: "",
    });

    const confirm = React.useCallback(
        (options: {
            title: string;
            description: string;
            confirmText?: string;
            variant?: "default" | "destructive";
        }): Promise<boolean> => {
            return new Promise((resolve) => {
                resolverRef.current = resolve;
                setState({
                    open: true,
                    ...options,
                });
            });
        },
        []
    );

    const handleConfirm = React.useCallback(() => {
        resolverRef.current?.(true);
        resolverRef.current = null;
    }, []);

    const handleOpenChange = React.useCallback((open: boolean) => {
        if (!open) {
            // Dialog was cancelled/closed without confirm
            resolverRef.current?.(false);
            resolverRef.current = null;
        }
        setState((prev) => ({ ...prev, open }));
    }, []);

    const Dialog = React.useCallback(
        () => (
            <ConfirmDialog
                open={state.open}
                onOpenChange={handleOpenChange}
                title={state.title}
                description={state.description}
                confirmText={state.confirmText}
                variant={state.variant}
                onConfirm={handleConfirm}
            />
        ),
        [state, handleOpenChange, handleConfirm]
    );

    return { confirm, Dialog };
}

