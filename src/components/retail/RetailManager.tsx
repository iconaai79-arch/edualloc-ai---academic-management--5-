import React, { useState } from 'react';
import { RetailDashboard } from './RetailDashboard';
import { RetailStoresManager } from './RetailStoresManager';
import { DualModePOS } from './DualModePOS';
import { WishlistManager } from './WishlistManager';
import { RetailExpenses } from './RetailExpenses';
import { RetailRequisitions } from './RetailRequisitions';
import { RetailInventoryManager } from './RetailInventoryManager';
import { RetailInventoryItem, RetailStore, User, RetailExpense, Requisition } from '../../types';
import { LayoutDashboard, Store, Smartphone, Target, ArrowRightLeft, HandCoins, Receipt, FileText, Package } from 'lucide-react';

interface RetailManagerProps {
    institutionId: string;
    currentUser: User;
    retailStores?: RetailStore[];
    inventory?: RetailInventoryItem[];
    retailExpenses?: RetailExpense[];
    onAddRetailExpense?: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
    requisitions?: Requisition[];
    onAddRequisition?: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
}

export function RetailManager(props: RetailManagerProps) {
    const { institutionId, currentUser, retailStores = [], inventory = [], retailExpenses = [], onAddRetailExpense, requisitions = [], onAddRequisition } = props;
    const [activeView, setActiveView] = useState<'dashboard' | 'stores' | 'inventory' | 'transfers' | 'wishlist' | 'commissions' | 'pos' | 'expenses' | 'requisitions'>('dashboard');

    return (
        <div className="space-y-6">
            {/* Sub-Navigation */}
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveView('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <LayoutDashboard className="w-3.5 h-3.5" /> Overview
                </button>
                <button
                    onClick={() => setActiveView('inventory')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Package className="w-3.5 h-3.5" /> Product Catalog
                </button>
                <button
                    onClick={() => setActiveView('pos')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'pos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Smartphone className="w-3.5 h-3.5" /> Point of Sale
                </button>
                <button
                    onClick={() => setActiveView('stores')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'stores' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Store className="w-3.5 h-3.5" /> Locations & Agents
                </button>
                <button
                    onClick={() => setActiveView('wishlist')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'wishlist' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Target className="w-3.5 h-3.5" /> Lead Manager
                </button>
                <button
                    onClick={() => setActiveView('expenses')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'expenses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Receipt className="w-3.5 h-3.5" /> Expenses
                </button>
                <button
                    onClick={() => setActiveView('requisitions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeView === 'requisitions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <FileText className="w-3.5 h-3.5" /> Requisitions
                </button>
            </div>

            <div className="animate-fade-in-up mt-4">
                {activeView === 'dashboard' && <RetailDashboard institutionId={institutionId} onNavigate={(v) => setActiveView(v as any)} />}
                {activeView === 'pos' && <DualModePOS institutionId={institutionId} currentUser={currentUser} />}
                {activeView === 'stores' && <RetailStoresManager institutionId={institutionId} />}
                {activeView === 'wishlist' && <WishlistManager institutionId={institutionId} />}

                {activeView === 'expenses' && (
                    <RetailExpenses
                        institutionId={institutionId}
                        currentUser={currentUser}
                        retailStores={retailStores}
                        retailExpenses={retailExpenses}
                        onAddRetailExpense={onAddRetailExpense!}
                    />
                )}

                {activeView === 'requisitions' && (
                    <RetailRequisitions
                        institutionId={institutionId}
                        currentUser={currentUser}
                        retailStores={retailStores}
                        requisitions={requisitions}
                        inventory={inventory}
                        onAddRequisition={onAddRequisition!}
                    />
                )}

                {/* Placeholders for upcoming modules */}
                {activeView === 'inventory' && <RetailInventoryManager institutionId={institutionId} />}
                {activeView === 'transfers' && (
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-500 font-medium">Stock Transfer Module Coming Soon</p>
                    </div>
                )}
                {activeView === 'commissions' && (
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-500 font-medium">Commissions Ledger Coming Soon</p>
                    </div>
                )}
            </div>
        </div>
    );
}
