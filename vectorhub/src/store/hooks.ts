import { useState, useEffect } from "react";
import { useStore, StoreState } from "./index";

/**
 * Hook to handle Zustand store hydration
 * Returns true when the store has been hydrated from localStorage
 */
export function useHydration(): boolean {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        // Wait for next tick to ensure store is hydrated
        const unsubFinishHydration = useStore.persist.onFinishHydration(() => {
            setHydrated(true);
        });

        // Check if already hydrated
        if (useStore.persist.hasHydrated()) {
            setHydrated(true);
        }

        return () => {
            unsubFinishHydration();
        };
    }, []);

    return hydrated;
}

/**
 * Hook to safely access store state with hydration handling
 * Returns undefined during SSR/hydration, then the actual value
 */
export function useHydratedStore<T>(selector: (state: StoreState) => T): T | undefined {
    const hydrated = useHydration();
    const value = useStore(selector);

    if (!hydrated) {
        return undefined;
    }

    return value;
}

/**
 * Hook to get store state with a fallback value during hydration
 */
export function useStoreWithFallback<T>(
    selector: (state: StoreState) => T,
    fallback: T
): T {
    const hydrated = useHydration();
    const value = useStore(selector);

    if (!hydrated) {
        return fallback;
    }

    return value;
}

