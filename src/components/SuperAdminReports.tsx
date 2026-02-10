
import React, { useMemo } from 'react';
import type { Institution, ActivityLog, User, MpesaTransaction } from '../types';
import {
    ChartBarIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    CurrencyIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon
} from './icons/index';

interface SuperAdminReportsProps {
    institutions: Institution[];
    activityLog: ActivityLog[];
    users: User[];
    transactions: MpesaTransaction[];
}

export const SuperAdminReports: React.FC<SuperAdminReportsProps> = ({
    institutions = [],
    activityLog = [],
    users = [],
    transactions = []
}) => {
    const stats = useMemo(() => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const activityByInstitution = activityLog.reduce((acc, log) => {
            if (log.institutionId) {
                acc[log.institutionId] = (acc[log.institutionId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const lastActivityByInstitution = activityLog.reduce((acc, log) => {
            if (log.institutionId) {
                const logTime = new Date(log.timestamp).getTime();
                if (!acc[log.institutionId] || logTime > acc[log.institutionId]) {
                    acc[log.institutionId] = logTime;
                }
            }
            return acc;
        }, {} as Record<string, number>);

        const activeToday = institutions.filter(inst => {
            const lastActive = lastActivityByInstitution[inst.id];
            return lastActive && lastActive > oneDayAgo.getTime();
        }).length;

        const dormant = institutions.filter(inst => {
            const lastActive = lastActivityByInstitution[inst.id];
            return !lastActive || lastActive < thirtyDaysAgo.getTime();
        });

        const activeList = institutions
            .map(inst => ({
                ...inst,
                activityCount: activityByInstitution[inst.id] || 0,
                userCount: users.filter(u => u.institutionId === inst.id).length,
                lastActive: lastActivityByInstitution[inst.id] ? new Date(lastActivityByInstitution[inst.id]) : null
            }))
            .sort((a, b) => b.activityCount - a.activityCount);

        const totalTransactions = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
            activeToday,
            dormantCount: dormant.length,
            dormantList: dormant,
            activeList,
            totalTransactions
        };
    }, [institutions, activityLog, users, transactions]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Platform Usage & Accounts Analysis</h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Super Admin Insight Engine</p>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Tenants</h4>
                    </div>
                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{institutions.length}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Today</h4>
                    </div>
                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">{stats.activeToday}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dormant (30d+)</h4>
                    </div>
                    <p className="text-4xl font-black text-amber-600 tracking-tighter">{stats.dormantCount}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                            <CurrencyIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transactions</h4>
                    </div>
                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(stats.totalTransactions)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Most Active Institutions */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <ChartBarIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter">Most Active Tenants</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {stats.activeList.slice(0, 5).map((inst, index) => (
                            <div key={inst.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 text-xs font-black">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{inst.name}</p>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{inst.institutionType} • {inst.userCount} Users</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-indigo-600">{inst.activityCount}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Events Logged</p>
                                </div>
                            </div>
                        ))}
                        {stats.activeList.length === 0 && (
                            <p className="text-center py-10 text-slate-400 text-xs font-black uppercase">No activity recorded</p>
                        )}
                    </div>
                </div>

                {/* Dormant Institutions */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                <ClockIcon className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter">Dormant Accounts</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {stats.dormantList.slice(0, 5).map(inst => (
                            <div key={inst.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{inst.name}</p>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Type: {inst.institutionType}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-red-500 uppercase tracking-tighter">Inactive</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase">30+ Days</p>
                                </div>
                            </div>
                        ))}
                        {stats.dormantList.length === 0 && (
                            <p className="text-center py-10 text-slate-400 text-xs font-black uppercase tracking-widest leading-loose">
                                ✨ All accounts show recent activity
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Usage Analysis */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-xl">
                        <UserGroupIcon className="w-6 h-6 text-sky-600" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Tenant Resource Analysis</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Users</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Last Event</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                            {stats.activeList.map(inst => (
                                <tr key={inst.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                                    <td className="py-4 font-bold text-sm text-slate-800 dark:text-white">{inst.name}</td>
                                    <td className="py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">{inst.institutionType}</td>
                                    <td className="py-4 text-sm font-bold text-slate-700 dark:text-slate-300">{inst.userCount}</td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${inst.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                                inst.status === 'trial' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {inst.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right text-xs font-mono text-slate-400">
                                        {inst.lastActive ? inst.lastActive.toLocaleDateString() : 'Never'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
