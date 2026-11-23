import React from 'react';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';

interface AutoRefreshBadgeProps {
    lastSyncedAt: Date | null;
    isSyncing: boolean;
    isPaused?: boolean;
    isUserPaused: boolean;
    onTogglePause: () => void;
    onRefreshNow: () => void;
    variant?: 'light' | 'dark';
    label?: string;
    className?: string;
}

export const AutoRefreshBadge: React.FC<AutoRefreshBadgeProps> = ({
    lastSyncedAt,
    isSyncing,
    isPaused = false,
    isUserPaused,
    onTogglePause,
    onRefreshNow,
    variant = 'light',
    label = 'Live Sync',
    className = '',
}) => {
    const isDark = variant === 'dark';
    const effectivePaused = isUserPaused || isPaused;

    const statusText = isUserPaused
        ? 'Sync Paused'
        : isSyncing
        ? 'Syncing...'
        : isPaused
        ? 'Paused (Editing)'
        : label;

    const dotClass = isUserPaused
        ? 'bg-amber-400'
        : isSyncing
        ? 'bg-sky-400 animate-ping'
        : isPaused
        ? 'bg-slate-400'
        : 'bg-emerald-500 animate-pulse';

    return (
        <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 ${
                isDark
                    ? 'bg-slate-900/70 border-slate-700/80 text-slate-200'
                    : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200'
            } ${className}`}
        >
            <button
                type="button"
                onClick={onTogglePause}
                className="flex items-center gap-2 text-left cursor-pointer group"
                title={
                    isUserPaused
                        ? 'Click to resume automatic background sync'
                        : 'Click to pause automatic background sync'
                }
            >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                <div className="leading-tight">
                    <div
                        className={`text-[10px] font-black uppercase tracking-wider ${
                            isDark
                                ? 'text-white group-hover:text-emerald-300'
                                : 'text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                        }`}
                    >
                        {statusText}
                    </div>
                    {lastSyncedAt && (
                        <div
                            className={`text-[9px] font-bold ${
                                isDark ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            {lastSyncedAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                            })}
                        </div>
                    )}
                </div>
            </button>

            <button
                type="button"
                onClick={() => onRefreshNow()}
                disabled={isSyncing}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
                    isDark
                        ? 'bg-white/10 hover:bg-white/20 border-white/15 text-emerald-300'
                        : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600'
                }`}
                title="Refresh now"
                aria-label="Refresh now"
            >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
};
