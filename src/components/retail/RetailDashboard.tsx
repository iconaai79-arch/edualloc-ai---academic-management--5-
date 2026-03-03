import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RetailStore, RetailInventoryItem, RetailStoreStock, RetailSerializedItem, RetailStockTransfer, RetailWishlist, RetailCommissionLedger } from '../../types';
import { Package, Store, MapPin, Truck, Smartphone, History, DollarSign, Target, Plus, AlertCircle, RefreshCw, HandCoins, Users } from 'lucide-react';

interface RetailDashboardProps {
    institutionId: string;
    onNavigate: (view: 'stores' | 'inventory' | 'transfers' | 'wishlist' | 'commissions' | 'pos') => void;
}

export function RetailDashboard({ institutionId, onNavigate }: RetailDashboardProps) {
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

    // MOCK DATA FOR DEMO PURPOSES
    useEffect(() => {
        // In a real scenario, this would fetch from Supabase joining the Retail* tables
        setTimeout(() => {
            setStats({
                totalStores: 3,                 // Main Store, Downtown Branch, Westside Branch
                totalVanStock: 8,               // 8 active field agents with inventory
                totalInventoryValue: 125400,    // Total absolute cost price of all items
                pendingTransfers: 5,            // Stock transfers waiting for approval
                activeWishlistLeads: 12,        // Walk-in customers waiting for items to drop
                commissionsThisMonth: 4250,     // Total dynamic commission earned by agents
            });

            setSalesData([
                { storeName: 'Main Warehouse', amount: 45000, color: 'bg-indigo-500' },
                { storeName: 'Downtown Branch', amount: 32000, color: 'bg-emerald-500' },
                { storeName: 'Westside Branch', amount: 28000, color: 'bg-blue-500' },
                { storeName: 'Eastside Agent', amount: 12000, color: 'bg-amber-500' },
                { storeName: 'North Road Agent', amount: 8400, color: 'bg-rose-500' },
            ]);

            setPerformanceTrend([
                { label: 'Mon', value: 65 },
                { label: 'Tue', value: 45 },
                { label: 'Wed', value: 85 },
                { label: 'Thu', value: 30 },
                { label: 'Fri', value: 95 },
                { label: 'Sat', value: 80 },
                { label: 'Sun', value: 40 },
            ]);

            setIsLoading(false);
        }, 600);
    }, [institutionId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Retail & Agency Overview</h2>
                    <p className="text-slate-500 text-sm mt-1">Multi-store inventory, field agents, and lead management.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => onNavigate('pos')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm font-medium"
                    >
                        <Smartphone className="w-4 h-4" />
                        Open Dual-Mode POS
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Stores & Agents Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('stores')}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Active Locations</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-3xl font-bold text-slate-800">{stats.totalStores}</h3>
                                <span className="text-sm text-slate-500 mb-1">Physical</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-sm text-indigo-600 font-medium">
                                <Truck className="w-4 h-4" />
                                <span>+ {stats.totalVanStock} Field Agents (Van Stock)</span>
                            </div>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                            <Store className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Inventory Value Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('inventory')}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Total Inventory Value</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                ${stats.totalInventoryValue.toLocaleString()}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">Across all stores and agents</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
                            <Package className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Commissions Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('commissions')}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Agent Commissions (Mtd)</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                ${stats.commissionsThisMonth.toLocaleString()}
                            </h3>
                            <p className="text-xs text-slate-400 mt-2">Dynamic pricing margin splits</p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
                            <HandCoins className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Action Center */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                            Action Center
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        <div className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => onNavigate('transfers')}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                    <ArrowRightLeft className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-800">Stock Transfers</h4>
                                    <p className="text-sm text-slate-500">Agents requesting van stock checkout ({stats.pendingTransfers} pending)</p>
                                </div>
                            </div>
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 transition-colors">
                                ›
                            </span>
                        </div>

                        <div className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => onNavigate('wishlist')}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-800">Hot Leads (Wishlist)</h4>
                                    <p className="text-sm text-slate-500">{stats.activeWishlistLeads} customers waiting on specific stock</p>
                                </div>
                            </div>
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 transition-colors">
                                ›
                            </span>
                        </div>

                        <div className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-800">Marketplace Integration</h4>
                                    <p className="text-sm text-slate-500">Manage online store sync and buffer stock</p>
                                </div>
                            </div>
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-800 transition-colors">
                                ›
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Sales Performance Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Most Selling Stores - Bar Chart */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Most Selling Locations</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Revenue distribution by store/agent</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="space-y-5">
                        {salesData.map((data, idx) => {
                            const maxAmount = Math.max(...salesData.map(d => d.amount));
                            const percentage = (data.amount / maxAmount) * 100;

                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-600">{data.storeName}</span>
                                        <span className="text-xs font-black text-slate-900">KES {data.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${data.color}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Non-Performing / Trend Analysis - Area/Line Style Chart */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Performance Velocity</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Daily engagement & sales impact</p>
                        </div>
                        <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                            <History className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="relative h-48 flex items-end justify-between gap-2 px-2 border-b border-dashed border-slate-100">
                        {performanceTrend.map((stat, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                {/* Bar representing the value */}
                                <div
                                    className={`w-full max-w-[12px] rounded-t-lg transition-all duration-700 hover:brightness-110 ${stat.value < 40 ? 'bg-rose-400 opacity-60' : 'bg-indigo-500'}`}
                                    style={{ height: `${stat.value}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black px-2 py-1.5 rounded-lg z-10 whitespace-nowrap shadow-xl">
                                        {stat.value}% Performance
                                    </div>
                                </div>
                                <span className="absolute -bottom-6 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors">
                                    {stat.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-5 bg-slate-50 rounded-3xl border border-white flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-500">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Optimization Insight</p>
                            <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                                <span className="text-rose-600">North Road Agent</span> is currently performing 42% below target. Review stock mix.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Temporary declarations to avoid creating new icon imports, these are usually imported from lucide-react above
const ArrowRightLeft = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></svg>;
const Globe = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;
