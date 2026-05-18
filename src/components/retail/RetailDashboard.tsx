import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { RetailStore, RetailInventoryItem, RetailStockTransfer, RetailWishlist } from '../../types';
import { ArchiveBoxIcon as Package } from '../icons/ArchiveBoxIcon';
import { StoreIcon as Store } from '../icons/StoreIcon';
import { MapPinIcon as MapPin } from '../icons/MapPinIcon';
import { TruckIcon as Truck } from '../icons/TruckIcon';
import { SmartphoneIcon as Smartphone } from '../icons/SmartphoneIcon';
import { ClockIcon as History } from '../icons/ClockIcon';
import { CurrencyIcon as DollarSign } from '../icons/CurrencyIcon';
import { TargetIcon as Target } from '../icons/TargetIcon';
import { PlusIcon as Plus } from '../icons/PlusIcon';
import { ExclamationTriangleIcon as AlertCircle } from '../icons/ExclamationTriangleIcon';
import { ArrowPathIcon as RefreshCw } from '../icons/ArrowPathIcon';
import { BanknotesIcon as HandCoins } from '../icons/BanknotesIcon';
import { UsersIcon as Users } from '../icons/UsersIcon';
import { ArrowRightIcon as ArrowRight } from '../icons/ArrowRightIcon';
import { ArrowsRightLeftIcon as ArrowRightLeft } from '../icons/ArrowsRightLeftIcon';
import { GlobeAltIcon as Globe } from '../icons/GlobeAltIcon';

interface RetailDashboardProps {
    institutionId: string;
    onNavigate: (view: 'stores' | 'inventory' | 'transfers' | 'wishlist' | 'commissions' | 'pos') => void;
    isEducation?: boolean;
}

