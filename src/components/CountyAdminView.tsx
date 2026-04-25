import { 
    User, Institution, County, AllocationRequest, Role, CountyInventoryItem, 
    CountyInventoryCategory, CountyStore, StockTransaction, BursaryApplication, 
    CountyBursaryFund, ActivityLog, MpesaTransaction, SchoolRegistry, 
    CoopAgrovetInventory, CoopAgrovetSales, SaccoAccount, SaccoTransaction, 
    CoopMonthlyPayout, CoopExpense, CoopIncome, LawClient, LawMatter, LawDocument, 
    LawTimeEntry, LawInvoice, LawTrustTransaction, LawAgreementTemplate, 
    LawAgreement, DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, 
    DSSettings, Department, Subject, DisciplineIncident, Book, Assessment, AssessmentMark
} from '../types';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    LayoutDashboard, School, Users, Package, Settings, Wallet, LogOut, Plus, 
    Search, Filter, FileDown, Eye, Edit, Trash2, Download, Bell, Calendar, 
    Briefcase, Shield, BarChart3, GraduationCap, Building2, CheckCircle2, 
    AlertCircle, Info, ArrowRight, MoreVertical, X as XIcon 
} from 'lucide-react';

import { 
    BuildingOfficeIcon, ChartPieIcon, AcademicCapIcon, UserGroupIcon, 
    ArchiveBoxIcon, CurrencyIcon, Cog8ToothIcon, SparklesIcon, 
    ArrowRightOnRectangleIcon, ShieldIcon, PencilIcon, TruckIcon, 
    CheckCircleIcon, ChevronRightIcon, UserIcon, MapPinIcon, QrCodeIcon,
    PlusIcon, XIcon as CloseIcon
} from './icons';

import { ExternalModuleView } from './ExternalModuleView';
import { SmartInstitutionImporterModal } from './SmartInstitutionImporterModal';
import { SmartInventoryImporterModal } from './SmartInventoryImporterModal';
import { DisciplineManager } from './Academics/DisciplineManager';
import { AcademicReportsHub } from './Academics/AcademicReportsHub';
import { ActivityLogView } from './ActivityLogView';
import { apiService } from '../services/apiService';

