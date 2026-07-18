import React, { useState, useMemo } from 'react';
import type { ActivityLog } from '../../types';

interface ActivityLogPanelProps {
    logs: ActivityLog[];
    /** Optional module name for the heading e.g. "Library", "HR", "Inventory" */
    module?: string;
    /** Optional: extra CSS class applied to the outer wrapper */
    className?: string;
}

const ROWS_PER_PAGE = 25;

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ logs, module = '', className = '' }) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [userFilter, setUserFilter] = useState('');

    // Build unique user list from logs
    const userNames = useMemo(() => {
        const names = Array.from(new Set(logs.map(l => l.userName).filter(Boolean)));
        return names.sort();
    }, [logs]);

    const filtered = useMemo(() => {
        let result = [...logs];

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(l =>
                (l.action || '').toLowerCase().includes(q) ||
                (l.userName || '').toLowerCase().includes(q) ||
                (l.details || '').toLowerCase().includes(q)
            );
        }

        if (userFilter) {
            result = result.filter(l => l.userName === userFilter);
        }

        if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            result = result.filter(l => new Date(l.timestamp).getTime() >= from);
        }

        if (dateTo) {
            const to = new Date(dateTo).getTime() + 86400000; // inclusive end of day
            result = result.filter(l => new Date(l.timestamp).getTime() <= to);
        }

        // Latest first
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return result;
    }, [logs, search, userFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const resetFilters = () => {
        setSearch('');
        setUserFilter('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const formatTime = (ts: string) => {
        try {
            const d = new Date(ts);
            return d.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        } catch {
            return ts;
        }
    };

    const exportCsv = () => {
        const header = ['Timestamp', 'User', 'Action', 'Details'];
        const rows = filtered.map(l => [
            formatTime(l.timestamp),
            l.userName || '',
            (l.action || '').replace(/,/g, ';'),
            (l.details || '').replace(/,/g, ';')
        ]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${module || 'module'}_activity_log_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`space-y-6 animate-fade-in ${className}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">
                        {module ? `${module} — ` : ''}Activity Log
                    </h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {filtered.length} event{filtered.length !== 1 ? 's' : ''} recorded
                    </p>
                </div>
                <button
                    onClick={exportCsv}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search actions…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* User filter */}
                    <select
                        value={userFilter}
                        onChange={e => { setUserFilter(e.target.value); setPage(1); }}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Users</option>
                        {userNames.map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>

                    {/* Date from */}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="From date"
                    />

                    {/* Date to */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); }}
                            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            title="To date"
                        />
                        {(search || userFilter || dateFrom || dateTo) && (
                            <button
                                onClick={resetFilters}
                                title="Clear filters"
                                className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Log Table */}
            {paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                    <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-bold uppercase tracking-widest">No activity records found</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {paged.map((log, i) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-4 text-xs font-bold text-slate-400">
                                            {(page - 1) * ROWS_PER_PAGE + i + 1}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                                                {formatTime(log.timestamp)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {(log.userName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                                    {log.userName || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {log.action || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                {log.details || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                            <span className="text-xs text-slate-400 font-bold">
                                Page {page} of {totalPages} — {filtered.length} total events
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-xs font-black rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 disabled:opacity-40 hover:border-indigo-500 transition-all"
                                >← Prev</button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-xs font-black rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 disabled:opacity-40 hover:border-indigo-500 transition-all"
                                >Next →</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
