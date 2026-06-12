
import React, { useMemo, useState } from 'react';
import type { Institution, ActivityLog, User, MpesaTransaction, CarInvoice, CarPayment, CarListing, BankTransaction } from '../types';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface SuperAdminReportsProps {
    institutions: Institution[];
    activityLog: ActivityLog[];
    users: User[];
    transactions: MpesaTransaction[];
    carInvoices?: CarInvoice[];
    carPayments?: CarPayment[];
    carListings?: CarListing[];
    carBankTransactions?: BankTransaction[];
}

export const SuperAdminReports: React.FC<SuperAdminReportsProps> = ({
    institutions = [],
    activityLog = [],
    users = [],
    transactions = [],
    carInvoices = [],
    carPayments = [],
    carListings = [],
    carBankTransactions = []
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'platform' | 'automotive'>('platform');

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

        // Automotive marketplace metrics
        const validCarInvoices = carInvoices.filter(inv => inv.status !== 'cancelled');
        const totalCarSales = validCarInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalCarPayments = carPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalCarBalance = validCarInvoices.reduce((sum, inv) => sum + (inv.balanceAmount ?? (inv.totalAmount - (inv.paidAmount || 0))), 0);
        
        const activeListingsCount = carListings.filter(l => l.status === 'active').length;
        const soldListingsCount = carListings.filter(l => l.status === 'sold').length;
        const totalListingsCount = carListings.length;

        const totalBankTxns = carBankTransactions.length;
        const reconciledBankTxns = carBankTransactions.filter(t => t.status === 'reconciled').length;
        const reconciliationRate = totalBankTxns > 0 
            ? Math.round((reconciledBankTxns / totalBankTxns) * 100) 
            : 100;

        return {
            activeToday,
            dormantCount: dormant.length,
            dormantList: dormant,
            activeList,
            totalTransactions,
            // Automotive
            totalCarSales,
            totalCarPayments,
            totalCarBalance,
            activeListingsCount,
            soldListingsCount,
            totalListingsCount,
            totalBankTxns,
            reconciledBankTxns,
            reconciliationRate
        };
    }, [institutions, activityLog, users, transactions, carInvoices, carPayments, carListings, carBankTransactions]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Platform Usage & Reports Analysis</h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Super Admin Insight Engine</p>
                </div>
                {/* Modern tab selectors */}
                <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 w-full md:w-auto">
                    <button
                        onClick={() => setActiveSubTab('platform')}
                        className={`flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'platform'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        Platform Overview
                    </button>
                    <button
                        onClick={() => setActiveSubTab('automotive')}
                        className={`flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'automotive'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        Automotive Marketplace Financials
                    </button>
                </div>
            </div>

            {activeSubTab === 'platform' ? (
                <>
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
                                {formatCurrency(stats.totalTransactions)}
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
                </>
            ) : (
                <div className="space-y-8">
                    {/* Automotive Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zM21 16v-4a1 1 0 00-.293-.707l-2-2A1 1 0 0018 9h-3v7h6z" />
                                    </svg>
                                </div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Car Sales</h4>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {formatCurrency(stats.totalCarSales)}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{carInvoices.length} Invoices Generated</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payments Collected</h4>
                            </div>
                            <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                {formatCurrency(stats.totalCarPayments)}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                {stats.totalCarSales > 0 ? Math.round((stats.totalCarPayments / stats.totalCarSales) * 100) : 0}% Collection Rate
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Outstanding Finance</h4>
                            </div>
                            <p className="text-3xl font-black text-amber-600 tracking-tighter">
                                {formatCurrency(stats.totalCarBalance)}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Awaiting Installments / Final Settlement</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Listing Metrics</h4>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {stats.soldListingsCount} / {stats.totalListingsCount} Sold
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                {stats.activeListingsCount} Live Showroom Listings
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Reconciliation rate */}
                        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter mb-2">Bank Reconciliation</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-6">Feeds matches to sales invoices</p>
                            </div>
                            <div className="flex flex-col items-center justify-center my-6">
                                <div className="relative w-36 h-36 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-700">
                                    <div className="text-center">
                                        <span className="text-4xl font-black text-indigo-600">{stats.reconciliationRate}%</span>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Reconciled</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-400 uppercase">Total Feeds:</span>
                                    <span className="text-slate-800 dark:text-white">{stats.totalBankTxns}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-400 uppercase">Reconciled:</span>
                                    <span className="text-emerald-600">{stats.reconciledBankTxns}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span className="text-slate-400 uppercase">Unreconciled:</span>
                                    <span className="text-amber-600">{stats.totalBankTxns - stats.reconciledBankTxns}</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Vehicle Sales Invoices */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tighter">Recent Showroom Invoices</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Global audit logs of marketplace invoicing</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700 pb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <th className="pb-3">Invoice No.</th>
                                            <th className="pb-3">Client</th>
                                            <th className="pb-3">Amount</th>
                                            <th className="pb-3">Paid</th>
                                            <th className="pb-3">Balance</th>
                                            <th className="pb-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                                        {carInvoices.slice(0, 5).map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                <td className="py-4 font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                                                <td className="py-4 font-bold text-slate-800 dark:text-white">
                                                    {inv.clientName}
                                                    {inv.registrationNumber && <span className="block text-[8px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{inv.registrationNumber}</span>}
                                                </td>
                                                <td className="py-4 font-bold text-slate-700 dark:text-slate-300">{formatCurrency(inv.totalAmount)}</td>
                                                <td className="py-4 text-emerald-600 font-bold">{formatCurrency(inv.paidAmount)}</td>
                                                <td className="py-4 text-amber-600 font-bold">{formatCurrency(inv.balanceAmount ?? (inv.totalAmount - (inv.paidAmount || 0)))}</td>
                                                <td className="py-4 text-right">
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                                        inv.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-600' :
                                                        inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-600' :
                                                        inv.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {carInvoices.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">No invoices found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Bank Feeds Feed */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tighter">Automotive Bank Transactions Feed</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Real-time listing payments & transfers</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700 pb-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="pb-3">Date</th>
                                        <th className="pb-3">Reference</th>
                                        <th className="pb-3">Sender Name</th>
                                        <th className="pb-3">Bank Name</th>
                                        <th className="pb-3">Amount</th>
                                        <th className="pb-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                                    {carBankTransactions.slice(0, 5).map(txn => (
                                        <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                            <td className="py-4 text-slate-400 font-mono">{txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString() : 'N/A'}</td>
                                            <td className="py-4 font-mono font-bold text-slate-800 dark:text-white">{txn.reference}</td>
                                            <td className="py-4 text-slate-600 dark:text-slate-400">{txn.senderName || 'N/A'}</td>
                                            <td className="py-4 text-slate-400 font-bold">{txn.bankName || 'N/A'}</td>
                                            <td className="py-4 font-black text-slate-900 dark:text-white">{formatCurrency(txn.amount)}</td>
                                            <td className="py-4 text-right">
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                                                    txn.status === 'reconciled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {carBankTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">No bank transactions recorded</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


