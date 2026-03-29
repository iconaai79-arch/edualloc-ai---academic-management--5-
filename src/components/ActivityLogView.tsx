import React, { useState, useMemo } from 'react';
import type { ActivityLog } from '../types';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';


const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

export const ActivityLogView: React.FC<{ activityLog: ActivityLog[] }> = ({ activityLog }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const sortedLog = useMemo(() => {
        return [...activityLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [activityLog]);

    const filteredLog = useMemo(() => {
        if (!searchQuery.trim()) {
            return sortedLog;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return sortedLog.filter(log =>
            log.userName.toLowerCase().includes(lowercasedQuery) ||
            (log.institutionName && log.institutionName.toLowerCase().includes(lowercasedQuery)) ||
            log.action.toLowerCase().includes(lowercasedQuery)
        );
    }, [sortedLog, searchQuery]);

    return (
        <section className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Audit Trail</h3>
                    <p className="text-sm text-slate-500">Monitor all security and administrative events across the platform.</p>
                </div>
                <div className="relative w-full sm:w-80">
                    <input
                        type="text"
                        id="activity-search"
                        placeholder="Filter log entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-input w-full pl-10"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Event Time</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Origin</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Subject</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Action Performed</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Network Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredLog.length > 0 ? (
                                filteredLog.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                            {formatTimestamp(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{log.institutionName || 'SYSTEM'}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-mono">{log.institutionId || 'CORE'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{log.userName}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{log.userId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-normal">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{log.action}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                                            {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                                            {log.macAddress && <div>MAC: {log.macAddress}</div>}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-sm text-slate-500 italic">
                                        {activityLog.length === 0 ? (
                                            <div className="flex flex-col items-center">
                                                <ClipboardListIcon className="w-12 h-12 text-slate-200 mb-2" />
                                                No events have been recorded in the audit trail yet.
                                            </div>
                                        ) : (
                                            "No matches found for your current filter."
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                .form-input { display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
            `}</style>
        </section>
    );
};