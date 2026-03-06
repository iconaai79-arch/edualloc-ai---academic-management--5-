import React, { useState, useMemo } from 'react';
import type { User, Institution, CarWashJob, RetailSale, RetailSaleItem, RetailInventoryItem, CafeMenuItem } from '../../types';
import { apiService } from '../../services/apiService';
import {
    ClockIcon, PlusIcon, ShoppingCartIcon, CheckCircleIcon,
    CurrencyIcon, ArchiveBoxIcon, XIcon
} from '../icons';

interface HybridPOSViewProps {
    currentUser: User;
    currentInstitution: Institution;
    carWashJobs: CarWashJob[];
    retailInventory: RetailInventoryItem[];
    cafeInventory: CafeMenuItem[];
    retailSales: RetailSale[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => Promise<void>;
}

export const HybridPOSView: React.FC<HybridPOSViewProps> = ({
    currentUser, currentInstitution, carWashJobs, retailInventory, cafeInventory, retailSales, onLogAction, onDataChange
}) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [cart, setCart] = useState<(RetailSaleItem & { source: 'cafe' | 'retail' })[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Only active car wash jobs
    const activeJobs = useMemo(() => {
        return carWashJobs.filter(job => job.status === 'in_progress' || job.status === 'queued' || job.status === 'completed' || job.status === 'ready');
    }, [carWashJobs]);

    const activeJob = activeJobs.find(j => j.id === selectedJobId);

    const handleSaveOrder = async (orderType: 'tab' | 'kitchen') => {
        if (!selectedJobId || cart.length === 0) return;
        setIsSaving(true);
        try {
            const sale: RetailSale = {
                id: `rs_${Date.now()}`,
                institutionId: currentInstitution.id,
                storeId: 'hybrid_pos', // Virtual store for hybrid sales
                totalAmount: cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
                paymentMethod: 'tab', // Marked as tab to be paid later during car wash checkout
                items: cart.map(item => ({
                    itemId: item.itemId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    kitchenStatus: (item.source === 'cafe' && orderType === 'kitchen') ? 'pending' : undefined
                })),
                createdAt: new Date().toISOString(),
                unifiedTabId: selectedJobId
            };

            await apiService.saveModuleRecord('retail_sales', sale);
            await onLogAction(`Added ${cart.length} items to tab for vehicle ${activeJob?.vehiclePlate}`);
            setCart([]);
            onDataChange();
            alert(orderType === 'kitchen' ? 'Order sent to kitchen!' : 'Items added to tab!');
        } catch (e) {
            console.error(e);
            alert('Failed to save order');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Left Panel: Active Tabs / Jobs */}
            <div className="w-1/3 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <ClockIcon className="w-6 h-6 text-blue-500" />
                        Active Tabs
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Select a car wash job to attach food/drink orders.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeJobs.map(job => (
                        <div
                            key={job.id}
                            onClick={() => setSelectedJobId(job.id)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedJobId === job.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-transparent bg-slate-50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{job.vehiclePlate}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {job.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-slate-500">{job.packageName} - KES {job.amountCharged}</p>
                        </div>
                    ))}
                    {activeJobs.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <p className="text-slate-500 font-bold">No active wash jobs.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Restaurant/Cafe Menu & Cart */}
            <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
                {!selectedJobId ? (
                    <div className="flex-1 flex items-center justify-center flex-col">
                        <ArchiveBoxIcon className="w-20 h-20 text-slate-200 dark:text-slate-700 mb-4" />
                        <h3 className="text-xl font-black text-slate-400">Select an Active Tab</h3>
                        <p className="text-slate-500 font-medium">Choose a vehicle on the left to start adding items.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Menu Catalog */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Cafe Menu</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    ...cafeInventory.map(i => ({ ...i, source: 'cafe' as const })),
                                    ...retailInventory.map(i => ({ ...i, source: 'retail' as const, isAvailable: true }))
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            const existing = cart.find(c => c.itemId === item.id);
                                            if (existing) {
                                                setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
                                            } else {
                                                setCart([...cart, { itemId: item.id, name: item.name, quantity: 1, unitPrice: item.basePrice, source: item.source }]);
                                            }
                                        }}
                                        className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all text-left flex flex-col justify-between min-h-[120px]"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight">{item.name}</p>
                                                {item.source === 'cafe' && <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-1 rounded">Cafe</span>}
                                            </div>
                                            {!item.isAvailable && <p className="text-[10px] font-black text-rose-500 uppercase">Out of Stock</p>}
                                        </div>
                                        <p className="font-black text-blue-600 dark:text-blue-400 mt-2">KES {item.basePrice}</p>
                                    </button>
                                ))}
                                {cafeInventory.length === 0 && retailInventory.length === 0 && (
                                    <p className="col-span-full text-slate-500 font-medium text-center py-8">No menu items found.</p>
                                )}
                            </div>
                        </div>

                        {/* Order Summary (Cart) */}
                        <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="font-black uppercase tracking-widest text-slate-800 dark:text-white text-sm">Tab Summary</h3>
                                <p className="text-blue-600 font-bold text-xs mt-1">Vehicle: {activeJob?.vehiclePlate}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Car Wash</p>
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{activeJob?.packageName}</p>
                                        <p className="font-black text-slate-800 dark:text-white">KES {activeJob?.amountCharged}</p>
                                    </div>
                                </div>

                                {cart.length > 0 && <hr className="border-slate-100 dark:border-slate-700" />}

                                {cart.map(item => (
                                    <div key={item.itemId} className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{item.name}</p>
                                            <p className="text-xs font-bold text-slate-400">{item.quantity} x KES {item.unitPrice}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-black text-slate-800 dark:text-white">KES {item.quantity * item.unitPrice}</p>
                                            <button
                                                onClick={() => setCart(cart.filter(c => c.itemId !== item.itemId))}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="font-extrabold uppercase tracking-widest text-slate-500 text-sm">Grand Total</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        KES {(activeJob?.amountCharged || 0) + cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleSaveOrder('tab')}
                                    disabled={isSaving || cart.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    {isSaving ? 'Processing...' : 'Add to Tab'}
                                </button>
                                {/* Fire to kitchen button */}
                                {cart.some(i => i.source === 'cafe') && (
                                    <button
                                        onClick={() => handleSaveOrder('kitchen')}
                                        disabled={isSaving}
                                        className="w-full mt-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-black text-xs uppercase tracking-widest py-3 rounded-xl active:scale-95 transition-all"
                                    >
                                        🔥 Fire to Kitchen
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
