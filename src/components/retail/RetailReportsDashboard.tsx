import React, { useState, useEffect } from 'react';
import { RetailInventoryItem, RetailSale, RetailCommissionLedger, User } from '../../types';
import { apiService } from '../../services/apiService';
import {
    LayoutDashboard,
    TrendingUp,
    PackageSearch,
    Users,
    DollarSign,
    ShoppingCart,
    AlertTriangle,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

interface RetailReportsDashboardProps {
    institutionId: string;
    users: User[];
}

export function RetailReportsDashboard({ institutionId, users }: RetailReportsDashboardProps) {
    const [activeTab, setActiveTab] = useState<'revenue' | 'inventory' | 'agents'>('revenue');
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [sales, setSales] = useState<RetailSale[]>([]);
    const [inventory, setInventory] = useState<RetailInventoryItem[]>([]);
    const [commissions, setCommissions] = useState<RetailCommissionLedger[]>([]);

    useEffect(() => {
        const fetchReportData = async () => {
            setIsLoading(true);
            try {
                const [salesData, invData, commData] = await Promise.all([
                    apiService.fetchModuleRecords<RetailSale>('retail_sales', institutionId),
                    apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId),
                    apiService.fetchModuleRecords<RetailCommissionLedger>('retail_commission_ledger', institutionId),
                ]);

                // Sort sales by newest first for better processing
                setSales(salesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                setInventory(invData);
                setCommissions(commData);
            } catch (error) {
                console.error("Failed to fetch retail reports data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReportData();
    }, [institutionId]);

    // --- REVENUE Calculations ---
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalSalesCount = sales.length;
    const averageOrderValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    // Top products
    const productSalesCount: Record<string, { name: string, qty: number, revenue: number }> = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSalesCount[item.id]) {
                productSalesCount[item.id] = { name: item.name, qty: 0, revenue: 0 };
            }
            productSalesCount[item.id].qty += item.quantity;
            productSalesCount[item.id].revenue += item.total;
        });
    });

    const topProducts = Object.values(productSalesCount)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // --- INVENTORY Calculations ---
    const totalInventoryItems = inventory.length;
    const totalInventoryUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate values (Cost VS SRP)
    const totalCostValue = inventory.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalRetailValue = inventory.reduce((sum, item) => sum + (item.srpPrice * item.quantity), 0);
    const projectedProfit = totalRetailValue - totalCostValue;

    const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);

    // --- AGENT Calculations ---
    const agentStats: Record<string, { name: string, salesCount: number, totalRevenue: number, totalCommission: number, pendingCommission: number }> = {};

    // Initialize agents
    users.filter(u => u.role === 'teacher' || u.role === 'lecturer').forEach(agent => {
        agentStats[agent.id] = {
            name: agent.name,
            salesCount: 0,
            totalRevenue: 0,
            totalCommission: 0,
            pendingCommission: 0
        };
    });

    // Add sales data
    sales.forEach(sale => {
        if (agentStats[sale.recordedById]) {
            agentStats[sale.recordedById].salesCount += 1;
            agentStats[sale.recordedById].totalRevenue += sale.totalAmount;
        }
    });

    // Add commission data
    commissions.forEach(comm => {
        if (agentStats[comm.agentId]) {
            agentStats[comm.agentId].totalCommission += comm.commissionAmount;
            if (comm.status === 'awaiting_payout') {
                agentStats[comm.agentId].pendingCommission += comm.commissionAmount;
            }
        }
    });

    const activeAgents = Object.values(agentStats)
        .filter(stat => stat.salesCount > 0 || stat.totalCommission > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-indigo-600" />
                    Business Analytics
                </h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Retail Insights</p>
            </div>

            {/* Navigation */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('revenue')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'revenue' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <TrendingUp className="w-4 h-4" /> Revenue & Sales
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <PackageSearch className="w-4 h-4" /> Inventory Health
                </button>
                <button
                    onClick={() => setActiveTab('agents')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'agents' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Users className="w-4 h-4" /> Agent Performance
                </button>
            </div>

            {/* Content Area */}
            <div className="animate-fade-in-up">

                {/* ----------------- REVENUE TAB ----------------- */}
                {activeTab === 'revenue' && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Gross Revenue</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">${totalRevenue.toLocaleString()}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        <ArrowUpRight className="w-3 h-3" /> +12.5% this week
                                    </div>
                                </div>
                                <DollarSign className="w-32 h-32 absolute -right-6 -bottom-6 text-slate-50 opacity-50 group-hover:scale-110 transition-transform" />
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Orders</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalSalesCount}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        <ShoppingCart className="w-3 h-3" /> completed transactions
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Average Order Value (AOV)</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">${averageOrderValue.toFixed(2)}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        <ArrowDownRight className="w-3 h-3" /> -2.1% this week
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Top Performing Products</h3>

                            {topProducts.length === 0 ? (
                                <p className="text-sm font-bold text-slate-400 text-center py-10">No sales data available yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {topProducts.map((prod, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{prod.name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{prod.qty} units sold</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 dark:text-white">${prod.revenue.toLocaleString()}</p>
                                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Revenue</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ----------------- INVENTORY TAB ----------------- */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-6 rounded-3xl shadow-xl relative overflow-hidden group text-white">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Total Retail Value</p>
                                    <h3 className="text-3xl font-black">${totalRetailValue.toLocaleString()}</h3>
                                    <div className="mt-4 flex items-center gap-2 text-indigo-900 bg-white w-fit px-3 py-1 rounded-full text-[10px] font-bold">
                                        Projected Profit: ${projectedProfit.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Cost Basis</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">${totalCostValue.toLocaleString()}</h3>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Stock Holding</p>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalInventoryUnits}</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">across {totalInventoryItems} distinct items</p>
                            </div>
                        </div>

                        {/* Low Stock Alerts */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-rose-100 shadow-sm p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Requires Immediate Reorder</h3>
                            </div>

                            {lowStockItems.length === 0 ? (
                                <p className="text-sm font-bold text-emerald-600 bg-emerald-50 p-4 rounded-xl text-center">All inventory stock levels are healthy.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Product SKU</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Qty</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Reorder Threshold</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {lowStockItems.map(item => (
                                            <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4">
                                                    <p className="font-bold text-slate-900">{item.name}</p>
                                                    <p className="text-xs font-mono text-slate-500">{item.sku}</p>
                                                </td>
                                                <td className="py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                                                        {item.quantity} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="py-4 font-medium text-slate-500">
                                                    {item.reorderLevel} {item.unit}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ----------------- AGENT PERFORMANCE TAB ----------------- */}
                {activeTab === 'agents' && (
                    <div className="space-y-6">

                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8 overflow-hidden">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Agent Sales Leaderboard</h3>

                            {activeAgents.length === 0 ? (
                                <p className="text-sm font-bold text-slate-400 text-center py-10">No agent sales activity found.</p>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Name</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Closed</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Attributed Revenue</th>
                                            <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Commissions Unpaid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {activeAgents.map((agent, idx) => (
                                            <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4 flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-900">{agent.name}</span>
                                                </td>
                                                <td className="py-4 font-medium text-slate-600">
                                                    {agent.salesCount} Deals
                                                </td>
                                                <td className="py-4 font-black text-teal-600 text-right">
                                                    ${agent.totalRevenue.toLocaleString()}
                                                </td>
                                                <td className="py-4 text-right">
                                                    {agent.pendingCommission > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-600">
                                                            ${agent.pendingCommission.toLocaleString()} Pend.
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm font-medium">$0.00</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
