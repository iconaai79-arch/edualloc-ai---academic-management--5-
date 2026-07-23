import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, RetailSale, CafeMenuItem, RetailInventoryItem } from '../../types';
import { apiService } from '../../services/apiService';
import { HybridPOSView } from '../hybrid/HybridPOSView';
import { KitchenDisplaySystem } from '../hybrid/KitchenDisplaySystem';
import { CustomerStatusBoard } from '../hybrid/CustomerStatusBoard';
import { CafeMenuManager } from '../hybrid/CafeMenuManager';

interface RestaurantPOSManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    users?: User[];
    onDataChange?: () => void;
}

export const RestaurantPOSManager: React.FC<RestaurantPOSManagerProps> = ({
    currentUser,
    currentInstitution,
    users = [],
    onDataChange
}) => {
    const institutionId = currentInstitution.id;
    const [activeTab, setActiveTab] = useState<'pos' | 'kds' | 'status_board' | 'menu' | 'sales' | 'settings'>('pos');
    
    // Data State
    const [retailSales, setRetailSales] = useState<RetailSale[]>([]);
    const [cafeItems, setCafeItems] = useState<CafeMenuItem[]>([]);
    const [retailInventory, setRetailInventory] = useState<RetailInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [salesRes, cafeRes, invRes] = await Promise.all([
                apiService.fetchModuleRecords('retail_sales', institutionId),
                apiService.fetchModuleRecords('cafe_menu_items', institutionId),
                apiService.fetchModuleRecords('retail_inventory', institutionId)
            ]);
            setRetailSales(salesRes || []);
            setCafeItems(cafeRes || []);
            setRetailInventory(invRes || []);
        } catch (e) {
            console.error("Failed to load restaurant POS data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [institutionId]);

    const handleLogAction = async (action: string) => {
        console.log(`[Restaurant POS Action]: ${action}`);
    };

    const handleDataChange = async () => {
        await loadData();
        if (onDataChange) onDataChange();
    };

    // Calculate metrics
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = useMemo(() => {
        return retailSales.filter(s => (s.createdAt || '').startsWith(todayStr));
    }, [retailSales, todayStr]);

    const totalTodayRevenue = useMemo(() => {
        return todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    }, [todaySales]);

    const pendingKitchenCount = useMemo(() => {
        let count = 0;
        retailSales.forEach(s => {
            (s.items || []).forEach((item: any) => {
                if (item.kitchenStatus === 'pending' || item.kitchenStatus === 'preparing') {
                    count++;
                }
            });
        });
        return count;
    }, [retailSales]);

    const handleUpdateKitchenItemStatus = async (orderId: string, itemId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'delivered') => {
        try {
            const targetSale = retailSales.find(s => s.id === orderId);
            if (!targetSale) return;
            const updatedItems = (targetSale.items || []).map((item: any) => {
                if (item.id === itemId || item.productId === itemId) {
                    return { ...item, kitchenStatus: newStatus };
                }
                return item;
            });
            await apiService.saveModuleRecord('retail_sales', { ...targetSale, items: updatedItems });
            await loadData();
        } catch (err) {
            console.error("Failed to update kitchen item status:", err);
        }
    };

    const waitersList = useMemo(() => {
        return users.filter(u => u.role === 'waiter' || u.role === 'carwash_waiter' || u.role === 'staff' || u.role === 'restaurant_admin');
    }, [users]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300 min-h-screen pb-12">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl text-2xl">🍽️</span>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{currentInstitution.name} POS</h1>
                                <p className="text-amber-100 text-xs font-semibold">Restaurant & Cafe Touch Ordering, Kitchen Display (KDS) & Digital Menu</p>
                            </div>
                        </div>
                    </div>

                    {/* KPI Quick Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                        <div className="bg-white/15 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl">
                            <p className="text-[9px] font-black text-amber-200 uppercase tracking-widest">Today's Sales</p>
                            <p className="text-lg font-black mt-0.5">{todaySales.length} Orders</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl">
                            <p className="text-[9px] font-black text-amber-200 uppercase tracking-widest">Today's Revenue</p>
                            <p className="text-lg font-black mt-0.5">KSh {totalTodayRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                            <p className="text-[9px] font-black text-amber-200 uppercase tracking-widest">Kitchen Orders</p>
                            <p className="text-lg font-black mt-0.5 flex items-center gap-1">
                                <span className={`w-2.5 h-2.5 rounded-full ${pendingKitchenCount > 0 ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />
                                {pendingKitchenCount} Active
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sub-Tab Navigation Bar */}
                <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/20 overflow-x-auto scrollbar-none">
                    {[
                        { id: 'pos', label: '🛒 Touch POS', desc: 'Point of Sale' },
                        { id: 'kds', label: '👨‍🍳 Kitchen KDS', desc: 'Display Screen' },
                        { id: 'status_board', label: '📺 Customer Board', desc: 'Order Tracker' },
                        { id: 'menu', label: '🍽️ Menu & Recipes', desc: 'Food & Drinks' },
                        { id: 'sales', label: '📊 Sales History', desc: 'Transaction Log' },
                        { id: 'settings', label: '⚙️ Settings', desc: 'Restaurant Config' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? 'bg-white text-slate-900 shadow-lg scale-105'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENT */}

            {/* 1. Touch POS */}
            {activeTab === 'pos' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                    <HybridPOSView
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        carWashJobs={[]}
                        retailInventory={retailInventory}
                        cafeInventory={cafeItems}
                        retailSales={retailSales}
                        waiters={waitersList}
                        onLogAction={handleLogAction}
                        onDataChange={handleDataChange}
                    />
                </div>
            )}

            {/* 2. Kitchen Display System (KDS) */}
            {activeTab === 'kds' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                👨‍🍳 Kitchen Display System (KDS)
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Real-time order tickets for kitchen staff and baristas</p>
                        </div>
                    </div>
                    <KitchenDisplaySystem
                        retailSales={retailSales}
                        onUpdateItemStatus={handleUpdateKitchenItemStatus}
                    />
                </div>
            )}

            {/* 3. Customer Order Status Board */}
            {activeTab === 'status_board' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                📺 Customer Order Display Board
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Public TV monitor view showing orders in preparation vs. ready for collection</p>
                        </div>
                    </div>
                    <CustomerStatusBoard
                        carWashJobs={[]}
                        retailSales={retailSales}
                    />
                </div>
            )}

            {/* 4. Menu & Recipe Management */}
            {activeTab === 'menu' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6">
                    <CafeMenuManager
                        institutionId={institutionId}
                        onDataChange={handleDataChange}
                    />
                </div>
            )}

            {/* 5. Sales & Transaction Log */}
            {activeTab === 'sales' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Restaurant Sales Log</h3>
                            <p className="text-xs text-slate-400 font-medium">{retailSales.length} total orders recorded</p>
                        </div>
                        <button
                            type="button"
                            onClick={loadData}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            🔄 Refresh Sales
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                                    <th className="py-3 px-4">Receipt #</th>
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Items Count</th>
                                    <th className="py-3 px-4">Total Amount</th>
                                    <th className="py-3 px-4">Payment Method</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-medium">
                                {retailSales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{(sale as any).receiptNumber || sale.id.slice(-8)}</td>
                                        <td className="py-3 px-4 text-slate-500">{new Date(sale.createdAt || '').toLocaleString('en-KE')}</td>
                                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{sale.customerName || 'Walk-in Customer'}</td>
                                        <td className="py-3 px-4 text-slate-600">{sale.items?.length || 0} items</td>
                                        <td className="py-3 px-4 font-black text-emerald-600">KSh {(sale.totalAmount || 0).toLocaleString()}</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                {sale.paymentMethod || 'Cash'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {retailSales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No sales recorded yet. Place orders via Touch POS tab!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 6. Settings */}
            {activeTab === 'settings' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm p-6 space-y-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-100 dark:border-slate-800 pb-4">
                        ⚙️ Restaurant Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Institution Name</label>
                            <input type="text" value={currentInstitution.name} disabled className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Currency Code</label>
                            <input type="text" value="KSh (Kenyan Shilling)" disabled className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
