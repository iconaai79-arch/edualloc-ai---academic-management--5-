import React, { useState, useEffect, useMemo } from 'react';
import { RetailDashboard } from './RetailDashboard';
import { GoodsInLieuProposalsManager } from './GoodsInLieuProposalsManager';
import { NotificationBell } from '../NotificationBell';
import { supabase } from '../../lib/supabase';
import { apiService } from '../../services/apiService';
import { AppNotification } from '../../types';
import { RetailStoresManager } from './RetailStoresManager';
import { DualModePOS } from './DualModePOS';
import { WishlistManager } from './WishlistManager';
import { RetailExpenses } from './RetailExpenses';
import { RetailRequisitions } from './RetailRequisitions';
import { RetailInventoryManager } from './RetailInventoryManager';
import { RetailStockTransfers } from './RetailStockTransfers';
import { RetailCommissionLedger } from './RetailCommissionLedger';
import { RetailVendors } from './RetailVendors';
import { CafeMenuManager } from '../hybrid/CafeMenuManager';
import { RetailLogisticsManager } from './RetailLogisticsManager';
import { RetailUserDirectory } from './RetailUserDirectory';
import { RetailReportsDashboard } from './RetailReportsDashboard';
import { StoreConfigManager } from './StoreConfigManager';
import { RetailStockReceipts } from './RetailStockReceipts';
import { RetailInventoryItem, RetailStore, User, RetailExpense, Requisition, Course, CountyInventoryItem, VoteHead, ActivityLog } from '../../types';
import { ActivityLogPanel } from '../common/ActivityLogPanel';

// Icons
import { GridIcon as LayoutDashboard } from '../icons/GridIcon';
import { StoreIcon as Store } from '../icons/StoreIcon';
import { SmartphoneIcon as Smartphone } from '../icons/SmartphoneIcon';
import { TargetIcon as Target } from '../icons/TargetIcon';
import { ArrowsRightLeftIcon as ArrowRightLeft } from '../icons/ArrowsRightLeftIcon';
import { BanknotesIcon as HandCoins } from '../icons/BanknotesIcon';
import { DocumentTextIcon as Receipt } from '../icons/DocumentTextIcon';
import { FileTextIcon as FileText } from '../icons/FileTextIcon';
import { ArchiveBoxIcon as Package } from '../icons/ArchiveBoxIcon';
import { TruckIcon as Truck } from '../icons/TruckIcon';
import { CoffeeIcon as Coffee } from '../icons/CoffeeIcon';
import { BuildingOfficeIcon as BuildingIcon } from '../icons/BuildingOfficeIcon';
import { TruckIcon as TruckIcon } from '../icons/TruckIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { BarChart3Icon as BarChart3 } from '../icons/BarChart3Icon';
import { Cog8ToothIcon as Cog } from '../icons/Cog8ToothIcon';
import { MagnifyingGlassIcon as SearchIcon } from '../icons/MagnifyingGlassIcon';
import { XIcon } from '../icons/XIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ShoppingBagIcon } from '../icons/ShoppingBagIcon';
import { ClockIcon } from '../icons/ClockIcon';

export interface RetailNavItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    category: 'commerce' | 'operations' | 'financials' | 'directory' | 'system';
    badge?: string | number;
    color?: string;
}

interface RetailManagerProps {
    institutionId: string;
    currentUser: User;
    retailStores?: RetailStore[];
    inventory?: RetailInventoryItem[];
    retailExpenses?: RetailExpense[];
    onAddRetailExpense?: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
    requisitions?: Requisition[];
    onAddRequisition?: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => Promise<void>;
    businessSubType?: string;
    isEducation?: boolean;
    allUsers?: User[];
    allCourses?: Course[];
    currentInstitution?: any;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    hideNavigation?: boolean;
    countyInventory?: CountyInventoryItem[];
    onMarkInventoryReceived?: (id: string) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    voteHeads?: VoteHead[];
    /** Activity log entries for this inventory/store module */
    activityLog?: ActivityLog[];
}

