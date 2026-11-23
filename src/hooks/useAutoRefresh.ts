import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAutoRefreshOptions {
    /** Master switch — set false when no institution/user is loaded yet */
    enabled?: boolean;
    /** Background refresh interval in milliseconds (default: 25000ms) */
    intervalMs?: number;
    /** Temporarily pause (e.g. while a modal/form is open) */
    paused?: boolean;
    /** Silent refresh callback */
    onRefresh: () => Promise<void> | void;
    /** Minimum time tab must be hidden before refreshing on return (default: 5000ms) */
    minHiddenMsForFocusRefresh?: number;
}

export interface UseAutoRefreshResult {
    lastSyncedAt: Date | null;
    isSyncing: boolean;
    isUserPaused: boolean;
    togglePause: () => void;
    refreshNow: () => Promise<void>;
}

/**
 * Reusable silent background auto-refresh hook for multi-user modules.
 * - Pauses automatically when the browser tab is hidden or a modal/form is open.
 * - Prevents overlapping in-flight fetches.
 * - Triggers an immediate silent refresh when the user returns to the tab or reconnects online.
 */
export function useAutoRefresh({
    enabled = true,
    intervalMs = 25000,
    paused = false,
    onRefresh,
    minHiddenMsForFocusRefresh = 5000,
}: UseAutoRefreshOptions): UseAutoRefreshResult {
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date());
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUserPaused, setIsUserPaused] = useState(false);

    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    const inFlightRef = useRef(false);
    const hiddenAtRef = useRef<number | null>(null);
    const errorCountRef = useRef(0);

    const runRefresh = useCallback(async () => {
        if (inFlightRef.current) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        inFlightRef.current = true;
        setIsSyncing(true);
        try {
            await onRefreshRef.current();
            errorCountRef.current = 0;
            setLastSyncedAt(new Date());
        } catch (err) {
            errorCountRef.current = Math.min(errorCountRef.current + 1, 4);
            console.warn('[useAutoRefresh] Background refresh warning:', err);
        } finally {
            inFlightRef.current = false;
            setIsSyncing(false);
        }
    }, []);

    // Interval timer with light backoff on repeated errors
    useEffect(() => {
        if (!enabled || paused || isUserPaused) return;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const scheduleNext = () => {
            if (cancelled) return;
            const multiplier = errorCountRef.current > 0 ? Math.min(2, 1 + errorCountRef.current * 0.5) : 1;
            const delay = Math.round(intervalMs * multiplier);
            timer = setTimeout(async () => {
                if (cancelled) return;
                if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                    await runRefresh();
                }
                scheduleNext();
            }, delay);
        };

        scheduleNext();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [enabled, paused, isUserPaused, intervalMs, runRefresh]);

    // Refresh immediately when returning to the browser tab or coming back online
    useEffect(() => {
        if (!enabled || isUserPaused) return;

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAtRef.current = Date.now();
            } else if (document.visibilityState === 'visible' && !paused) {
                const hiddenDuration = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : minHiddenMsForFocusRefresh;
                hiddenAtRef.current = null;
                if (hiddenDuration >= minHiddenMsForFocusRefresh) {
                    runRefresh();
                }
            }
        };

        const handleOnline = () => {
            if (!paused && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
                runRefresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('online', handleOnline);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('online', handleOnline);
        };
    }, [enabled, paused, isUserPaused, minHiddenMsForFocusRefresh, runRefresh]);

    const togglePause = useCallback(() => {
        setIsUserPaused(prev => !prev);
    }, []);

    return {
        lastSyncedAt,
        isSyncing,
        isUserPaused,
        togglePause,
        refreshNow: runRefresh,
    };
}