interface CountyAdminViewProps {
    currentUser: User;
    counties: County[];
    institutions: Institution[];
    users: User[];
    onLogout: () => void;
    onUpdateInstitution: (id: string, data: Partial<Institution>) => void;
    onAccessAlumnaPortal: (school: SchoolRegistry) => void;
    onGenerateReceipt: (data: any) => void;
    onUpdateCounty: (id: string, data: Partial<County>) => void;
    onAddInstitution: (data: any) => void;
    onLoginAsAdmin?: (institutionId: string) => void;
    onImportInstitutions: (data: any[]) => void;
    onAddUser: (data: any) => Promise<void>;
    onUpdateUser: (id: string, data: any) => void;
    onDeleteUser: (id: string) => void;
    inventoryItems: CountyInventoryItem[];
    inventoryCategories: CountyInventoryCategory[];
    onAddInventoryItem: (data: any) => Promise<void>;
    onUpdateInventoryItem: (id: string, data: any) => Promise<void>;
    onDeleteInventoryItem: (id: string) => Promise<void>;
    onAddInventoryCategory: (data: any) => Promise<void>;
    onUpdateInventoryCategory: (id: string, data: any) => Promise<void>;
    onDeleteInventoryCategory: (id: string) => Promise<void>;
    stores: CountyStore[];
    onAddStore: (data: any) => Promise<void>;
    onUpdateStore: (id: string, data: any) => Promise<void>;
    onDeleteStore: (id: string) => Promise<void>;
    onAddStockTransaction: (data: any) => Promise<void>;
    stockTransactions: StockTransaction[];
    bursaryApplications: BursaryApplication[];
    bursaryFunds: CountyBursaryFund[];
    onUpdateBursaryApplication: (id: string, data: any) => Promise<void>;
    onAddBursaryFund: (data: any) => Promise<void>;
    onUpdateBursaryFund: (id: string, data: any) => Promise<void>;
    onDeleteBursaryFund: (id: string) => Promise<void>;
    activityLog: ActivityLog[];
    onLogAction: (action: string) => void;
    incidents: DisciplineIncident[];
    onAddIncident: (data: any) => void;
    books: Book[];
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    // Agrovet, Sacco, Law, DS props
    countyAgrovetInventory: CoopAgrovetInventory[];
    countyAgrovetSales: CoopAgrovetSales[];
    saccoAccounts: SaccoAccount[];
    saccoTransactions: SaccoTransaction[];
    coopPayouts: CoopMonthlyPayout[];
    coopExpenses: CoopExpense[];
    coopIncome: CoopIncome[];
    lawClients: LawClient[];
    lawMatters: LawMatter[];
    lawDocuments: LawDocument[];
    lawTimeEntries: LawTimeEntry[];
    lawInvoices: LawInvoice[];
    lawTrustTransactions: LawTrustTransaction[];
    onAddLawClient: (data: any) => void;
    onAddLawMatter: (data: any) => void;
    onAddLawTimeEntry: (data: any) => void;
    onAddLawTrustTransaction: (data: any) => void;
    onAddLawInvoice: (data: any) => void;
    onUpdateLawMatter: (id: string, data: any) => void;
    lawAgreementTemplates: LawAgreementTemplate[];
    lawAgreements: LawAgreement[];
    onAddLawAgreementTemplate: (data: any) => void;
    onGenerateLawAgreement: (templateId: string, clientId: string, data: any) => void;
    onApproveLawAgreement: (id: string) => void;
    dsInstructors: DSInstructor[];
    dsVehicles: DSVehicle[];
    dsStudents: DSStudent[];
    dsLessons: DSLesson[];
    dsMastery: DSSkillMastery[];
    dsSettings: DSSettings;
    onAddDSInstructor: (data: any) => void;
    onAddDSVehicle: (data: any) => void;
    onAddDSStudent: (data: any) => void;
    onAddDSLesson: (data: any) => void;
    onAddDSMastery: (data: any) => void;
    onUpdateDSSettings: (data: any) => void;
    onAddFarmer: (data: any) => void;
    onUpdateFarmer: (id: string, data: any) => void;
    onImportFarmers: (data: any[]) => void;
    onLogCollection: (data: any) => void;
    onImportCollections: (data: any[]) => void;
    onBulkConfirmCollections: (ids: string[]) => void;
    onAddRider: (data: any) => void;
    onConfirmCollection: (id: string) => void;
    onApproveCollection: (id: string) => void;
    onAddCoopExpense: (data: any) => void;
    onAddCoopIncome: (data: any) => void;
    onInitiatePayouts: (data: any) => void;
    onApprovePayouts: (ids: string[]) => void;
    onDisbursePayouts: (ids: string[]) => void;
    onAddPayouts: (data: any) => void;
    onRunMigration?: () => Promise<void>;
}