export function RetailManager(props: RetailManagerProps) {
    const { 
        institutionId, 
        businessSubType, 
        currentUser, 
        retailStores = [], 
        inventory = [], 
        retailExpenses = [], 
        onAddRetailExpense, 
        requisitions = [], 
        onAddRequisition, 
        onUpdateRequisition, 
        isEducation, 
        allUsers = [], 
        allCourses = [], 
        currentInstitution, 
        activeTab, 
        onTabChange, 
        hideNavigation, 
        countyInventory = [], 
        onMarkInventoryReceived, 
        onEditUser, 
        voteHeads = [], 
        activityLog = [] 
    } = props;

    // Filter activity log for inventory/store-relevant events
    const inventoryLogs = useMemo(() =>
        activityLog.filter(l => {
            const a = (l.action || '').toLowerCase();
            return a.includes('stock') || a.includes('inventory') || a.includes('store') ||
                a.includes('item') || a.includes('requisition') || a.includes('issue') ||
                a.includes('vendor') || a.includes('supplier') || a.includes('transfer') ||
                a.includes('expense') || a.includes('goods') || a.includes('pos');
        }),
    [activityLog]);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
    const filteredRetailStores = isAdmin
        ? retailStores
        : retailStores.filter(s => s.id === currentUser?.departmentId);

    const [internalActiveView, setInternalActiveView] = useState<'dashboard' | 'stores' | 'inventory' | 'stock_inwards' | 'shipments' | 'transfers' | 'wishlist' | 'commissions' | 'pos' | 'expenses' | 'requisitions' | 'cafe_menu' | 'vendors' | 'logistics' | 'teachers' | 'support_staff' | 'students' | 'reports' | 'config' | 'goods_in_lieu'>('dashboard');
    const [selectedUserForPOS, setSelectedUserForPOS] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    
    // Sidebar responsive states
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('eduai_retail_sidebar_collapsed') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const activeView = (activeTab as any) || internalActiveView;
    const setActiveView = (view: any) => {
        if (onTabChange) {
            onTabChange(view);
        } else {
            setInternalActiveView(view);
        }
        setIsMobileDrawerOpen(false);
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('eduai_retail_sidebar_collapsed', String(next));
            } catch (e) {}
            return next;
        });
    };

    useEffect(() => {
        if (currentUser?.id) {
            fetchNotifications();

            // Subscribe to real-time notifications
            if (supabase) {
                const channel = supabase
                    .channel(`notifications-${currentUser.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'app_notifications',
                            filter: `user_id=eq.${currentUser.id}`
                        },
                        () => {
                            fetchNotifications();
                        }
                    )
                    .subscribe();

                return () => {
                    supabase?.removeChannel(channel);
                };
            }
        }
    }, [currentUser?.id]);

    const fetchNotifications = async () => {
        try {
            const data = await apiService.fetchNotifications(currentUser.id);
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const handleMarkAsRead = async (id?: string) => {
        try {
            if (id) {
                await apiService.markNotificationAsRead(id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            } else {
                await apiService.markAllNotificationsAsRead(currentUser.id);
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (error) {
            console.error('Failed to update notifications:', error);
        }
    };

    const isCountyManaged = Boolean(currentInstitution?.countyId);
    const isHospitality = businessSubType?.toLowerCase().includes('cafe') ||
        businessSubType?.toLowerCase().includes('restaurant') ||
        businessSubType?.toLowerCase().includes('eatery');

    // Counts for status badges
    const lowStockCount = useMemo(() => inventory.filter(i => (i.quantity || 0) <= (i.reorderPoint || 5)).length, [inventory]);
    const pendingReqCount = useMemo(() => requisitions.filter(r => r.status === 'pending').length, [requisitions]);

    // Build comprehensive navigation items list
    const navItems: RetailNavItem[] = useMemo(() => {
        if (isEducation) {
            return [
                { id: 'dashboard', label: 'Overview', description: 'Store metrics & stock levels', icon: LayoutDashboard, category: 'commerce', color: 'from-indigo-500 to-blue-600' },
                { id: 'inventory', label: 'Inventory', description: 'Classroom & uniform supplies', icon: Package, category: 'commerce', badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined, color: 'from-blue-500 to-cyan-600' },
                { id: 'stock_inwards', label: 'Receive Stock', description: 'Inward goods & supplier delivery', icon: Truck, category: 'commerce', color: 'from-violet-500 to-purple-600' },
                { id: 'pos', label: 'Issue Desk', description: 'Direct issue to faculty & students', icon: Smartphone, category: 'commerce', color: 'from-emerald-500 to-teal-600' },
                { id: 'transfers', label: 'Transfers', description: 'Inter-store inventory shifts', icon: ArrowRightLeft, category: 'commerce', color: 'from-amber-500 to-orange-600' },
                
                ...(isCountyManaged ? [{ id: 'shipments', label: 'County Shipments', description: 'HQ dispatched stock verification', icon: TruckIcon, category: 'operations' as const, color: 'from-amber-500 to-yellow-600' }] : []),
                { id: 'teachers', label: 'Teachers', description: 'Faculty uniform & item quotas', icon: UserIcon, category: 'directory', color: 'from-indigo-500 to-blue-600' },
                { id: 'support_staff', label: 'Support Staff', description: 'Staff requisitions & assets', icon: BriefcaseIcon, category: 'directory', color: 'from-slate-500 to-zinc-600' },
                { id: 'students', label: 'Students', description: 'Student textbook & supply logs', icon: UserGroupIcon, category: 'directory', color: 'from-sky-500 to-cyan-600' },
                
                { id: 'stores', label: 'Manage Stores', description: 'Departmental store depots', icon: Store, category: 'operations', color: 'from-fuchsia-500 to-pink-600' },
                { id: 'requisitions', label: 'Requests', description: 'Faculty & department orders', icon: FileText, category: 'operations', badge: pendingReqCount > 0 ? `${pendingReqCount} New` : undefined, color: 'from-purple-500 to-indigo-600' },
                { id: 'goods_in_lieu', label: 'Goods in Lieu', description: 'Fee settlements via supplies', icon: HandCoins, category: 'operations', color: 'from-teal-500 to-emerald-600' },
                { id: 'vendors', label: 'Suppliers', description: 'Approved vendor catalog', icon: BuildingIcon, category: 'operations', color: 'from-rose-500 to-red-600' },
                { id: 'logistics', label: 'Logistics', description: 'Dispatch & delivery routes', icon: TruckIcon, category: 'operations', color: 'from-sky-500 to-blue-600' },
                
                { id: 'expenses', label: 'Expenses', description: 'Direct supply expenditures', icon: Receipt, category: 'financials', color: 'from-red-500 to-rose-600' },
                
                { id: 'reports', label: 'Reports', description: 'Audit trails & valuation logs', icon: BarChart3, category: 'system', color: 'from-indigo-500 to-violet-600' },
                { id: 'config', label: 'Config', description: 'Reorder limits & thresholds', icon: Cog, category: 'system', color: 'from-slate-600 to-slate-800' },
                { id: 'activity_log', label: 'Activity Log', description: 'Live operational ledger', icon: FileText, category: 'system', color: 'from-zinc-500 to-slate-600' },
            ];
        }

        return [
            // Core Commerce
            { id: 'dashboard', label: 'Overview', description: 'Agency sales & POS metrics', icon: LayoutDashboard, category: 'commerce', color: 'from-indigo-500 to-blue-600' },
            { id: 'inventory', label: 'Product Catalog', description: 'Live SKU inventory & variants', icon: Package, category: 'commerce', badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined, color: 'from-blue-500 to-cyan-600' },
            { id: 'pos', label: 'Dual-Mode POS', description: 'Retail checkout & barcode terminal', icon: Smartphone, category: 'commerce', color: 'from-emerald-500 to-teal-600' },
            { id: 'stock_inwards', label: 'Receive Stock', description: 'Record batch deliveries & supplier invoices', icon: Truck, category: 'commerce', color: 'from-violet-500 to-purple-600' },
            { id: 'transfers', label: 'Stock Transfers', description: 'Relocate stock between agency outlets', icon: ArrowRightLeft, category: 'commerce', color: 'from-amber-500 to-orange-600' },
            
            // Operations & Agents
            { id: 'stores', label: 'Agent Stores', description: 'Agency outlets & branch counters', icon: Store, category: 'operations', color: 'from-fuchsia-500 to-pink-600' },
            { id: 'commissions', label: 'Commissions', description: 'Agent earnings & payout ledger', icon: HandCoins, category: 'operations', color: 'from-emerald-500 to-green-600' },
            { id: 'logistics', label: 'Deliveries', description: 'Dispatch rider tracking & packages', icon: TruckIcon, category: 'operations', color: 'from-sky-500 to-blue-600' },
            { id: 'vendors', label: 'Suppliers', description: 'Wholesalers & supplier profiles', icon: BuildingIcon, category: 'operations', color: 'from-rose-500 to-red-600' },
            { id: 'wishlist', label: 'Wishlist & Quotes', description: 'Customer requests & backorders', icon: Target, category: 'operations', color: 'from-pink-500 to-rose-600' },
            ...(isHospitality ? [{ id: 'cafe_menu', label: 'Cafe & Kitchen', description: 'Menu items & quick POS orders', icon: Coffee, category: 'operations' as const, color: 'from-amber-500 to-yellow-600' }] : []),
            
            // Financials & Requests
            { id: 'expenses', label: 'Operating Expenses', description: 'Daily shop & store expenditures', icon: Receipt, category: 'financials', color: 'from-red-500 to-rose-600' },
            { id: 'requisitions', label: 'Requisitions', description: 'Stock restock & approval orders', icon: FileText, category: 'financials', badge: pendingReqCount > 0 ? `${pendingReqCount} New` : undefined, color: 'from-purple-500 to-indigo-600' },
            
            // System & Intelligence
            { id: 'reports', label: 'Analytics', description: 'Sales charts, profit & loss, tax', icon: BarChart3, category: 'system', color: 'from-indigo-500 to-violet-600' },
            { id: 'config', label: 'Store Config', description: 'Printers, barcodes, tax & VAT', icon: Cog, category: 'system', color: 'from-slate-600 to-slate-800' },
            { id: 'activity_log', label: 'Audit Trail', description: 'Real-time action timestamps', icon: FileText, category: 'system', color: 'from-zinc-500 to-slate-600' },
        ];
    }, [isEducation, isCountyManaged, isHospitality, lowStockCount, pendingReqCount]);

    // Filter items based on search query in sidebar
    const filteredNavItems = useMemo(() => {
        if (!searchQuery.trim()) return navItems;
        const q = searchQuery.toLowerCase();
        return navItems.filter(item => 
            item.label.toLowerCase().includes(q) || 
            (item.description && item.description.toLowerCase().includes(q))
        );
    }, [navItems, searchQuery]);

    // Categories mapping
    const categoryLabels: Record<string, string> = {
        commerce: 'Core Commerce',
        operations: 'Operations & Agents',
        financials: 'Financials & Orders',
        directory: 'Roster Directory',
        system: 'Intelligence & Config'
    };

    const groupedNavItems = useMemo(() => {
        const groups: Record<string, RetailNavItem[]> = {};
        filteredNavItems.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredNavItems]);

    const activeItem = useMemo(() => navItems.find(i => i.id === activeView) || navItems[0], [navItems, activeView]);

    return (
        <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white pb-28 lg:pb-12">
            
            {/* ══════════════════════════════════════════════════════════════════════
                MOBILE STICKY TOP HEADER BAR (Shown on < lg screens)
            ══════════════════════════════════════════════════════════════════════ */}
            {!hideNavigation && (
                <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-sm transition-all -mx-4 sm:-mx-6 mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileDrawerOpen(true)}
                            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 transition-all active:scale-95 flex items-center justify-center shadow-inner"
                            aria-label="Open Navigation Menu"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h1 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white truncate max-w-[170px]">
                                    {currentInstitution?.name || 'Retail Agency'}
                                </h1>
                            </div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                {activeItem?.label || 'Overview'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveView('pos')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>POS</span>
                        </button>

                        <NotificationBell
                            notifications={notifications}
                            onMarkAsRead={handleMarkAsRead}
                        />
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MOBILE FULL NAVIGATION SLIDE-IN DRAWER (Modals/Overlays)
            ══════════════════════════════════════════════════════════════════════ */}
            {isMobileDrawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
                        onClick={() => setIsMobileDrawerOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="fixed inset-y-0 left-0 max-w-[85%] w-80 bg-white dark:bg-slate-900 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-slide-in-left">
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-md">
                                    <Store className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[160px]">
                                        {currentInstitution?.name || 'Retail Portal'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Commerce Gateway
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsMobileDrawerOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search in Drawer */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="relative">
                                <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search modules..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Drawer Navigation List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                            {Object.entries(groupedNavItems).map(([catKey, items]) => (
                                <div key={catKey} className="space-y-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 px-3">
                                        {categoryLabels[catKey] || catKey}
                                    </p>
                                    <div className="space-y-1">
                                        {items.map(item => {
                                            const isActive = activeView === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveView(item.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                                                        isActive 
                                                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 font-black' 
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-bold'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`p-2 rounded-xl shrink-0 ${
                                                            isActive 
                                                                ? 'bg-white/20 text-white' 
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                            <item.icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs uppercase tracking-tight truncate">{item.label}</p>
                                                            {item.description && (
                                                                <p className={`text-[10px] truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.badge && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                                                            isActive 
                                                                ? 'bg-white text-indigo-700' 
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Drawer Footer User Profile */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md">
                                    {(currentUser?.name || 'A')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white truncate">
                                        {currentUser?.name || 'Agent'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                        {currentUser?.role || 'Staff'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                MAIN LAYOUT CONTAINER (VERTICAL SIDEBAR + CONTENT VIEWPORT)
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
                
                {/* ──────────────────────────────────────────────────────────────
                    DESKTOP VERTICAL MENU SIDEBAR (World-Class Desktop Suite)
                ────────────────────────────────────────────────────────────── */}
                {!hideNavigation && (
                    <aside 
                        className={`hidden lg:flex flex-col shrink-0 sticky top-24 transition-all duration-300 ease-in-out bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none overflow-hidden ${
                            isSidebarCollapsed ? 'w-20' : 'w-72 xl:w-80'
                        }`}
                        style={{ maxHeight: 'calc(100vh - 7rem)' }}
                    >
                        {/* Sidebar Header with Agency Identity & Collapse Toggle */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/40">
                            {!isSidebarCollapsed ? (
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="p-3 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <h2 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                {currentInstitution?.name || 'Retail Agency'}
                                            </h2>
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400 mt-0.5">
                                            Terminal & Catalog
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mx-auto p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl shadow-md">
                                    <Store className="w-5 h-5" />
                                </div>
                            )}

                            <button
                                onClick={toggleSidebar}
                                className={`p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all ${
                                    isSidebarCollapsed ? 'hidden' : 'block'
                                }`}
                                title="Collapse Sidebar"
                            >
                                <ChevronRightIcon className="w-4 h-4 transform rotate-180" />
                            </button>
                        </div>

                        {/* Search Input when Expanded */}
                        {!isSidebarCollapsed && (
                            <div className="px-5 pt-4 pb-2">
                                <div className="relative">
                                    <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Jump to module..."
                                        className="w-full pl-9 pr-8 py-2 bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-[11px] font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Expand Button when collapsed */}
                        {isSidebarCollapsed && (
                            <div className="p-3 text-center border-b border-slate-100 dark:border-slate-800/80">
                                <button
                                    onClick={toggleSidebar}
                                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all mx-auto block"
                                    title="Expand Sidebar"
                                >
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Categorized Scrollable Nav Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                            {Object.entries(groupedNavItems).map(([catKey, items]) => (
                                <div key={catKey} className="space-y-1.5">
                                    {!isSidebarCollapsed && (
                                        <div className="flex items-center justify-between px-3">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                                {categoryLabels[catKey] || catKey}
                                            </p>
                                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600">
                                                {items.length}
                                            </span>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        {items.map(item => {
                                            const isActive = activeView === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveView(item.id)}
                                                    title={isSidebarCollapsed ? `${item.label} — ${item.description || ''}` : undefined}
                                                    className={`w-full group relative flex items-center ${
                                                        isSidebarCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                                                    } rounded-2xl transition-all duration-200 ${
                                                        isActive
                                                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white font-black shadow-md shadow-indigo-500/25 scale-[1.02]'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`p-2 rounded-xl transition-all ${
                                                            isActive
                                                                ? 'bg-white/20 text-white shadow-sm'
                                                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-slate-700 group-hover:text-indigo-600'
                                                        }`}>
                                                            <item.icon className="w-4 h-4" />
                                                        </div>
                                                        
                                                        {!isSidebarCollapsed && (
                                                            <div className="text-left min-w-0">
                                                                <p className="text-xs uppercase tracking-tight truncate leading-tight">
                                                                    {item.label}
                                                                </p>
                                                                {item.description && (
                                                                    <p className={`text-[9px] truncate font-medium mt-0.5 ${
                                                                        isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-400'
                                                                    }`}>
                                                                        {item.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!isSidebarCollapsed && item.badge && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                                                            isActive
                                                                ? 'bg-white text-indigo-700 shadow-sm'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                            {item.badge}
                                                        </span>
                                                    )}

                                                    {/* Active side indicator glow */}
                                                    {isActive && isSidebarCollapsed && (
                                                        <span className="absolute right-1 w-1.5 h-6 bg-white rounded-full"></span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick POS Launch Footer Card (Desktop) */}
                        {!isSidebarCollapsed ? (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/60 space-y-3">
                                <button
                                    onClick={() => setActiveView('pos')}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all group"
                                >
                                    <Smartphone className="w-4 h-4 transition-transform group-hover:scale-110" />
                                    <span>Launch POS Terminal</span>
                                </button>
                                
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        {currentUser?.name?.split(' ')[0] || 'Agent'}
                                    </span>
                                    <span className="uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold">
                                        {currentUser?.role || 'Staff'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                                <button
                                    onClick={() => setActiveView('pos')}
                                    className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-md mx-auto block hover:scale-105 active:scale-95 transition-all"
                                    title="Launch POS Terminal"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </aside>
                )}

                {/* ──────────────────────────────────────────────────────────────
                    MAIN CONTENT VIEWPORT & SUBMODULE DISPLAY
                ────────────────────────────────────────────────────────────── */}
                <main className="flex-1 w-full min-w-0 animate-fade-in-up">
                    
                    {/* View Header Bar (Breadcrumb & Quick Actions) */}
                    <div className="hidden lg:flex items-center justify-between pb-6 mb-6 border-b border-slate-200/80 dark:border-slate-800/80">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl bg-gradient-to-tr ${activeItem?.color || 'from-indigo-600 to-violet-600'} text-white shadow-lg`}>
                                <activeItem.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {activeItem?.label || 'Retail Hub'}
                                </h1>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    {activeItem?.description || 'Manage store inventory, point of sale transactions, and agent operations.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveView('pos')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                            >
                                <Smartphone className="w-4 h-4" />
                                <span>Quick POS Terminal</span>
                            </button>

                            <NotificationBell
                                notifications={notifications}
                                onMarkAsRead={handleMarkAsRead}
                            />
                        </div>
                    </div>

                    {/* Active Sub-module Container */}
                    <div className="transition-all duration-300">
                        {activeView === 'dashboard' && (
                            <RetailDashboard 
                                institutionId={institutionId} 
                                onNavigate={(v) => setActiveView(v as any)} 
                                isEducation={isEducation} 
                            />
                        )}

                        {activeView === 'stock_inwards' && (
                            <RetailStockReceipts 
                                institutionId={institutionId} 
                                currentUser={currentUser} 
                            />
                        )}

                        {activeView === 'pos' && (
                            <DualModePOS 
                                institutionId={institutionId} 
                                currentUser={currentUser} 
                                isEducation={isEducation} 
                                preSelectedUser={selectedUserForPOS}
                                onClearPreSelectedUser={() => setSelectedUserForPOS(null)}
                            />
                        )}

                        {activeView === 'teachers' && (
                            <RetailUserDirectory
                                institutionId={institutionId}
                                role="teacher"
                                allUsers={allUsers}
                                allCourses={allCourses}
                                currentInstitution={currentInstitution}
                                onIssueItem={(user) => {
                                    setSelectedUserForPOS(user);
                                    setActiveView('pos');
                                }}
                                onEditUser={onEditUser}
                            />
                        )}

                        {activeView === 'support_staff' && (
                            <RetailUserDirectory
                                institutionId={institutionId}
                                role="support_staff"
                                allUsers={allUsers}
                                allCourses={allCourses}
                                currentInstitution={currentInstitution}
                                onIssueItem={(user) => {
                                    setSelectedUserForPOS(user);
                                    setActiveView('pos');
                                }}
                                onEditUser={onEditUser}
                            />
                        )}

                        {activeView === 'students' && (
                            <RetailUserDirectory
                                institutionId={institutionId}
                                role="student"
                                allUsers={allUsers}
                                allCourses={allCourses}
                                currentInstitution={currentInstitution}
                                onIssueItem={(user) => {
                                    setSelectedUserForPOS(user);
                                    setActiveView('pos');
                                }}
                                onEditUser={onEditUser}
                            />
                        )}

                        {activeView === 'stores' && (
                            <RetailStoresManager 
                                institutionId={institutionId} 
                                isEducation={isEducation} 
                                currentUser={currentUser} 
                            />
                        )}

                        {activeView === 'wishlist' && (
                            <WishlistManager 
                                institutionId={institutionId} 
                            />
                        )}

                        {activeView === 'expenses' && (
                            <RetailExpenses
                                institutionId={institutionId}
                                currentUser={currentUser}
                                retailStores={filteredRetailStores}
                                retailExpenses={retailExpenses}
                                onAddRetailExpense={onAddRetailExpense!}
                            />
                        )}

                        {activeView === 'requisitions' && (
                            <RetailRequisitions
                                institutionId={institutionId}
                                currentUser={currentUser}
                                retailStores={filteredRetailStores}
                                requisitions={requisitions}
                                inventory={inventory as any}
                                onAddRequisition={onAddRequisition!}
                                onUpdateRequisition={onUpdateRequisition}
                                isEducation={isEducation}
                                allUsers={allUsers}
                            />
                        )}

                        {activeView === 'goods_in_lieu' && (
                            <GoodsInLieuProposalsManager
                                institutionId={institutionId}
                                users={allUsers}
                                inventory={inventory as any}
                            />
                        )}

                        {activeView === 'inventory' && (
                            <RetailInventoryManager
                                institutionId={institutionId}
                                currentInstitution={currentInstitution}
                                stores={filteredRetailStores}
                                voteHeads={voteHeads}
                                isEducation={isEducation}
                            />
                        )}

                        {activeView === 'shipments' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-[2rem] flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl text-amber-600">
                                        <TruckIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-amber-800 dark:text-amber-200 uppercase tracking-tight">County Distribution Registry</h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Verify and acknowledge receipt of items dispatched from Headquarters.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {countyInventory.filter(i => i.status === 'in_transit' || i.status === 'received').map(item => (
                                        <div key={item.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-indigo-200 transition-all">
                                            <div className="flex gap-4 items-center">
                                                <div className={`p-3 rounded-2xl ${item.status === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.quantity} {item.unit}</span>
                                                        <span className="text-[10px] font-black text-slate-400">•</span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'received' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {item.status === 'received' ? 'Successfully Received' : 'In Transit'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {item.status === 'in_transit' && (
                                                <button
                                                    onClick={() => {
                                                        onMarkInventoryReceived?.(item.id);
                                                    }}
                                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95"
                                                >
                                                    Mark as Received
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {countyInventory.filter(i => i.status === 'in_transit' || i.status === 'received').length === 0 && (
                                        <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest bg-slate-50 dark:bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                                            No shipments records found for this institution.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeView === 'transfers' && (
                            <RetailStockTransfers 
                                institutionId={institutionId} 
                                currentUser={currentUser} 
                            />
                        )}

                        {activeView === 'vendors' && (
                            <RetailVendors 
                                institutionId={institutionId} 
                            />
                        )}

                        {activeView === 'commissions' && (
                            <RetailCommissionLedger 
                                institutionId={institutionId} 
                                currentUser={currentUser} 
                            />
                        )}

                        {activeView === 'logistics' && (
                            <RetailLogisticsManager 
                                institutionId={institutionId} 
                            />
                        )}

                        {activeView === 'reports' && (
                            <RetailReportsDashboard
                                institutionId={institutionId}
                                users={allUsers}
                                isEducation={isEducation}
                            />
                        )}

                        {activeView === 'cafe_menu' && (
                            <CafeMenuManager 
                                institutionId={institutionId} 
                            />
                        )}

                        {activeView === 'config' && (
                            <StoreConfigManager
                                institutionId={institutionId}
                                currentUser={currentUser}
                                currentInstitution={currentInstitution}
                            />
                        )}

                        {activeView === 'activity_log' && (
                            <ActivityLogPanel 
                                logs={inventoryLogs} 
                                module="Inventory" 
                            />
                        )}
                    </div>
                </main>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════
                MOBILE FLOATING BOTTOM NAVIGATION DOCK (Shown on < lg screens)
            ══════════════════════════════════════════════════════════════════════ */}
            {!hideNavigation && (
                <nav className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
                    <div className="bg-slate-950/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-800/80 rounded-[2.2rem] shadow-2xl p-2 flex items-center justify-around">
                        
                        {/* 1. Dashboard / Overview */}
                        <button
                            onClick={() => setActiveView('dashboard')}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative ${
                                activeView === 'dashboard'
                                    ? 'text-indigo-400 scale-110 font-black'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="text-[8px] font-extrabold uppercase tracking-tight">Overview</span>
                            {activeView === 'dashboard' && (
                                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                            )}
                        </button>

                        {/* 2. Product Catalog */}
                        <button
                            onClick={() => setActiveView('inventory')}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative ${
                                activeView === 'inventory'
                                    ? 'text-indigo-400 scale-110 font-black'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Package className="w-5 h-5" />
                            <span className="text-[8px] font-extrabold uppercase tracking-tight">Catalog</span>
                            {activeView === 'inventory' && (
                                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                            )}
                        </button>

                        {/* 3. Central Highlighted POS Button */}
                        <button
                            onClick={() => setActiveView('pos')}
                            className={`flex flex-col items-center justify-center -mt-6 p-3 rounded-full bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/30 border-4 border-slate-950 dark:border-slate-900 transition-all active:scale-95 ${
                                activeView === 'pos' ? 'ring-4 ring-emerald-400/40 scale-105' : ''
                            }`}
                        >
                            <Smartphone className="w-5 h-5" />
                        </button>

                        {/* 4. Receive Stock */}
                        <button
                            onClick={() => setActiveView('stock_inwards')}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative ${
                                activeView === 'stock_inwards'
                                    ? 'text-indigo-400 scale-110 font-black'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Truck className="w-5 h-5" />
                            <span className="text-[8px] font-extrabold uppercase tracking-tight">Receive</span>
                            {activeView === 'stock_inwards' && (
                                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                            )}
                        </button>

                        {/* 5. More / All Menu Drawer Toggle */}
                        <button
                            onClick={() => setIsMobileDrawerOpen(true)}
                            className="flex flex-col items-center gap-1 p-2 rounded-2xl text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
                        >
                            <div className="w-5 h-5 flex flex-wrap gap-0.5 justify-center items-center">
                                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                            </div>
                            <span className="text-[8px] font-extrabold uppercase tracking-tight">Menu</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
}
