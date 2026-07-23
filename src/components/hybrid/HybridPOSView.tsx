import React, { useState, useMemo, useEffect } from 'react';
import type { User, Institution, CarWashJob, RetailSale, RetailSaleItem, RetailInventoryItem, CafeMenuItem, CafeOrder } from '../../types';
import { apiService } from '../../services/apiService';
import { ClockIcon } from '../icons/ClockIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { XIcon } from '../icons/XIcon';
import { LockClosedIcon } from '../icons/LockClosedIcon';
import { UserIcon } from '../icons/UserIcon';

interface HybridPOSViewProps {
    currentUser: User;
    currentInstitution: Institution;
    carWashJobs: CarWashJob[];
    retailInventory: RetailInventoryItem[];
    cafeInventory: CafeMenuItem[];
    retailSales: RetailSale[];
    waiters: User[];
    onLogAction: (action: string) => Promise<void>;
    onDataChange: () => Promise<void>;
}

// Sample futuristic dining table floor plan layout
interface RestaurantTable {
    id: string;
    label: string;
    section: 'Main Dining' | 'VIP Lounge' | 'Terrace Bar' | 'Drive-Thru';
    seats: number;
    status: 'available' | 'occupied' | 'billing' | 'reserved';
    currentTab?: string;
}

const DEFAULT_RESTAURANT_TABLES: RestaurantTable[] = [
    { id: 'tbl_1', label: 'Table T-01', section: 'Main Dining', seats: 4, status: 'occupied', currentTab: 'Tab #101' },
    { id: 'tbl_2', label: 'Table T-02', section: 'Main Dining', seats: 2, status: 'available' },
    { id: 'tbl_3', label: 'Table T-03', section: 'Main Dining', seats: 6, status: 'billing', currentTab: 'Tab #104' },
    { id: 'tbl_4', label: 'Table T-04', section: 'Main Dining', seats: 4, status: 'available' },
    { id: 'vip_1', label: 'VIP Pod A', section: 'VIP Lounge', seats: 8, status: 'reserved' },
    { id: 'vip_2', label: 'VIP Pod B', section: 'VIP Lounge', seats: 8, status: 'occupied', currentTab: 'VIP Tab' },
    { id: 'bar_1', label: 'Bar Stool 01', section: 'Terrace Bar', seats: 1, status: 'occupied', currentTab: 'Bar Counter' },
    { id: 'bar_2', label: 'Bar Stool 02', section: 'Terrace Bar', seats: 1, status: 'available' },
];