export const CountyAdminView: React.FC<CountyAdminViewProps> = (props) => {
    const { 
        currentUser, counties, institutions, users, onLogout, onUpdateInstitution, 
        onAccessAlumnaPortal, onGenerateReceipt, onUpdateCounty, onAddInstitution, 
        onLoginAsAdmin, onImportInstitutions, onAddUser, onUpdateUser, onDeleteUser, 
        inventoryItems, inventoryCategories, onAddInventoryItem, onUpdateInventoryItem, 
        onDeleteInventoryItem, onAddInventoryCategory, onUpdateInventoryCategory, 
        onDeleteInventoryCategory, stores, onAddStore, onUpdateStore, onDeleteStore, 
        onAddStockTransaction, stockTransactions, bursaryApplications, bursaryFunds, 
        onUpdateBursaryApplication, onAddBursaryFund, onUpdateBursaryFund, 
        onDeleteBursaryFund, activityLog, onLogAction, incidents, onAddIncident, books,
        assessments, assessmentMarks
    } = props;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [subTab, setSubTab] = useState('overview');
    const [inventorySubTab, setInventorySubTab] = useState<'items' | 'categories' | 'stores' | 'dispatch' | 'reports'>('items');
    const [bursarySubTab, setBursarySubTab] = useState<'applications' | 'funds' | 'payouts' | 'vetting'>('applications');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState<CountyInventoryItem | null>(null);
    const [showInventoryImportModal, setShowInventoryImportModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<User | null>(null);
    const [editingInventory, setEditingInventory] = useState<CountyInventoryItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<CountyInventoryCategory | null>(null);
    const [editingStore, setEditingStore] = useState<CountyStore | null>(null);
    const [showBursaryModal, setShowBursaryModal] = useState(false);
    const [showFundModal, setShowFundModal] = useState(false);
    const [editingFund, setEditingFund] = useState<CountyBursaryFund | null>(null);
    const [selectedPerspective, setSelectedPerspective] = useState<'academic' | 'finance' | 'hr' | null>(null);
    const [perspectiveInstitution, setPerspectiveInstitution] = useState<Institution | null>(null);

    const [staffForm, setStaffForm] = useState({
        name: '', email: '', phoneNumber: '', role: 'county_staff' as Role, staffId: ''
    });

    const [inventoryForm, setInventoryForm] = useState({
        name: '', category: '', quantity: 1, unit: 'Units', supplierName: '',
        targetInstitutionId: '', deliveryMethod: 'driver' as 'driver' | 'parcel',
        driverName: '', trackingNumber: ''
    });

    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [storeForm, setStoreForm] = useState({ name: '', locationName: '', latitude: 0, longitude: 0, description: '' });

    const [fundForm, setFundForm] = useState({
        name: '', year: new Date().getFullYear(), totalBudget: 0, description: ''
    });

    const myCounty = useMemo(() => counties.find(c => c.id === currentUser.countyId) || counties[0], [counties, currentUser]);
    const myInstitutions = useMemo(() => institutions.filter(inst => inst.countyId === myCounty?.id), [institutions, myCounty]);
    const myStaff = useMemo(() => users.filter(u => u.countyId === myCounty?.id && u.role.startsWith('county_')), [users, myCounty]);
    const myInventory = useMemo(() => inventoryItems.filter(item => item.countyId === myCounty?.id), [inventoryItems, myCounty]);
    const totalStudents = useMemo(() => users.filter(u => u.role === 'student' && myInstitutions.some(inst => inst.id === u.institutionId)).length, [users, myInstitutions]);

    if (!myCounty) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
                    <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">County Not Found</h2>
                    <p className="text-slate-500 mb-8 max-w-xs mx-auto">You are not correctly assigned to a county. Please contact system administration.</p>
                    <button 
                        onClick={onLogout} 
                        className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    const formatRole = (role: string) => role.replace('county_', '').replace('_', ' ');

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStaff) {
                await onUpdateUser?.(editingStaff.id, staffForm);
                onLogAction?.(`Updated staff member: ${staffForm.name}`);
            } else {
                await onAddUser?.({ ...staffForm, countyId: myCounty.id });
                onLogAction?.(`Added new staff member: ${staffForm.name}`);
            }
            setShowStaffModal(false);
        } catch (error) {
            console.error("Staff management error:", error);
        }
    };

    const handleInventorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingInventory) {
                await onUpdateInventoryItem?.(editingInventory.id, inventoryForm);
                onLogAction?.(`Updated inventory item: ${inventoryForm.name}`);
            } else {
                await onAddInventoryItem?.({ 
                    ...inventoryForm, 
                    countyId: myCounty.id, 
                    status: 'at_hq',
                    recordedAt: new Date().toISOString()
                });
                onLogAction?.(`Logged HQ receipt: ${inventoryForm.name}`);
            }
            setShowInventoryModal(false);
        } catch (error) {
            console.error("Inventory error:", error);
        }
    };

    const handleDispatch = async (item: CountyInventoryItem) => {
        if (!item.targetInstitutionId) {
            alert("Please edit the item to set a target institution first.");
            return;
        }
        if (window.confirm(`Dispatch ${item.name} to ${institutions.find(i => i.id === item.targetInstitutionId)?.name}?`)) {
            await onUpdateInventoryItem?.(item.id, { ...item, status: 'in_transit', dispatchedAt: new Date().toISOString() });
            onLogAction?.(`Dispatched item: ${item.name}`);
        }
    };

    const openPerspectiveSelection = (inst: Institution) => {
        setPerspectiveInstitution(inst);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-black/20 overflow-hidden border border-white/10">
                        {myCounty.logoUrl ? (
                            <img src={myCounty.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                            <BuildingOfficeIcon className="w-6 h-6 text-white" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight">County Portal</h1>
                        <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">
                            {myCounty.name}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard'
                                ? 'text-white shadow-lg shadow-black/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                            style={{ backgroundColor: activeTab === 'dashboard' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                        >
                            <ChartPieIcon className="w-5 h-5" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('institutions')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'institutions'
                                ? 'text-white shadow-lg shadow-black/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                            style={{ backgroundColor: activeTab === 'institutions' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                        >
                            <AcademicCapIcon className="w-5 h-5" />
                            Institutions
                            <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full">
                                {myInstitutions.length}
                            </span>
                        </button>
                    {currentUser.role !== 'county_store_keeper' && (
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'staff'
                                ? 'text-white shadow-lg shadow-black/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                            style={{ backgroundColor: activeTab === 'staff' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                        >
                            <UserGroupIcon className="w-5 h-5" />
                            County Staff
                            <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full">
                                {myStaff.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory'
                            ? 'text-white shadow-lg shadow-black/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                        style={{ backgroundColor: activeTab === 'inventory' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                    >
                        <ArchiveBoxIcon className="w-5 h-5" />
                        Inventory
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full">
                            {inventoryItems.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('bursaries')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'bursaries'
                            ? 'text-white shadow-lg shadow-black/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                        style={{ backgroundColor: activeTab === 'bursaries' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                    >
                        <CurrencyIcon className="w-5 h-5" />
                        Bursaries
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full">
                            {bursaryApplications.filter(a => a.status === 'pending').length}
                        </span>
                    </button>
                    {currentUser.role !== 'county_store_keeper' && (
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings'
                                ? 'text-white shadow-lg shadow-black/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                            style={{ backgroundColor: activeTab === 'settings' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                        >
                            <Cog8ToothIcon className="w-5 h-5" />
                            Settings
                        </button>
                    )}
                    {currentUser.role === 'super_admin' && (
                        <button
                            onClick={() => setActiveTab('external_module')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'external_module'
                                ? 'text-white shadow-lg shadow-black/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                            style={{ backgroundColor: activeTab === 'external_module' ? 'var(--brand-primary, #4f46e5)' : undefined }}
                        >
                            <SparklesIcon className="w-5 h-5" />
                            External
                        </button>
                    )}
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <span className="font-bold text-indigo-300">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-8">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="mb-8">
                            <div className="flex items-center gap-4 mb-2">
                                {myCounty.logoUrl && <img src={myCounty.logoUrl} className="h-12 w-12 object-contain" alt="County Logo" />}
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    {myCounty.name} Overview
                                </h2>
                            </div>
                            {myCounty.motto && (
                                <p 
                                    className="font-black italic uppercase tracking-widest text-[10px] mb-2 px-2 border-l-2"
                                    style={{ color: 'var(--brand-primary, #4f46e5)', borderColor: 'var(--brand-primary, #4f46e5)' }}
                                >
                                    "{myCounty.motto}"
                                </p>
                            )}
                            <p className="text-slate-500 font-medium">
                                Manage education resources for county code: {myCounty.code} {myCounty.website && <>| <a href={myCounty.website} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: 'var(--brand-primary, #4f46e5)' }}>{myCounty.website}</a></>}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <AcademicCapIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{myInstitutions.length}</h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Registered Schools</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{totalStudents}</h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Active Students</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                                        <CurrencyIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bursary</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">
                                    {bursaryApplications.filter(a => a.status === 'vetted' || a.status === 'approved').length}
                                </h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Ready for Payout</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                                        <ShieldIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Claims</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">
                                    {bursaryApplications.filter(a => a.status === 'pending').length}
                                </h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Pending Vetting</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                            <SparklesIcon className="w-6 h-6" style={{ color: 'var(--brand-primary, #4f46e5)' }} />
                                            Recent System Activity
                                        </h3>
                                        <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            Live Trail
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {activityLog.length > 0 ? (
                                            activityLog.slice(0, 8).map(log => (
                                                <div key={log.id} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 font-bold border border-slate-200">
                                                        {(log.userName || 'U').charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-slate-900">{log.action}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--brand-primary, #4f46e5)' }}>{log.userName || 'System'}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">[{log.institutionName || 'SYSTEM'}]</span>
                                                            <span className="text-[9px] text-slate-400">•</span>
                                                            <span className="text-[9px] text-slate-400 uppercase font-medium">
                                                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-12 text-center">
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No recent activity recorded.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <CurrencyIcon className="w-32 h-32" />
                                    </div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 font-mono" style={{ color: 'var(--brand-primary, #4f46e5)' }}>Financial Snapshot</h4>
                                    <div className="space-y-6 relative z-10">
                                        <div>
                                            <p className="text-3xl font-black tracking-tight">
                                                KES {bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Allocated Budget</p>
                                        </div>
                                        <div className="pt-6 border-t border-white/10">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disbursement Progress</span>
                                                <span className="text-xs font-black" style={{ color: 'var(--brand-primary, #4f46e5)' }}>
                                                    {Math.round((bursaryFunds.reduce((acc, f) => acc + (f.allocatedAmount || 0), 0) / (bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0) || 1)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${(bursaryFunds.reduce((acc, f) => acc + (f.allocatedAmount || 0), 0) / (bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0) || 1)) * 100}%`, backgroundColor: 'var(--brand-primary, #4f46e5)' }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setActiveTab('bursaries'); setBursarySubTab('funds'); }}
                                            className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-4 border border-slate-100"
                                            style={{ color: 'var(--brand-primary, #4f46e5)' }}
                                        >
                                            Manage Funds
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Quick Actions</h4>
                                    <div className="space-y-3">
                                        <button onClick={() => setShowRegisterModal(true)} className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 flex items-center gap-3 group text-left">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: `${myCounty.primaryColor || '#4f46e5'}20`, color: myCounty.primaryColor || '#4f46e5' }}>
                                                <PlusIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase">Register School</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Add to county registry</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { setActiveTab('bursaries'); setBursarySubTab('vetting'); }} className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 flex items-center gap-3 group text-left">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <ShieldIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase">Vetting Board</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Review applications</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'institutions' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    Institutions
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Schools and colleges within {myCounty.name}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
                                >
                                    <SparklesIcon className="w-5 h-5 text-indigo-400" /> Bulk Import
                                </button>
                                <button
                                    onClick={() => setShowRegisterModal(true)}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                >
                                    <PlusIcon className="w-5 h-5 text-white" /> Register New
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Institution</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type & Code</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {myInstitutions.map(inst => (
                                            <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                            🏫
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{inst.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">{inst.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700 uppercase">{inst.institutionType}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{inst.institutionCode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                            <span className="opacity-70 text-[10px]">📧</span> {inst.email}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                            <span className="opacity-70 text-[10px]">📞</span> {inst.phoneNumber}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        inst.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {inst.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openPerspectiveSelection(inst)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                                        title="Perspective View"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => onLoginAsAdmin && onLoginAsAdmin(inst.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                                    >
                                                        Enter Portal
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {myInstitutions.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center">
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No institutions found in this county.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    County Staff
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Manage administrators and support staff for {myCounty.name}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingStaff(null);
                                    setStaffForm({ name: '', email: '', phoneNumber: '', role: 'county_staff', staffId: '' });
                                    setShowStaffModal(true);
                                }}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5 text-white" /> Add Staff Member
                            </button>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role & ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {myStaff.map(staff => (
                                            <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
                                                            👤
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{staff.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">{staff.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${staff.role === 'county_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {formatRole(staff.role)}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400 mt-1">{staff.staffId || 'No ID'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs font-medium text-slate-600">{staff.phoneNumber || 'No Phone'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingStaff(staff);
                                                                setStaffForm({
                                                                    name: staff.name,
                                                                    email: staff.email,
                                                                    phoneNumber: staff.phoneNumber || '',
                                                                    role: staff.role,
                                                                    staffId: staff.staffId || ''
                                                                });
                                                                setShowStaffModal(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        {staff.id !== currentUser.id && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm("Remove this staff member?")) {
                                                                        await onDeleteUser?.(staff.id);
                                                                        onLogAction?.(`Removed staff member: ${staff.name}`);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <CloseIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    County Inventory
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Manage supplies from HQ to schools via drivers and parcels
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {inventorySubTab === 'items' && (
                                    <>
                                        <button
                                            onClick={() => setShowInventoryImportModal(true)}
                                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-5 h-5 text-indigo-400" /> Bulk Import
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingInventory(null);
                                                setInventoryForm({
                                                    name: '', category: '', quantity: 1, unit: 'Units',
                                                    supplierName: '', targetInstitutionId: '',
                                                    deliveryMethod: 'driver', driverName: '', trackingNumber: ''
                                                });
                                                setShowInventoryModal(true);
                                            }}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-5 h-5 text-white" /> Log HQ Receipt
                                        </button>
                                    </>
                                )}
                                {inventorySubTab === 'categories' && (
                                    <button
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setCategoryForm({ name: '', description: '' });
                                            setShowCategoryModal(true);
                                        }}
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-5 h-5 text-white" /> New Category
                                    </button>
                                )}
                                {inventorySubTab === 'stores' && (
                                    <button
                                        onClick={() => {
                                            setEditingStore(null);
                                            setStoreForm({ name: '', locationName: '', latitude: 0, longitude: 0, description: '' });
                                            setShowStoreModal(true);
                                        }}
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-5 h-5 text-white" /> Add Store/Location
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 p-1.5 bg-slate-100 rounded-2xl w-fit mb-8">
                            <button
                                onClick={() => setInventorySubTab('items')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'items'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Inventory Items
                            </button>
                            <button
                                onClick={() => setInventorySubTab('categories')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'categories'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Categories
                            </button>
                            <button
                                onClick={() => setInventorySubTab('stores')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'stores'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Stores & Locations
                            </button>
                            <button
                                onClick={() => setInventorySubTab('dispatch')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'dispatch'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Dispatch Log
                            </button>
                            <button
                                onClick={() => setInventorySubTab('reports')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'reports'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Analytics & Reports
                            </button>
                        </div>

                        {inventorySubTab === 'items' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                                            <ArchiveBoxIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-900">{myInventory.filter(i => i.status === 'at_hq').length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">At Headquarters</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                            <TruckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-900">{myInventory.filter(i => i.status === 'in_transit').length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Transit</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                            <CheckCircleIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-900">{myInventory.filter(i => i.status === 'received').length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivered</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Detail</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status & Path</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {myInventory.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                                    <ArchiveBoxIcon className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity} {item.unit} • {item.category}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${item.status === 'at_hq' ? 'bg-slate-100 text-slate-600' :
                                                                    item.status === 'in_transit' ? 'bg-indigo-100 text-indigo-700' :
                                                                        'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                    {item.status.replace('_', ' ')}
                                                                </span>
                                                                <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1 uppercase tracking-tight">
                                                                    HQ <ChevronRightIcon className="w-3 h-3" /> {institutions.find(inst => inst.id === item.targetInstitutionId)?.name || 'Pending Destination'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                                    {item.deliveryMethod === 'driver' ? <UserIcon className="w-3 h-3" /> : <MapPinIcon className="w-3 h-3" />}
                                                                    {item.deliveryMethod === 'driver' ? (item.driverName || 'No Driver') : (item.trackingNumber || 'No Parcel ID')}
                                                                </div>
                                                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                                                    {item.deliveryMethod} delivery
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {item.status === 'at_hq' && (
                                                                    <button
                                                                        onClick={() => handleDispatch(item)}
                                                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-sm"
                                                                    >
                                                                        Dispatch
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setShowQrModal(item)}
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                                    title="View QR Code"
                                                                >
                                                                    <QrCodeIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingInventory(item);
                                                                        setInventoryForm({
                                                                            name: item.name,
                                                                            category: item.category,
                                                                            quantity: item.quantity,
                                                                            unit: item.unit,
                                                                            supplierName: item.supplierName,
                                                                            targetInstitutionId: item.targetInstitutionId || '',
                                                                            deliveryMethod: item.deliveryMethod,
                                                                            driverName: item.driverName || '',
                                                                            trackingNumber: item.trackingNumber || ''
                                                                        });
                                                                        setShowInventoryModal(true);
                                                                    }}
                                                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm("Delete this inventory record?")) {
                                                                            await onDeleteInventoryItem?.(item.id);
                                                                            onLogAction?.(`Deleted inventory item: ${item.name}`);
                                                                        }
                                                                    }}
                                                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                                >
                                                                    <CloseIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                        {activeTab === 'bursaries' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Bursary Management</h2>
                                        <p className="text-slate-500 font-medium">Coordinate scholarship funds and verify student applications</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => { setEditingFund(null); setFundForm({ name: '', year: new Date().getFullYear(), totalBudget: 0, description: '' }); setShowFundModal(true); }}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-5 h-5" /> Initialize Fund
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-1.5 bg-slate-100 rounded-2xl w-fit mb-8">
                                    {['applications', 'funds', 'vetting', 'payouts'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setBursarySubTab(tab as any)}
                                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${bursarySubTab === tab 
                                                ? 'bg-white text-indigo-600 shadow-sm' 
                                                : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {bursarySubTab === 'applications' && (
                                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Institution</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {bursaryApplications.map(app => (
                                                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{app.studentName}</div>
                                                                <div className="text-[10px] font-bold text-slate-400">{app.studentEmail}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                                                {app.institutionName}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                    app.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                                                    app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                    {app.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button 
                                                                    onClick={() => onUpdateBursaryApplication?.(app.id, { status: 'vetted' })}
                                                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                                                                >
                                                                    Vette
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'academic_view' && perspectiveInstitution && (
                            <div className="space-y-8 animate-fade-in-up">
                                <button onClick={() => { setActiveTab('institutions'); setPerspectiveInstitution(null); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest mb-4">
                                    <ArrowRight className="w-4 h-4 rotate-180" /> Back to Institutions
                                </button>
                                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{perspectiveInstitution.name}</h2>
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Academic Perspective</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <AcademicReportsHub 
                                            institutionId={perspectiveInstitution.id}
                                            assessments={assessments.filter(a => a.institutionId === perspectiveInstitution.id)}
                                            marks={assessmentMarks.filter(m => m.institutionId === perspectiveInstitution.id)}
                                            subjects={[]} // Should pass subjects
                                            students={users.filter(u => u.institutionId === perspectiveInstitution.id && u.role === 'student')}
                                        />
                                        <DisciplineManager 
                                            institutionId={perspectiveInstitution.id}
                                            incidents={incidents.filter(i => i.institutionId === perspectiveInstitution.id)}
                                            onAddIncident={onAddIncident}
                                            students={users.filter(u => u.institutionId === perspectiveInstitution.id && u.role === 'student')}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                                {activeTab === 'settings' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Database Management</h3>
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-500">Update the database schema to support the latest features (e.g. Alumni Post images).</p>
                                        <button 
                                            onClick={props.onRunMigration}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-4 h-4" /> Run Alumni Schema Migration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ... modals and other sections will be added back from chunks */}
            </main>

            {perspectiveInstitution && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-12">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">View Perspective</h2>
                                    <p className="text-slate-500 font-medium">Select a department to view {perspectiveInstitution.name}'s operations.</p>
                                </div>
                                <button onClick={() => setPerspectiveInstitution(null)} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                                    <CloseIcon className="w-6 h-6 text-slate-900" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <button 
                                    onClick={() => { setSelectedPerspective('academic'); setActiveTab('academic_view'); }}
                                    className="p-8 rounded-[2.5rem] bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-100 transition-all group text-left"
                                >
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-indigo-600 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                        <AcademicCapIcon className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Academics</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">View results, timetables, and teacher performance metrics.</p>
                                </button>
                                <button 
                                    onClick={() => { setSelectedPerspective('finance'); setActiveTab('finance_view'); }}
                                    className="p-8 rounded-[2.5rem] bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-100 transition-all group text-left"
                                >
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-600 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                        <CurrencyIcon className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Finance</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">Review fee collections, bursary disbursements and budgets.</p>
                                </button>
                                <button 
                                    onClick={() => { setSelectedPerspective('hr'); setActiveTab('hr_view'); }}
                                    className="p-8 rounded-[2.5rem] bg-amber-50 hover:bg-amber-100 border-2 border-amber-100 transition-all group text-left"
                                >
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-amber-600 mb-6 shadow-sm group-hover:scale-110 transition-transform">
                                        <UserGroupIcon className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">HR & Staff</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">Monitor staff attendance, contracts, and payroll data.</p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
