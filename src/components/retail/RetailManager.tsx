import React, { useState, useEffect } from 'react';
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
import { RetailInventoryItem, RetailStore, User, RetailExpense, Requisition, Course, CountyInventoryItem } from '../../types';
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
import { SettingsIcon as Cog } from '../icons/SettingsIcon';

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
}

export function RetailManager(props: RetailManagerProps) {
    const { institutionId, businessSubType, currentUser, retailStores = [], inventory = [], retailExpenses = [], onAddRetailExpense, requisitions = [], onAddRequisition, onUpdateRequisition, isEducation, allUsers = [], allCourses = [], currentInstitution, activeTab, onTabChange, hideNavigation, countyInventory = [], onMarkInventoryReceived, onEditUser } = props;
    const [internalActiveView, setInternalActiveView] = useState<'dashboard' | 'stores' | 'inventory' | 'stock_inwards' | 'shipments' | 'transfers' | 'wishlist' | 'commissions' | 'pos' | 'expenses' | 'requisitions' | 'cafe_menu' | 'vendors' | 'logistics' | 'teachers' | 'support_staff' | 'students' | 'reports' | 'config' | 'goods_in_lieu'>('dashboard');
    const [selectedUserForPOS, setSelectedUserForPOS] = useState<User | null>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const activeView = (activeTab as any) || internalActiveView;
    const setActiveView = (view: any) => {
        if (onTabChange) {
            onTabChange(view);
        } else {
            setInternalActiveView(view);
        }
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

    const navItems = isEducation ? [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'stock_inwards', label: 'Receive Stock', icon: Truck },
        { id: 'pos', label: 'Issue Desk', icon: Smartphone },
        ...(isCountyManaged ? [{ id: 'shipments', label: 'County Shipments', icon: TruckIcon }] : []),
        { id: 'teachers', label: 'Teachers', icon: UserIcon },
        { id: 'support_staff', label: 'Support Staff', icon: BriefcaseIcon },
        { id: 'students', label: 'Students', icon: UserGroupIcon },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'logistics', label: 'Logistics', icon: TruckIcon },
        { id: 'stores', label: 'Departments', icon: Store },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
        { id: 'requisitions', label: 'Requests', icon: FileText },
        { id: 'goods_in_lieu', label: 'Goods in Lieu', icon: HandCoins },
        { id: 'vendors', label: 'Suppliers', icon: BuildingIcon },
        { id: 'transfers', label: 'Transfers', icon: Truck },
        { id: 'config', label: 'Config', icon: Cog },
    ] : [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Catalog', icon: Package },
        { id: 'stock_inwards', label: 'Receive Stock', icon: Truck },
        { id: 'pos', label: 'POS', icon: Smartphone },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'logistics', label: 'Logistics', icon: TruckIcon },
        { id: 'stores', label: 'Agents', icon: Store },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
        { id: 'requisitions', label: 'Reqs', icon: FileText },
        { id: 'vendors', label: 'Vendors', icon: BuildingIcon },
        { id: 'transfers', label: 'Transfers', icon: Truck },
        { id: 'commissions', label: 'Comms', icon: HandCoins },
        ...(isHospitality ? [{ id: 'cafe_menu', label: 'Cafe', icon: Coffee }] : [])
    ];


    return (
        <div className={`min-h-screen ${!hideNavigation ? 'pb-24 md:pb-6 space-y-6' : ''}`}>
            {/* Desktop Navigation - Glassy & Premium */}
            {!hideNavigation && (
                <>
                    <div className="hidden md:flex sticky top-0 z-30 py-4 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-b border-white/20 dark:border-slate-800/50 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 transition-all items-center justify-between gap-4">
                        <div className="flex-1 overflow-x-auto no-scrollbar select-none">
                            <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-max shadow-inner backdrop-blur-md gap-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveView(item.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap group ${activeView === item.id
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm scale-105 active:scale-95'
                                            : 'text-slate-500 hover:text-indigo-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <item.icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${activeView === item.id ? 'animate-pulse' : ''}`} />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 flex justify-end items-center gap-4">
                            <NotificationBell
                                notifications={notifications}
                                onMarkAsRead={handleMarkAsRead}
                            />
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
                </>
            )}

            <div className="animate-fade-in-up mt-4">
                {activeView === 'dashboard' && <RetailDashboard institutionId={institutionId} onNavigate={(v) => setActiveView(v as any)} isEducation={isEducation} />}
                {activeView === 'stock_inwards' && <RetailStockReceipts institutionId={institutionId} currentUser={currentUser} />}
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
                {activeView === 'stores' && <RetailStoresManager institutionId={institutionId} isEducation={isEducation} />}
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

                {/* Placeholders for upcoming modules */}
                {activeView === 'inventory' && (
                    <RetailInventoryManager
                        institutionId={institutionId}
                        currentInstitution={currentInstitution}
                        stores={retailStores}
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
                {activeView === 'transfers' && <RetailStockTransfers institutionId={institutionId} currentUser={currentUser} />}
                { activeView === 'vendors' && <RetailVendors institutionId={institutionId} /> }
                {activeView === 'commissions' && <RetailCommissionLedger institutionId={institutionId} currentUser={currentUser} />}
                {activeView === 'logistics' && <RetailLogisticsManager institutionId={institutionId} />}
                {activeView === 'reports' && (
                    <RetailReportsDashboard
                        institutionId={institutionId}
                        users={allUsers}
                        isEducation={isEducation}
                    />
                )}
                {activeView === 'cafe_menu' && <CafeMenuManager institutionId={institutionId} />}
                {activeView === 'config' && (
                    <StoreConfigManager
                        institutionId={institutionId}
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                    />
                )}
            </div>
        </div>
    );
}