export const HybridPOSView: React.FC<HybridPOSViewProps> = ({
    currentUser, currentInstitution, carWashJobs, retailInventory, cafeInventory, retailSales, waiters, onLogAction, onDataChange
}) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>('tbl_1');
    const [viewMode, setViewMode] = useState<'floor_map' | 'tabs_list'>('floor_map');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    const [cart, setCart] = useState<(RetailSaleItem & { source: 'cafe' | 'retail' })[]>([]);
    const [selectedWaiterId, setSelectedWaiterId] = useState<string>(currentUser.role === 'carwash_waiter' ? currentUser.id : '');
    const [isSaving, setIsSaving] = useState(false);
    const [paymentMode, setPaymentMode] = useState<'tab' | 'mpesa' | 'card' | 'cash'>('tab');

    // Shared Screen PIN & Auto-Logout State
    const [showPinModal, setShowPinModal] = useState<boolean>(false);
    const [pinInput, setPinInput] = useState<string>('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [targetWaiterForPin, setTargetWaiterForPin] = useState<User | null>(null);
    const [autoLogoutSeconds, setAutoLogoutSeconds] = useState<number | null>(null);

    // Filter active car wash jobs or open tabs
    const activeJobs = useMemo(() => {
        return carWashJobs.filter(job => job.status === 'in_progress' || job.status === 'queued' || job.status === 'ready');
    }, [carWashJobs]);

    const activeJob = activeJobs.find(j => j.id === selectedJobId);
    const selectedTable = DEFAULT_RESTAURANT_TABLES.find(t => t.id === selectedTableId);
    const activeWaiter = waiters.find(w => w.id === selectedWaiterId) || (currentUser.id === selectedWaiterId ? currentUser : null);

    // 30-Second Auto-Logout Countdown Effect
    useEffect(() => {
        if (autoLogoutSeconds === null) return;
        if (autoLogoutSeconds <= 0) {
            // Lock terminal and logout active waiter
            setSelectedWaiterId('');
            setSelectedJobId(null);
            setCart([]);
            setShowPinModal(true);
            setAutoLogoutSeconds(null);
            return;
        }
        const timer = setInterval(() => {
            setAutoLogoutSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [autoLogoutSeconds]);

    // Handle 4-Digit PIN unlock logic
    const handleUnlockWithPin = (enteredPin: string, waiterId?: string) => {
        const candidateWaiters = waiterId ? waiters.filter(w => w.id === waiterId) : waiters;
        const matched = candidateWaiters.find(w => {
            const pin = w.pinCode || w.phoneNumber?.slice(-4) || w.staffId?.slice(-4) || '1234';
            return pin === enteredPin;
        });

        if (matched) {
            setSelectedWaiterId(matched.id);
            setShowPinModal(false);
            setPinInput('');
            setPinError(null);
            setAutoLogoutSeconds(null);
        } else {
            setPinError('Invalid 4-digit PIN code. Please try again.');
            setPinInput('');
        }
    };

    const handlePinKeyPress = (digit: string) => {
        if (pinInput.length < 4) {
            const nextPin = pinInput + digit;
            setPinInput(nextPin);
            setPinError(null);
            if (nextPin.length === 4) {
                handleUnlockWithPin(nextPin, targetWaiterForPin?.id);
            }
        }
    };

    const handleSaveOrder = async (orderType: 'tab' | 'kitchen') => {
        const targetIdentifier = selectedJobId || selectedTableId || 'walk_in';
        if (cart.length === 0) return;
        setIsSaving(true);
        try {
            const calculatedTotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            if (isNaN(calculatedTotal)) {
                throw new Error("Invalid total amount. Please check item prices.");
            }

            if (!selectedWaiterId) {
                alert("Please select or PIN-login a waiter before saving the order.");
                setIsSaving(false);
                setShowPinModal(true);
                return;
            }

            const waiter = waiters.find(w => w.id === selectedWaiterId) || currentUser;
            const orderId = `co_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
            const orderTargetName = selectedTable ? selectedTable.label : (activeJob ? `Plate: ${activeJob.vehiclePlate}` : 'Walk-in Guest');

            const order: CafeOrder = {
                id: orderId,
                institutionId: currentInstitution.id,
                jobId: targetIdentifier,
                items: cart.map(item => ({
                    itemId: item.itemId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    kitchenStatus: orderType === 'kitchen' ? 'pending' : undefined
                })),
                totalAmount: calculatedTotal,
                status: 'pending',
                paymentMethod: paymentMode,
                waiterId: selectedWaiterId,
                waiterName: waiter?.name,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('cafe_orders', order);

            const retailSaleRecord: RetailSale = {
                id: orderId,
                institutionId: currentInstitution.id,
                items: cart.map(item => ({
                    itemId: item.itemId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    kitchenStatus: orderType === 'kitchen' ? 'pending' : undefined
                })),
                totalAmount: calculatedTotal,
                paymentMethod: paymentMode,
                cashierId: selectedWaiterId,
                customerName: `Order: ${orderTargetName}`,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('retail_sales', retailSaleRecord).catch(() => null);

            await onLogAction(`Added ${cart.length} items to order for ${orderTargetName}`);
            setCart([]);
            onDataChange();

            // Trigger 30-second auto-logout timer for shared waiter terminals
            setAutoLogoutSeconds(30);

        } catch (e: any) {
            console.error("Save Order Error Details:", e);
            alert(`Failed to save order: ${e.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Filter menu items
    const allMenuItems = useMemo(() => {
        const combined = [
            ...cafeInventory.map(i => ({ ...i, source: 'cafe' as const })),
            ...retailInventory.map(i => ({ ...i, source: 'retail' as const, isAvailable: true }))
        ].filter(item => {
            const name = item.name.toLowerCase();
            return !name.includes('service package') && !name.includes('wash service');
        });

        return combined.filter(item => {
            const matchesQuery = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const itemCat = ('category' in item && item.category) ? item.category.toLowerCase() : 'other';
            const matchesCategory = selectedCategory === 'all' || itemCat.includes(selectedCategory);
            return matchesQuery && matchesCategory;
        });
    }, [cafeInventory, retailInventory, searchQuery, selectedCategory]);

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    return (
        <div className="flex flex-col h-[calc(100vh-9rem)] bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-cyan-500/30 relative font-sans">
            
            {/* Top Shared Waiter Terminal & HUD Status Bar */}
            <div className="bg-slate-900/90 backdrop-blur-xl border-b border-cyan-500/30 px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3.5">
                    <span className={`w-3 h-3 rounded-full ${isOffline ? 'bg-amber-400 animate-ping shadow-lg shadow-amber-500/50' : 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50'}`} />
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                        <UserIcon className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                            Active Operator: <span className="text-cyan-300 font-mono">{activeWaiter ? activeWaiter.name : 'Terminal Locked'}</span>
                        </span>
                    </div>
                    {selectedTable && (
                        <span className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl text-xs font-mono font-bold uppercase tracking-wider">
                            🪑 {selectedTable.label} ({selectedTable.section})
                        </span>
                    )}
                    {isOffline && (
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            📡 Local Cache Engine
                        </span>
                    )}
                </div>

                {/* 30s Countdown Banner & PIN Switch */}
                <div className="flex items-center gap-3">
                    {autoLogoutSeconds !== null && (
                        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3.5 py-1 rounded-xl text-xs font-bold animate-pulse">
                            <span>⏱️ Order Sent! Auto-locking in <strong className="text-white font-mono text-sm">{autoLogoutSeconds}s</strong></span>
                            <button
                                type="button"
                                onClick={() => setAutoLogoutSeconds(null)}
                                className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-wider hover:bg-amber-300 transition-all"
                            >
                                Extend
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setPinInput('');
                            setPinError(null);
                            setShowPinModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 border border-cyan-400/30"
                    >
                        <LockClosedIcon className="w-4 h-4" />
                        <span>{activeWaiter ? '🔑 Switch PIN Operator' : '🔑 Enter 4-Digit PIN'}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Table Floor Map / Active Tabs List */}
                <div className="w-80 lg:w-96 bg-slate-900/60 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col">
                    <div className="p-4 border-b border-slate-800 space-y-3">
                        <div className="flex justify-between items-center">
                            <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-wide flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-cyan-400" />
                                Dining Layout
                            </h2>
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('floor_map')}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'floor_map' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                                >
                                    🗺️ Map
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('tabs_list')}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'tabs_list' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                                >
                                    📋 Open Tabs ({activeJobs.length})
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {viewMode === 'floor_map' ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">
                                    <span>Interactive Tables Layout</span>
                                    <span className="text-cyan-400">8 Areas</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {DEFAULT_RESTAURANT_TABLES.map(table => {
                                        const isSelected = selectedTableId === table.id;
                                        const statusColors = {
                                            available: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                                            occupied: 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300',
                                            billing: 'border-amber-500/60 bg-amber-500/15 text-amber-300',
                                            reserved: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
                                        };

                                        return (
                                            <div
                                                key={table.id}
                                                onClick={() => {
                                                    setSelectedTableId(table.id);
                                                    setSelectedJobId(null);
                                                }}
                                                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                                                    isSelected
                                                        ? 'border-cyan-400 bg-gradient-to-br from-cyan-950/80 to-indigo-950/80 shadow-lg shadow-cyan-500/20 scale-105'
                                                        : statusColors[table.status] || 'border-slate-800 bg-slate-900/50'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 rounded-bl-lg shadow-glow" />
                                                )}
                                                <div>
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-black text-sm text-white uppercase font-mono">{table.label}</h4>
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-300 border border-slate-800">
                                                            👥 {table.seats}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium">{table.section}</p>
                                                </div>

                                                <div className="mt-2 flex justify-between items-center">
                                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                                        table.status === 'available' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' :
                                                        table.status === 'occupied' ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300' :
                                                        table.status === 'billing' ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' :
                                                        'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                                                    }`}>
                                                        {table.status}
                                                    </span>
                                                    {table.currentTab && (
                                                        <span className="text-[9px] font-mono text-cyan-300 font-bold">{table.currentTab}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeJobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => {
                                            setSelectedJobId(job.id);
                                            setSelectedTableId(null);
                                        }}
                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedJobId === job.id
                                            ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black text-white font-mono uppercase tracking-tight">{job.vehiclePlate}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                }`}>
                                                {job.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">{job.packageName} - KES {job.amountCharged}</p>
                                    </div>
                                ))}
                                {activeJobs.length === 0 && (
                                    <div className="text-center py-10 opacity-60">
                                        <p className="text-slate-400 font-bold text-xs">No active wash jobs or open tabs.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Restaurant/Cafe Menu Catalog & Cart */}
                <div className="flex-1 flex overflow-hidden bg-slate-950">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        
                        {/* Search & Category Filter Header Bar */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                                {/* Search Input */}
                                <div className="relative w-full sm:w-72">
                                    <input
                                        type="text"
                                        placeholder="🔍 Search food, drinks, coffee..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500 font-medium"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Category Quick Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                                    {[
                                        { id: 'all', label: '🍿 All' },
                                        { id: 'main', label: '🍔 Mains' },
                                        { id: 'drink', label: '☕ Drinks' },
                                        { id: 'dessert', label: '🍰 Desserts' },
                                        { id: 'snack', label: '🍟 Snacks' },
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                                selectedCategory === cat.id
                                                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Menu Items Grid */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {allMenuItems.map(item => {
                                    const isCafe = 'source' in item && item.source === 'cafe';
                                    const imageUrl = 'imageUrl' in item ? item.imageUrl : undefined;

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                const existing = cart.find(c => c.itemId === item.id);
                                                if (existing) {
                                                    setCart(cart.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
                                                } else {
                                                    setCart([...cart, { itemId: item.id, name: item.name, quantity: 1, unitPrice: item.basePrice, source: isCafe ? 'cafe' : 'retail' }]);
                                                }
                                            }}
                                            className={`group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10 transition-all text-left ${!item.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={!item.isAvailable}
                                        >
                                            {/* Image Container */}
                                            <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden">
                                                {imageUrl ? (
                                                    <img loading="lazy" src={imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                                                        <span className="text-4xl">{isCafe ? '🍔' : '📦'}</span>
                                                    </div>
                                                )}

                                                {/* Futuristic Price Tag */}
                                                <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/90 backdrop-blur-md shadow-md border border-cyan-500/30">
                                                    <p className="text-xs font-black text-cyan-300 font-mono">KES {item.basePrice}</p>
                                                </div>

                                                {/* Source Badge */}
                                                <div className="absolute top-2 left-2">
                                                    {isCafe ? (
                                                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">Cafe</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">Retail</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content Section */}
                                            <div className="p-3.5 flex flex-col flex-1">
                                                <h4 className="font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-cyan-300 transition-colors text-xs">
                                                    {item.name}
                                                </h4>
                                                {isCafe && (item as any).description && (
                                                    <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{(item as any).description}</p>
                                                )}
                                                {!item.isAvailable && (
                                                    <p className="mt-auto text-[10px] font-black text-rose-400 uppercase tracking-widest pt-2">Out of Stock</p>
                                                )}
                                            </div>

                                            {/* Hover Glow Highlight */}
                                            <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors pointer-events-none" />
                                        </button>
                                    );
                                })}
                                {allMenuItems.length === 0 && (
                                    <p className="col-span-full text-slate-500 font-medium text-center py-12 text-xs">No menu items match query.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary (Futuristic Cart Panel) */}
                    <div className="w-80 lg:w-96 bg-slate-900/90 border-l border-cyan-500/20 flex flex-col shadow-2xl backdrop-blur-2xl">
                        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-white text-xs flex items-center gap-2">
                                    <ShoppingCartIcon className="w-4 h-4 text-cyan-400" />
                                    Order HUD Cart
                                </h3>
                                <p className="text-cyan-400 font-mono font-bold text-xs mt-0.5">
                                    Target: {selectedTable ? selectedTable.label : (activeJob?.vehiclePlate || 'Walk-in Guest')}
                                </p>
                            </div>
                            <span className="px-2.5 py-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold rounded-lg">
                                {cart.length} items
                            </span>
                        </div>

                        {/* Active Waiter Indicator */}
                        <div className="px-4 py-3 border-b border-slate-800 bg-indigo-950/20 flex justify-between items-center">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Server Operator</label>
                                <p className="text-xs font-black text-cyan-300">{activeWaiter?.name || 'No Waiter Selected'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPinModal(true)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                            >
                                PIN Swap
                            </button>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="p-3 border-b border-slate-800 bg-slate-950/40">
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Payment Method</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { id: 'tab', label: '📑 Tab' },
                                    { id: 'mpesa', label: '📱 M-Pesa' },
                                    { id: 'card', label: '💳 Card' },
                                    { id: 'cash', label: '💵 Cash' },
                                ].map(pm => (
                                    <button
                                        key={pm.id}
                                        type="button"
                                        onClick={() => setPaymentMode(pm.id as any)}
                                        className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                            paymentMode === pm.id
                                                ? 'bg-cyan-500 text-slate-950 shadow-md font-mono'
                                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                                        }`}
                                    >
                                        {pm.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.map(item => (
                                <div key={item.itemId} className="flex justify-between items-center p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                    <div className="flex-1 pr-2">
                                        <p className="font-bold text-white text-xs leading-tight">{item.name}</p>
                                        <p className="text-[10px] font-mono text-cyan-400 font-semibold">{item.quantity} × KES {item.unitPrice}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-white font-mono text-xs">KES {item.quantity * item.unitPrice}</span>
                                        <button
                                            onClick={() => setCart(cart.filter(c => c.itemId !== item.itemId))}
                                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                        >
                                            <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="text-center py-12 opacity-50">
                                    <ArchiveBoxIcon className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-400 text-xs font-bold">Cart is empty.</p>
                                    <p className="text-[10px] text-slate-500">Tap items on the left to build order.</p>
                                </div>
                            )}
                        </div>

                        {/* Cart Total & Action Buttons */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="font-extrabold uppercase tracking-widest text-slate-400 text-xs">Grand Total</p>
                                <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300 font-mono">
                                    KES {cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => handleSaveOrder('tab')}
                                disabled={isSaving || cart.length === 0}
                                className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 border border-cyan-400/30 cursor-pointer"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                {isSaving ? 'Processing Order...' : `Save & Bill (${paymentMode.toUpperCase()})`}
                            </button>
                            {/* Fire to kitchen button */}
                            {cart.length > 0 && (
                                <button
                                    onClick={() => handleSaveOrder('kitchen')}
                                    disabled={isSaving}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 border border-amber-400/30 cursor-pointer"
                                >
                                    <span>🔥</span> Fire Order to Kitchen KDS
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4-DIGIT PIN AUTHENTICATION MODAL */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-cyan-500/30 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 text-center space-y-6">
                        <div>
                            <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/20">
                                <LockClosedIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-wider">HUD Operator Unlock</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1">Enter 4-digit security PIN to unlock touch session</p>
                        </div>

                        {/* Select Waiter Avatar Bar */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {waiters.map(w => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => {
                                        setTargetWaiterForPin(w);
                                        setPinInput('');
                                        setPinError(null);
                                    }}
                                    className={`flex-1 p-2 rounded-xl border text-center transition-all min-w-[5.5rem] ${targetWaiterForPin?.id === w.id ? 'border-cyan-400 bg-cyan-950/60 font-black text-cyan-300 shadow-md' : 'border-slate-800 text-slate-400 bg-slate-950'}`}
                                >
                                    <p className="text-xs font-bold truncate">{w.name}</p>
                                    <p className="text-[9px] text-slate-500 font-mono">ID: {w.pinCode || w.phoneNumber?.slice(-4) || '1234'}</p>
                                </button>
                            ))}
                        </div>

                        {/* 4-Digit PIN Dots Display */}
                        <div className="flex justify-center items-center gap-4 py-2">
                            {[0, 1, 2, 3].map(index => (
                                <div
                                    key={index}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${pinInput.length > index ? 'bg-cyan-400 border-cyan-400 scale-110 shadow-lg shadow-cyan-500/50' : 'border-slate-700 bg-slate-950'}`}
                                />
                            ))}
                        </div>

                        {pinError && (
                            <p className="text-xs font-bold text-rose-400 bg-rose-950/60 p-2.5 rounded-xl border border-rose-800 animate-shake">
                                {pinError}
                            </p>
                        )}

                        {/* Touch Keypad (0-9) */}
                        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(key => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        if (key === 'C') {
                                            setPinInput('');
                                            setPinError(null);
                                        } else if (key === '⌫') {
                                            setPinInput(pinInput.slice(0, -1));
                                            setPinError(null);
                                        } else {
                                            handlePinKeyPress(key);
                                        }
                                    }}
                                    className={`h-14 rounded-2xl text-xl font-black transition-all active:scale-95 flex items-center justify-center font-mono ${key === 'C' ? 'bg-rose-950/40 border border-rose-800/60 text-rose-400' : key === '⌫' ? 'bg-amber-950/40 border border-amber-800/60 text-amber-400' : 'bg-slate-950 border border-slate-800 text-white hover:border-cyan-500/40 hover:text-cyan-300'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                            <span>Default PIN: Last 4 digits of phone</span>
                            <button
                                type="button"
                                onClick={() => setShowPinModal(false)}
                                className="text-slate-400 hover:text-white uppercase tracking-widest font-bold"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