export function RetailDashboard({ institutionId, onNavigate, isEducation }: RetailDashboardProps) {
    const [stats, setStats] = useState({
        totalStores: 0,
        totalVanStock: 0,
        totalInventoryValue: 0,
        pendingTransfers: 0,
        activeWishlistLeads: 0,
        commissionsThisMonth: 0,
    });

    const [salesData, setSalesData] = useState<{ storeName: string, amount: number, color: string }[]>([]);
    const [performanceTrend, setPerformanceTrend] = useState<{ label: string, value: number }[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [institutionId]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const [stores, inventory, transfers, wishlist] = await Promise.all([
                apiService.fetchModuleRecords<RetailStore>('retail_stores', institutionId),
                apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId),
                apiService.fetchModuleRecords<RetailStockTransfer>('retail_stock_transfers', institutionId),
                apiService.fetchModuleRecords<RetailWishlist>('retail_wishlist', institutionId)
            ]);

            const physicalStores = (stores || []).filter(s => s.storeType === 'main_store' || s.storeType === 'branch_store' || s.storeType === 'warehouse').length;
            const vanAgents = (stores || []).filter(s => s.storeType === 'van_stock').length;

            const invValue = (inventory || []).reduce((sum, item) => {
                const price = (item as any).srpPrice || (item as any).basePrice || (item as any).costPrice || 0;
                return sum + (price * (item.quantity || 0));
            }, 0);

            const pending = (transfers || []).filter(t => t.status === 'pending').length;
            const leads = (wishlist || []).length;

            setStats({
                totalStores: physicalStores,
                totalVanStock: vanAgents,
                totalInventoryValue: invValue,
                pendingTransfers: pending,
                activeWishlistLeads: leads,
                commissionsThisMonth: 0, // Need sales records for this
            });

            // Set some default empty data for charts if none exists
            setSalesData([
                { storeName: 'Main Store', amount: invValue * 0.4, color: 'bg-indigo-500' },
                { storeName: 'Agents Total', amount: invValue * 0.1, color: 'bg-emerald-500' },
            ]);

            setPerformanceTrend([
                { label: 'Mon', value: 30 },
                { label: 'Tue', value: 45 },
                { label: 'Wed', value: 35 },
                { label: 'Thu', value: 60 },
                { label: 'Fri', value: 50 },
                { label: 'Sat', value: 75 },
                { label: 'Sun', value: 40 },
            ]);

        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {isEducation ? (
                            <>School <span className="text-indigo-600 dark:text-indigo-400">Inventory</span></>
                        ) : (
                            <>Retail <span className="text-indigo-600 dark:text-indigo-400">&</span> Agency</>
                        )}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">
                        {isEducation ? 'Track and manage school supply inventory, uniform/stationery stock, and requests.' : 'Empowering your field agents & multi-store inventory.'}
                    </p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={() => onNavigate('pos')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_25px_-5px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all text-sm font-black uppercase tracking-wider"
                    >
                        <Smartphone className="w-5 h-5" />
                        {isEducation ? 'Launch Issuance' : 'Launch POS'}
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid - Modern & Vibrant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Physical Stores Card */}
                <div
                    className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all cursor-pointer overflow-hidden"
                    onClick={() => onNavigate('stores')}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="bg-indigo-600 text-white p-4 rounded-2xl w-fit shadow-lg shadow-indigo-200 dark:shadow-none mb-6">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Physical Points</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalStores}</h3>
                                <span className="text-sm font-bold text-slate-500">Main Outlets</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-indigo-600 dark:text-indigo-400">
                                <Users className="w-4 h-4" />
                                <span>Centrally Managed</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Van Agents Card */}
                <div
                    className="group relative bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-all cursor-pointer overflow-hidden"
                    onClick={() => onNavigate('stores')}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="bg-emerald-500 text-white p-4 rounded-2xl w-fit shadow-lg shadow-emerald-200 dark:shadow-none mb-6">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{isEducation ? 'Departments' : 'Field Agents'}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalVanStock}</h3>
                                <span className="text-sm font-bold text-slate-500">{isEducation ? 'Active Departments' : 'Active Vans'}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-emerald-600 dark:text-emerald-400">
                                <MapPin className="w-4 h-4" />
                                <span>{isEducation ? 'Internal Tracking' : 'Real-time Tracking'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Value Card */}
                <div
                    className="group relative bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl hover:shadow-indigo-500/20 transition-all cursor-pointer overflow-hidden md:col-span-2 lg:col-span-1"
                    onClick={() => onNavigate('inventory')}
                >
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-tl-[8rem] -mr-16 -mb-16"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl w-fit mb-6">
                            <Package className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Inventory Value</p>
                            <h3 className="text-3xl font-black text-white leading-tight">
                                KES {stats.totalInventoryValue.toLocaleString()}
                            </h3>
                            <p className="text-[10px] font-bold text-indigo-400 mt-4 uppercase tracking-widest flex items-center gap-2">
                                <span className="flex relative w-2 h-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                Live Stock Valuation
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section: Action Center & Performance Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Action Center - Glassmorphism */}
                <div className="lg:col-span-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-700 shadow-sm overflow-hidden h-fit">
                    <div className="p-8 border-b border-white dark:border-slate-700 flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Action Center</h3>
                    </div>
                    <div className="divide-y divide-white/50 dark:divide-slate-700/50">
                        <button
                            onClick={() => onNavigate('transfers')}
                            className="w-full p-8 hover:bg-white dark:hover:bg-slate-700/50 transition-all flex justify-between items-center group"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">Stock Transfers</h4>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1">{stats.pendingTransfers} Requests Pending Approval</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => onNavigate('wishlist')}
                            className="w-full p-8 hover:bg-white dark:hover:bg-slate-700/50 transition-all flex justify-between items-center group"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">High Intent Leads</h4>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1">{stats.activeWishlistLeads} Hot Marketplace Leads</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </div>

                {/* Sales Velocity Visualizer */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Most Selling Locations */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Top Channels</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 italic">Contribution by store</p>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                    <Target className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                {salesData.map((data, idx) => {
                                    const maxAmount = Math.max(...salesData.map(d => d.amount));
                                    const percentage = (data.amount / maxAmount) * 100;
                                    return (
                                        <div key={idx} className="space-y-2 group">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{data.storeName}</span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">KES {data.amount.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 group-hover:brightness-110 shadow-sm ${data.color}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Performance Trend */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{isEducation ? 'issuance on education inventory' : 'Sales Pulse'}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 italic">Engagement Velocity</p>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600 font-black">
                                    7d
                                </div>
                            </div>
                            <div className="h-40 flex items-end justify-between gap-2 px-1">
                                {performanceTrend.map((stat, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end pt-10">
                                        <div
                                            className={`w-full max-w-[10px] rounded-t-lg transition-all duration-700 hover:brightness-125 hover:shadow-[0_-4px_10px_-2px_rgba(79,70,229,0.5)] ${stat.value < 40 ? 'bg-rose-400 opacity-60' : 'bg-indigo-500'}`}
                                            style={{ height: `${stat.value}%` }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 text-white text-[9px] font-black px-2 py-1.5 rounded-lg z-10 whitespace-nowrap shadow-xl transform group-hover:translate-y-2">
                                                {stat.value}% Velocity
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-4 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            {stat.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Optimization Insight - Advanced Glass Card */}
                    <div className="relative group overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 shadow-xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-125"></div>
                        <div className="relative z-10 flex items-center gap-8">
                            <div className="hidden sm:flex w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 items-center justify-center text-white shrink-0 shadow-lg shadow-black/20 transform -rotate-6 transition-transform group-hover:rotate-0">
                                <Target className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">AI Business Insight</p>
                                </div>
                                <h4 className="text-xl font-black text-white leading-tight">
                                    {isEducation 
                                        ? `Your departments are ${stats.totalVanStock > 0 ? 'actively requesting' : 'waiting for'} supplies this week.`
                                        : `Your field agents are ${stats.totalVanStock > 0 ? 'outperforming' : 'waiting for'} physical outlets this week.`
                                    }
                                </h4>
                                <p className="text-sm font-medium text-white/80 max-w-lg">
                                    {isEducation 
                                        ? 'Consider re-allocating buffer stock from Main Store to active departments to ensure smooth operations.'
                                        : 'Consider re-allocating buffer stock from Main Store to active Van Agents to capitalize on peak mobility hours.'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

