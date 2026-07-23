import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, RetailSale, CafeMenuItem, RetailInventoryItem, Role } from '../../types';
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
    const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Staff Management Modal State
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<User | null>(null);
    const [staffName, setStaffName] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    const [staffEmail, setStaffEmail] = useState('');
    const [staffRole, setStaffRole] = useState<string>('waiter');
    const [staffPin, setStaffPin] = useState('');
    const [showPinCodes, setShowPinCodes] = useState(false);
    const [isSavingStaff, setIsSavingStaff] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [salesRes, cafeRes, invRes, usersRes] = await Promise.all([
                apiService.fetchModuleRecords('retail_sales', institutionId),
                apiService.fetchModuleRecords('cafe_menu_items', institutionId),
                apiService.fetchModuleRecords('retail_inventory', institutionId),
                apiService.fetchModuleRecords('users', institutionId).catch(() => [])
            ]);
            setRetailSales(salesRes || []);
            setCafeItems(cafeRes || []);
            setRetailInventory(invRes || []);
            if (Array.isArray(usersRes) && usersRes.length > 0) {
                setFetchedUsers(usersRes);
            }
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

    // Merge users prop with fetchedUsers
    const allUsers = useMemo(() => {
        const combined = [...users];
        fetchedUsers.forEach(fu => {
            if (!combined.some(u => u.id === fu.id)) {
                combined.push(fu);
            }
        });
        return combined;
    }, [users, fetchedUsers]);

    // Staff / Waiters List
    const waitersList = useMemo(() => {
        return allUsers.filter(u => 
            u.role === 'waiter' || 
            u.role === 'carwash_waiter' || 
            u.role === 'staff' || 
            u.role === 'restaurant_admin'
        );
    }, [allUsers]);

    // All Restaurant Staff Members for Settings
    const restaurantStaffMembers = useMemo(() => {
        return allUsers.filter(u => 
            u.role === 'waiter' || 
            u.role === 'carwash_waiter' || 
            u.role === 'staff' || 
            u.role === 'restaurant_admin' ||
            u.role === 'admin'
        );
    }, [allUsers]);

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

    // Staff Management Handlers
    const handleOpenAddStaffModal = () => {
        setEditingStaff(null);
        setStaffName('');
        setStaffPhone('');
        setStaffEmail('');
        setStaffRole('waiter');
        setStaffPin('');
        setShowStaffModal(true);
    };

    const handleOpenEditStaffModal = (staff: User) => {
        setEditingStaff(staff);
        setStaffName(staff.name || '');
        setStaffPhone(staff.phoneNumber || '');
        setStaffEmail(staff.email || '');
        setStaffRole(staff.role || 'waiter');
        setStaffPin(staff.pinCode || staff.phoneNumber?.slice(-4) || '1234');
        setShowStaffModal(true);
    };

    const handleSaveStaffMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffName.trim()) {
            alert("Please enter staff member's name.");
            return;
        }

        setIsSavingStaff(true);
        try {
            // Generate 4-digit PIN if empty
            let finalPin = staffPin.trim();
            if (!finalPin || finalPin.length < 4) {
                finalPin = staffPhone ? staffPhone.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
            }

            const cleanEmail = staffEmail.trim() || `${staffName.toLowerCase().replace(/\s+/g, '.')}@${currentInstitution.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.ke`;

            const staffId = editingStaff ? editingStaff.id : `usr_rest_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

            const payload: User = {
                id: staffId,
                name: staffName.trim(),
                email: cleanEmail,
                phoneNumber: staffPhone.trim(),
                pinCode: finalPin,
                role: staffRole as Role,
                institutionId: currentInstitution.id,
                createdAt: editingStaff?.createdAt || new Date().toISOString()
            };

            await apiService.saveModuleRecord('users', payload);
            
            // Update local state directly for immediate UI feedback
            setFetchedUsers(prev => {
                const idx = prev.findIndex(u => u.id === staffId);
                if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = payload;
                    return copy;
                }
                return [...prev, payload];
            });

            setShowStaffModal(false);
            await handleDataChange();
        } catch (err: any) {
            console.error("Failed to save staff member:", err);
            alert(`Failed to save staff member: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSavingStaff(false);
        }
    };

    const handleDeleteStaffMember = async (staffId: string, staffName: string) => {
        if (!window.confirm(`Are you sure you want to remove staff member "${staffName}" from restaurant POS?`)) {
            return;
        }

        try {
            await apiService.deleteModuleRecord('users', staffId);
            setFetchedUsers(prev => prev.filter(u => u.id !== staffId));
            await handleDataChange();
        } catch (err: any) {
            console.error("Failed to delete staff member:", err);
            alert(`Failed to delete staff: ${err.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 min-h-screen pb-12 font-sans bg-slate-950 text-slate-100 p-2 sm:p-4 rounded-3xl">
            {/* Futuristic Glassmorphism HUD Banner Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-cyan-500/30 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-cyan-950/40 relative overflow-hidden backdrop-blur-xl">
                {/* Neon Ambient Glows */}
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3.5 mb-2">
                            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/40 rounded-2xl text-3xl shadow-lg shadow-cyan-500/20 backdrop-blur-md">
                                🛸
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-indigo-300">
                                        {currentInstitution.name} Futuristic POS
                                    </h1>
                                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono font-bold rounded-xl text-[10px] uppercase tracking-widest backdrop-blur-md shadow-sm">
                                        v3.0 HUD Touch
                                    </span>
                                    {typeof navigator !== 'undefined' && !navigator.onLine && (
                                        <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black rounded-xl text-[10px] uppercase tracking-wider animate-pulse shadow-md">
                                            📡 Offline Engine Active
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-400 text-xs font-medium mt-0.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    Next-Gen Touch Ordering System • Real-Time KDS Matrix • Staff PIN Management
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Futuristic Glass KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-cyan-500/25 p-3.5 rounded-2xl shadow-lg hover:border-cyan-400/50 transition-all">
                            <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                🛒 Today's Orders
                            </p>
                            <p className="text-xl font-black mt-1 text-white font-mono">{todaySales.length}</p>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/25 p-3.5 rounded-2xl shadow-lg hover:border-indigo-400/50 transition-all">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                ⚡ Revenue
                            </p>
                            <p className="text-xl font-black mt-1 text-cyan-300 font-mono">KSh {totalTodayRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-amber-500/25 p-3.5 rounded-2xl shadow-lg hover:border-amber-400/50 transition-all col-span-2 sm:col-span-1">
                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                👥 Staff Operators
                            </p>
                            <p className="text-xl font-black mt-1 font-mono flex items-center gap-2 text-white">
                                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50" />
                                {restaurantStaffMembers.length} Active
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sub-Tab Navigation Bar */}
                <div className="flex items-center gap-2 mt-6 pt-6 border-t border-cyan-500/20 overflow-x-auto scrollbar-none">
                    {[
                        { id: 'pos', label: '🎛️ HUD Touch POS', desc: 'Interactive Terminal' },
                        { id: 'kds', label: '👨‍🍳 Kitchen KDS Matrix', desc: 'Live Display' },
                        { id: 'status_board', label: '📺 Customer Display', desc: 'Order Tracker' },
                        { id: 'menu', label: '🍽️ Menu & Recipes', desc: 'Digital Catalog' },
                        { id: 'sales', label: '📊 Sales Ledger', desc: 'Transaction Analytics' },
                        { id: 'settings', label: '⚙️ Settings & Staff', desc: 'Manage Waiters & PINs' }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                                    isActive
                                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/30 scale-105 border border-cyan-300/40'
                                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                                }`}
                            >
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB CONTENT */}

            {/* 1. Touch POS */}
            {activeTab === 'pos' && (
                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-4 sm:p-6">
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
                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                        <div>
                            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-wide flex items-center gap-2">
                                👨‍🍳 Kitchen KDS Matrix
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Real-time order ticket matrix for chef line and barista stations</p>
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
                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                        <div>
                            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-wide flex items-center gap-2">
                                📺 Customer Order Tracker Board
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Public dining monitor view displaying preparing vs. ready-for-pickup orders</p>
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
                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-6">
                    <CafeMenuManager
                        institutionId={institutionId}
                        onDataChange={handleDataChange}
                    />
                </div>
            )}

            {/* 5. Sales & Transaction Log */}
            {activeTab === 'sales' && (
                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
                        <div>
                            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-wider">Restaurant Sales Ledger</h3>
                            <p className="text-xs text-slate-400 font-medium">{retailSales.length} total transaction records logged</p>
                        </div>
                        <button
                            type="button"
                            onClick={loadData}
                            className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                        >
                            🔄 Sync Sales History
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-950 text-cyan-400 border-b border-slate-800 uppercase tracking-widest text-[9px] font-black">
                                    <th className="py-3.5 px-4">Receipt #</th>
                                    <th className="py-3.5 px-4">Timestamp</th>
                                    <th className="py-3.5 px-4">Customer / Table</th>
                                    <th className="py-3.5 px-4">Items Count</th>
                                    <th className="py-3.5 px-4">Total Amount</th>
                                    <th className="py-3.5 px-4">Payment Method</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-medium bg-slate-900/50">
                                {retailSales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-cyan-500/5 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-cyan-300">{(sale as any).receiptNumber || sale.id.slice(-8)}</td>
                                        <td className="py-3 px-4 text-slate-400">{new Date(sale.createdAt || '').toLocaleString('en-KE')}</td>
                                        <td className="py-3 px-4 text-white font-bold">{sale.customerName || 'Walk-in Guest'}</td>
                                        <td className="py-3 px-4 text-slate-400">{sale.items?.length || 0} items</td>
                                        <td className="py-3 px-4 font-black text-emerald-400 font-mono">KSh {(sale.totalAmount || 0).toLocaleString()}</td>
                                        <td className="py-3 px-4">
                                            <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {sale.paymentMethod || 'Cash'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {retailSales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">No sales recorded yet. Place orders via HUD Touch POS tab!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 6. Settings & Staff Management */}
            {activeTab === 'settings' && (
                <div className="space-y-8">
                    {/* Section 1: Terminal Config */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-6 space-y-6">
                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-wider border-b border-slate-800 pb-4">
                            ⚙️ POS Terminal Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-cyan-400">Institution Name</label>
                                <input type="text" value={currentInstitution.name} disabled className="w-full p-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-xs font-bold text-slate-300 font-mono" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-cyan-400">Currency Code</label>
                                <input type="text" value="KSh (Kenyan Shilling)" disabled className="w-full p-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-xs font-bold text-slate-300 font-mono" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Staff & Waiter Management */}
                    <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] border border-cyan-500/20 shadow-2xl p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-wider flex items-center gap-2">
                                    👥 Restaurant Staff & Waiter Management
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    Register waiters, cashiers, and kitchen staff. Configure 4-digit security PINs for touch screen terminal authentication.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowPinCodes(prev => !prev)}
                                    className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    {showPinCodes ? '🔒 Mask PINs' : '👁️ Reveal PINs'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddStaffModal}
                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 border border-cyan-400/30 transition-all flex items-center gap-2"
                                >
                                    <span>➕ Add Restaurant Staff</span>
                                </button>
                            </div>
                        </div>

                        {/* Staff Cards / Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-950 text-cyan-400 border-b border-slate-800 uppercase tracking-widest text-[9px] font-black">
                                        <th className="py-3.5 px-4">Staff Operator</th>
                                        <th className="py-3.5 px-4">Role</th>
                                        <th className="py-3.5 px-4">Contact Phone</th>
                                        <th className="py-3.5 px-4">Terminal 4-Digit PIN</th>
                                        <th className="py-3.5 px-4">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium bg-slate-900/50">
                                    {restaurantStaffMembers.map(staff => {
                                        const pin = staff.pinCode || staff.phoneNumber?.slice(-4) || '1234';
                                        const isWaiter = staff.role === 'waiter' || staff.role === 'carwash_waiter';

                                        return (
                                            <tr key={staff.id} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-300 font-black text-sm flex items-center justify-center">
                                                            {staff.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white leading-tight">{staff.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{staff.email || 'No email registered'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                        isWaiter ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' :
                                                        staff.role === 'restaurant_admin' || staff.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40' :
                                                        'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                                    }`}>
                                                        {staff.role.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-slate-300">
                                                    {staff.phoneNumber || '—'}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="px-3 py-1 bg-slate-950 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-sm rounded-lg tracking-widest shadow-inner">
                                                        {showPinCodes ? pin : '••••'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditStaffModal(staff)}
                                                            className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            ✏️ Edit / PIN
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteStaffMember(staff.id, staff.name)}
                                                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {restaurantStaffMembers.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                                                No restaurant staff members registered yet. Click "Add Restaurant Staff" above!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT STAFF MODAL */}
            {showStaffModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-cyan-500/30 rounded-[2.5rem] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                                    {editingStaff ? '✏️ Edit Restaurant Staff' : '➕ Register Restaurant Staff'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Assign staff details and 4-digit PIN code for touch terminal logon.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStaffModal(false)}
                                className="text-slate-400 hover:text-white text-lg font-bold p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveStaffMember} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black uppercase tracking-wider text-cyan-400">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. John Kamau"
                                    value={staffName}
                                    onChange={(e) => setStaffName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-cyan-400">Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 0712345678"
                                        value={staffPhone}
                                        onChange={(e) => setStaffPhone(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs font-mono font-bold focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-cyan-400">Role</label>
                                    <select
                                        value={staffRole}
                                        onChange={(e) => setStaffRole(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                                    >
                                        <option value="waiter">🍽️ Waiter / Server</option>
                                        <option value="cashier">🛒 Cashier</option>
                                        <option value="staff">👨‍🍳 Kitchen Chef / Barista</option>
                                        <option value="restaurant_admin">🔑 Restaurant Manager</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-cyan-400">4-Digit Security PIN</label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        placeholder="Auto-set from phone if empty"
                                        value={staffPin}
                                        onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-slate-950 border border-slate-800 text-cyan-300 rounded-xl p-3 text-sm font-mono font-black tracking-widest focus:border-cyan-500 focus:outline-none"
                                    />
                                    <p className="text-[10px] text-slate-500">Used for 4-digit touch screen terminal login.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-wider text-cyan-400">Email Address (Optional)</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. waiter@restaurant.com"
                                        value={staffEmail}
                                        onChange={(e) => setStaffEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs font-medium focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowStaffModal(false)}
                                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingStaff}
                                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 border border-cyan-400/30 disabled:opacity-50"
                                >
                                    {isSavingStaff ? 'Saving...' : (editingStaff ? 'Update Staff Member' : 'Save Staff Member')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


