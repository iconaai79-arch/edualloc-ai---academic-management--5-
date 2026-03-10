import React, { useState } from 'react';
import { RetailDashboard } from './RetailDashboard';
import { RetailStoresManager } from './RetailStoresManager';
import { DualModePOS } from './DualModePOS';
import { WishlistManager } from './WishlistManager';
import { RetailExpenses } from './RetailExpenses';
import { RetailRequisitions } from './RetailRequisitions';
import { RetailInventoryManager } from './RetailInventoryManager';
import { RetailStockTransfers } from './RetailStockTransfers';
import { RetailCommissionLedger } from './RetailCommissionLedger';
import { CafeMenuManager } from '../hybrid/CafeMenuManager';
import { RetailInventoryItem, RetailStore, User, RetailExpense, Requisition } from '../../types';
import { LayoutDashboard, Store, Smartphone, Target, ArrowRightLeft, HandCoins, Receipt, FileText, Package, Truck, Coffee } from 'lucide-react';

interface RetailManagerProps {
    institutionId: string;
    currentUser: User;
    retailStores?: RetailStore[];
    inventory?: RetailInventoryItem[];
    retailExpenses?: RetailExpense[];
    onAddRetailExpense?: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
    requisitions?: Requisition[];
    onAddRequisition?: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    businessSubType?: string;
}

export function RetailManager(props: RetailManagerProps) {
    const { institutionId, businessSubType, currentUser, retailStores = [], inventory = [], retailExpenses = [], onAddRetailExpense, requisitions = [], onAddRequisition } = props;
    const [activeView, setActiveView] = useState<'dashboard' | 'stores' | 'inventory' | 'transfers' | 'wishlist' | 'commissions' | 'pos' | 'expenses' | 'requisitions' | 'cafe_menu'>('dashboard');

    const isHospitality = businessSubType?.toLowerCase().includes('cafe') ||
        businessSubType?.toLowerCase().includes('restaurant') ||
        businessSubType?.toLowerCase().includes('eatery');

    const navItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Catalog', icon: Package },
        { id: 'pos', label: 'POS', icon: Smartphone },
        { id: 'stores', label: 'Agents', icon: Store },
        { id: 'wishlist', label: 'Leads', icon: Target },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
        { id: 'requisitions', label: 'Reqs', icon: FileText },
        { id: 'transfers', label: 'Transfers', icon: Truck },
        { id: 'commissions', label: 'Comms', icon: HandCoins },
        ...(isHospitality ? [{ id: 'cafe_menu', label: 'Cafe', icon: Coffee }] : [])
    ];

    return (
        <div className="min-h-screen pb-24 md:pb-6 space-y-6">
            {/* Desktop Navigation - Glassy & Premium */}
            <div className="hidden md:flex sticky top-0 z-30 py-4 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-b border-white/20 dark:border-slate-800/50 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all">
                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar shadow-inner backdrop-blur-md">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap group ${activeView === item.id
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105 active:scale-95'
                                : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <item.icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${activeView === item.id ? 'animate-pulse' : ''}`} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Bottom Navigation - Floating & Blurry */}
            <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-2 flex justify-around items-center">
                    {navItems.slice(0, 5).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as any)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative ${activeView === item.id
                                ? 'text-indigo-600 dark:text-indigo-400 scale-110'
                                : 'text-slate-400 hover:text-indigo-500'}`}
                        >
                            <item.icon className={`w-5 h-5 ${activeView === item.id ? 'fill-indigo-600/10' : ''}`} />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
                            {activeView === item.id && (
                                <span className="absolute -bottom-1 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce"></span>
                            )}
                        </button>
                    ))}
                    {/* Menu Trigger for overflow items */}
                    <button
                        onClick={() => setActiveView('expenses')} // Simple fallback or could open a modal
                        className="flex flex-col items-center gap-1 p-2 text-slate-400"
                    >
                        <div className="w-5 h-5 flex flex-wrap gap-0.5 justify-center items-center">
                            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">More</span>
                    </button>
                </div>
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
                {activeView === 'transfers' && <RetailStockTransfers institutionId={institutionId} currentUser={currentUser} />}
                {activeView === 'commissions' && <RetailCommissionLedger institutionId={institutionId} currentUser={currentUser} />}
                {activeView === 'cafe_menu' && <CafeMenuManager institutionId={institutionId} />}
            </div>
        </div>
    );
}
