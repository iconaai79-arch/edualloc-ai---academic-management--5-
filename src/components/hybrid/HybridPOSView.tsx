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

export const HybridPOSView: React.FC<HybridPOSViewProps> = ({
    currentUser, currentInstitution, carWashJobs, retailInventory, cafeInventory, retailSales, waiters, onLogAction, onDataChange
}) => {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [cart, setCart] = useState<(RetailSaleItem & { source: 'cafe' | 'retail' })[]>([]);
    const [selectedWaiterId, setSelectedWaiterId] = useState<string>(currentUser.role === 'carwash_waiter' ? currentUser.id : '');
    const [isSaving, setIsSaving] = useState(false);

    // Shared Screen PIN & Auto-Logout State
    const [showPinModal, setShowPinModal] = useState<boolean>(false);
    const [pinInput, setPinInput] = useState<string>('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [targetWaiterForPin, setTargetWaiterForPin] = useState<User | null>(null);
    const [autoLogoutSeconds, setAutoLogoutSeconds] = useState<number | null>(null);

    // Filter active car wash jobs
    const activeJobs = useMemo(() => {
        return carWashJobs.filter(job => job.status === 'in_progress' || job.status === 'queued' || job.status === 'ready');
    }, [carWashJobs]);

    const activeJob = activeJobs.find(j => j.id === selectedJobId);
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
        if (!selectedJobId || cart.length === 0) return;
        setIsSaving(true);
        try {
            const calculatedTotal = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            if (isNaN(calculatedTotal)) {
                throw new Error("Invalid total amount (NaN). Please check item prices.");
            }

            if (!selectedWaiterId) {
                alert("Please select or PIN-login a waiter before saving the order.");
                setIsSaving(false);
                setShowPinModal(true);
                return;
            }

            const waiter = waiters.find(w => w.id === selectedWaiterId) || currentUser;
            const orderId = `co_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
            const order: CafeOrder = {
                id: orderId,
                institutionId: currentInstitution.id,
                jobId: selectedJobId,
                items: cart.map(item => ({
                    itemId: item.itemId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    kitchenStatus: orderType === 'kitchen' ? 'pending' : undefined
                })),
                totalAmount: calculatedTotal,
                status: 'pending',
                paymentMethod: 'tab',
                waiterId: selectedWaiterId,
                waiterName: waiter?.name,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('cafe_orders', order);

            const retailSaleRecord: RetailSale = {
                id: orderId,
                institutionId: currentInstitution.id,
                items: cart.map(item => ({
                    id: item.itemId,
                    productId: item.itemId,
                    productName: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.quantity * item.unitPrice,
                    kitchenStatus: orderType === 'kitchen' ? 'pending' : undefined
                })),
                totalAmount: calculatedTotal,
                paymentMethod: 'tab',
                cashierId: selectedWaiterId,
                customerName: `Tab: ${activeJob?.vehiclePlate || 'Walk-in Guest'}`,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('retail_sales', retailSaleRecord).catch(() => null);

            await onLogAction(`Added ${cart.length} items to tab for vehicle ${activeJob?.vehiclePlate}`);
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

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 relative">
            
            {/* Top Shared Waiter Terminal Bar */}
            <div className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOffline ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                    <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider">
                            Active Waiter: <span className="text-amber-300">{activeWaiter ? activeWaiter.name : 'None (Terminal Locked)'}</span>
                        </span>
                    </div>
                    {isOffline && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            📡 Offline Mode Active
                        </span>
                    )}
                </div>

                {/* 30s Countdown Banner / Switch Waiter Button */}
                <div className="flex items-center gap-3">
                    {autoLogoutSeconds !== null && (
                        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-3 py-1 rounded-xl text-xs font-bold animate-pulse">
                            <span>⏱️ Order Sent! Auto-locking in <strong className="text-white text-sm">{autoLogoutSeconds}s</strong></span>
                            <button
                                type="button"
                                onClick={() => setAutoLogoutSeconds(null)}
                                className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-wider hover:bg-amber-400"
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
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                        <LockClosedIcon className="w-3.5 h-3.5" />
                        <span>{activeWaiter ? '🔑 Switch Waiter (4-Digit PIN)' : '🔑 Enter 4-Digit PIN'}</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Active Tabs / Jobs */}
                <div className="w-1/3 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <ClockIcon className="w-6 h-6 text-blue-500" />
                            Active Tabs
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Select a tab or table to attach food/drink orders.</p>
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
                                <p className="text-slate-500 font-bold">No active wash jobs or open tabs.</p>
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
                            <p className="text-slate-500 font-medium">Choose a vehicle or table on the left to start adding items.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Menu Catalog */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Cafe & Dining Menu</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        ...cafeInventory.map(i => ({ ...i, source: 'cafe' as const })),
                                        ...retailInventory.map(i => ({ ...i, source: 'retail' as const, isAvailable: true }))
                                    ].filter(item => {
                                        const name = item.name.toLowerCase();
                                        return !name.includes('service package') && !name.includes('wash service');
                                    }).map(item => {
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
                                                className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left ${!item.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={!item.isAvailable}
                                            >
                                                {/* Image Section */}
                                                <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                                                    {imageUrl ? (
                                                        <img loading="lazy" src={imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                                                            <span className="text-4xl">{isCafe ? '🍔' : '📦'}</span>
                                                        </div>
                                                    )}

                                                    {/* Price Tag Overlay */}
                                                    <div className="absolute bottom-2 right-2 px-3 py-1 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm border border-slate-100 dark:border-slate-700">
                                                        <p className="text-sm font-black text-blue-600 dark:text-blue-400">KES {item.basePrice}</p>
                                                    </div>

                                                    {/* Source Badge */}
                                                    <div className="absolute top-2 left-2">
                                                        {isCafe ? (
                                                            <span className="px-2 py-0.5 rounded-md bg-orange-500 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-500/20">Cafe</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-500 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20">Retail</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Content Section */}
                                                <div className="p-4 flex flex-col flex-1">
                                                    <h4 className="font-bold text-slate-800 dark:text-white leading-snug line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {item.name}
                                                    </h4>
                                                    {isCafe && (item as any).description && (
                                                        <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{(item as any).description}</p>
                                                    )}
                                                    {!item.isAvailable && (
                                                        <p className="mt-auto text-[10px] font-black text-rose-500 uppercase tracking-widest pt-2">Out of Stock</p>
                                                    )}
                                                </div>

                                                {/* Hover Action Hint */}
                                                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none" />
                                            </button>
                                        );
                                    })}
                                    {cafeInventory.length === 0 && retailInventory.length === 0 && (
                                        <p className="col-span-full text-slate-500 font-medium text-center py-8">No menu items found.</p>
                                    )}
                                </div>
                            </div>

                            {/* Order Summary (Cart) */}
                            <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <h3 className="font-black uppercase tracking-widest text-slate-800 dark:text-white text-sm">Tab Summary</h3>
                                    <p className="text-blue-600 font-bold text-xs mt-1">Tab: {activeJob?.vehiclePlate}</p>
                                </div>

                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10 flex justify-between items-center">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Waiter</label>
                                        <p className="text-xs font-black text-slate-800 dark:text-white">{activeWaiter?.name || 'No Waiter Selected'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPinModal(true)}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                    >
                                        PIN Login
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Wash / Cover Charge</p>
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
                                    {cart.length > 0 && (
                                        <button
                                            onClick={() => handleSaveOrder('kitchen')}
                                            disabled={isSaving}
                                            className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
                                        >
                                            <span>🔥</span> Fire to Kitchen & Auto-Lock (30s)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 4-DIGIT PIN AUTHENTICATION MODAL */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 text-center space-y-6">
                        <div>
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <LockClosedIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Waiters Shared Terminal</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1">Enter your 4-digit PIN code to unlock session</p>
                        </div>

                        {/* Select Waiter Avatar Bar */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {waiters.map(w => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => {
                                        setTargetWaiterForPin(w);
                                        setPinInput('');
                                        setPinError(null);
                                    }}
                                    className={`flex-1 p-2 rounded-xl border text-center transition-all min-w-[5.5rem] ${targetWaiterForPin?.id === w.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 font-black' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                                >
                                    <p className="text-xs font-bold truncate">{w.name}</p>
                                    <p className="text-[9px] text-slate-400">ID: {w.pinCode || w.phoneNumber?.slice(-4) || '1234'}</p>
                                </button>
                            ))}
                        </div>

                        {/* 4-Digit PIN Dots Display */}
                        <div className="flex justify-center items-center gap-4 py-2">
                            {[0, 1, 2, 3].map(index => (
                                <div
                                    key={index}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${pinInput.length > index ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-md' : 'border-slate-300 dark:border-slate-700 bg-transparent'}`}
                                />
                            ))}
                        </div>

                        {pinError && (
                            <p className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 animate-shake">
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
                                    className={`h-14 rounded-2xl text-xl font-black transition-all active:scale-95 flex items-center justify-center ${key === 'C' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : key === '⌫' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                            <span>Default PIN: Last 4 digits of phone</span>
                            <button
                                type="button"
                                onClick={() => setShowPinModal(false)}
                                className="text-slate-500 hover:text-slate-700 uppercase tracking-widest font-bold"
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
