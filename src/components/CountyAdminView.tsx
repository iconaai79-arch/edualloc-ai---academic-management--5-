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
    AlertCircle, Info, ArrowRight, MoreVertical, X as XIcon,
    Upload, Image as ImageIcon, FileText, Palette, Globe, Building, Save, Award,
    PenTool, Check, Sparkles, Printer, Copy, CheckCheck, RefreshCw
} from 'lucide-react';

import { 
    BuildingOfficeIcon, ChartPieIcon, AcademicCapIcon, UserGroupIcon, 
    ArchiveBoxIcon, CurrencyIcon, Cog8ToothIcon, SparklesIcon, 
    ArrowRightOnRectangleIcon, ShieldIcon, PencilIcon, TruckIcon, 
    CheckCircleIcon, ChevronRightIcon, UserIcon, MapPinIcon, QrCodeIcon,
    PlusIcon, XIcon as CloseIcon, ArrowPathIcon
} from './icons';

import { ExternalModuleView } from './ExternalModuleView';
import { SmartInstitutionImporterModal } from './SmartInstitutionImporterModal';
import { SmartInventoryImporterModal } from './SmartInventoryImporterModal';
import { DisciplineManager } from './Academics/DisciplineManager';
import { AcademicReportsHub } from './Academics/AcademicReportsHub';
import { ActivityLogView } from './ActivityLogView';
import { apiService } from '../services/apiService';

interface CountyAdminViewProps {
    currentUser?: User;
    counties?: County[];
    institutions?: Institution[];
    users?: User[];
    onLogout?: () => void;
    onUpdateInstitution?: (id: string, data: Partial<Institution>) => void;
    onGenerateReceipt?: (data: any) => void;
    onUpdateCounty?: (id: string, data: Partial<County>) => void;
    onAddInstitution?: (data: any) => void;
    onLoginAsAdmin?: (institutionId: string) => void;
    onImportInstitutions?: (data: any[]) => void;
    onAddUser?: (data: any) => Promise<void>;
    onUpdateUser?: (id: string, data: any) => void;
    onDeleteUser?: (id: string) => void;
    inventoryItems?: CountyInventoryItem[];
    inventoryCategories?: CountyInventoryCategory[];
    onAddInventoryItem?: (data: any) => Promise<void>;
    onUpdateInventoryItem?: (id: string, data: any) => Promise<void>;
    onDeleteInventoryItem?: (id: string) => Promise<void>;
    onAddInventoryCategory?: (data: any) => Promise<void>;
    onUpdateInventoryCategory?: (id: string, data: any) => Promise<void>;
    onDeleteInventoryCategory?: (id: string) => Promise<void>;
    stores?: CountyStore[];
    onAddStore?: (data: any) => Promise<void>;
    onUpdateStore?: (id: string, data: any) => Promise<void>;
    onDeleteStore?: (id: string) => Promise<void>;
    onAddStockTransaction?: (data: any) => Promise<void>;
    stockTransactions?: StockTransaction[];
    bursaryApplications?: BursaryApplication[];
    bursaryFunds?: CountyBursaryFund[];
    onUpdateBursaryApplication?: (id: string, data: any) => Promise<void>;
    onAddBursaryFund?: (data: any) => Promise<void>;
    onUpdateBursaryFund?: (id: string, data: any) => Promise<void>;
    onDeleteBursaryFund?: (id: string) => Promise<void>;
    activityLog?: ActivityLog[];
    onLogAction?: (action: string) => void;
    incidents?: DisciplineIncident[];
    onAddIncident?: (data: any) => void;
    books?: Book[];
    assessments?: Assessment[];
    assessmentMarks?: AssessmentMark[];
    // Agrovet, Sacco, Law, DS props
    countyAgrovetInventory?: CoopAgrovetInventory[];
    countyAgrovetSales?: CoopAgrovetSales[];
    saccoAccounts?: SaccoAccount[];
    saccoTransactions?: SaccoTransaction[];
    coopPayouts?: CoopMonthlyPayout[];
    coopExpenses?: CoopExpense[];
    coopIncome?: CoopIncome[];
    lawClients?: LawClient[];
    lawMatters?: LawMatter[];
    lawDocuments?: LawDocument[];
    lawTimeEntries?: LawTimeEntry[];
    lawInvoices?: LawInvoice[];
    lawTrustTransactions?: LawTrustTransaction[];
    onAddLawClient?: (data: any) => void;
    onAddLawMatter?: (data: any) => void;
    onAddLawTimeEntry?: (data: any) => void;
    onAddLawTrustTransaction?: (data: any) => void;
    onAddLawInvoice?: (data: any) => void;
    onUpdateLawMatter?: (id: string, data: any) => void;
    lawAgreementTemplates?: LawAgreementTemplate[];
    lawAgreements?: LawAgreement[];
    onAddLawAgreementTemplate?: (data: any) => void;
    onGenerateLawAgreement?: (templateId: string, clientId: string, data: any) => void;
    onApproveLawAgreement?: (id: string) => void;
    dsInstructors?: DSInstructor[];
    dsVehicles?: DSVehicle[];
    dsStudents?: DSStudent[];
    dsLessons?: DSLesson[];
    dsMastery?: DSSkillMastery[];
    dsSettings?: DSSettings;
    onAddDSInstructor?: (data: any) => void;
    onAddDSVehicle?: (data: any) => void;
    onAddDSStudent?: (data: any) => void;
    onAddDSLesson?: (data: any) => void;
    onAddDSMastery?: (data: any) => void;
    onUpdateDSSettings?: (data: any) => void;
    onAddFarmer?: (data: any) => void;
    onUpdateFarmer?: (id: string, data: any) => void;
    onImportFarmers?: (data: any[]) => void;
    onLogCollection?: (data: any) => void;
    onImportCollections?: (data: any[]) => void;
    onBulkConfirmCollections?: (ids: string[]) => void;
    onAddRider?: (data: any) => void;
    onConfirmCollection?: (id: string) => void;
    onApproveCollection?: (id: string) => void;
    onAddCoopExpense?: (data: any) => void;
    onAddCoopIncome?: (data: any) => void;
    onInitiatePayouts?: (data: any) => void;
    onApprovePayouts?: (ids: string[]) => void;
    onDisbursePayouts?: (ids: string[]) => void;
    onAddPayouts?: (data: any) => void;
    onAccessAlumnaPortal?: (school: SchoolRegistry) => void;
    schoolRegistry?: SchoolRegistry[];
    activityLogLimit?: number;
    setActivityLogLimit?: React.Dispatch<React.SetStateAction<number>>;
    receiptLimit?: number;
    setReceiptLimit?: React.Dispatch<React.SetStateAction<number>>;
    transactionLimit?: number;
    setTransactionLimit?: React.Dispatch<React.SetStateAction<number>>;
}

export const CountyAdminView: React.FC<CountyAdminViewProps> = (props) => {
    const { 
        currentUser = { name: 'User', countyId: 'county_1' } as any, 
        counties = [], institutions = [], users = [], onLogout = () => {}, onUpdateInstitution, 
        onGenerateReceipt, onUpdateCounty, onAddInstitution, 
        onLoginAsAdmin, onImportInstitutions, onAddUser, onUpdateUser, onDeleteUser, 
        inventoryItems = [], inventoryCategories = [], onAddInventoryItem, onUpdateInventoryItem, 
        onDeleteInventoryItem, onAddInventoryCategory, onUpdateInventoryCategory, 
        onDeleteInventoryCategory, stores = [], onAddStore, onUpdateStore, onDeleteStore, 
        onAddStockTransaction, stockTransactions = [], bursaryApplications = [], bursaryFunds = [], 
        onUpdateBursaryApplication, onAddBursaryFund, onUpdateBursaryFund, 
        onDeleteBursaryFund, activityLog = [], onLogAction, incidents = [], onAddIncident, books = [],
        assessments = [], assessmentMarks = []
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

    const [settingsSubTab, setSettingsSubTab] = useState<'branding' | 'executive' | 'contact' | 'preview'>('branding');
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsSavedToast, setSettingsSavedToast] = useState(false);

    const [countySettingsForm, setCountySettingsForm] = useState({
        name: '',
        code: '',
        email: '',
        phoneNumber: '',
        adminName: '',
        governorName: '',
        deputyGovernorName: '',
        headquarters: '',
        address: '',
        postalCode: '',
        motto: '',
        website: '',
        primaryColor: '#4f46e5',
        secondaryColor: '#0f172a',
        logoUrl: '',
        letterheadUrl: '',
        sealUrl: '',
        stampUrl: '',
        signatureUrl: ''
    });

    const myCounty = useMemo(() => counties.find(c => 
        c.id === currentUser?.countyId || 
        c.id === currentUser?.institutionId || 
        c.code === currentUser?.countyId || 
        c.code === currentUser?.institutionId || 
        (c.name && currentUser?.institutionId && c.name.toLowerCase() === currentUser.institutionId.toLowerCase())
    ) || counties[0], [counties, currentUser]);

    useEffect(() => {
        if (myCounty) {
            setCountySettingsForm({
                name: myCounty.name || '',
                code: myCounty.code || '',
                email: myCounty.email || '',
                phoneNumber: myCounty.phoneNumber || '',
                adminName: myCounty.adminName || '',
                governorName: myCounty.governorName || '',
                deputyGovernorName: myCounty.deputyGovernorName || '',
                headquarters: myCounty.headquarters || '',
                address: myCounty.address || '',
                postalCode: myCounty.postalCode || '',
                motto: myCounty.motto || '',
                website: myCounty.website || '',
                primaryColor: myCounty.primaryColor || '#4f46e5',
                secondaryColor: myCounty.secondaryColor || '#0f172a',
                logoUrl: myCounty.logoUrl || '',
                letterheadUrl: myCounty.letterheadUrl || '',
                sealUrl: myCounty.sealUrl || '',
                stampUrl: myCounty.stampUrl || '',
                signatureUrl: myCounty.signatureUrl || ''
            });
        }
    }, [myCounty]);

    const handleBrandingFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logoUrl' | 'letterheadUrl' | 'sealUrl' | 'stampUrl' | 'signatureUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(fieldName);
        try {
            const path = `county-branding/${myCounty?.id || 'general'}/${fieldName}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const uploadedUrl = await apiService.uploadFile(file, 'eduai', path);
            if (uploadedUrl) {
                setCountySettingsForm(prev => ({ ...prev, [fieldName]: uploadedUrl }));
            }
        } catch (err) {
            console.error(`Failed to upload ${fieldName}:`, err);
            alert("Upload failed. Please try again.");
        } finally {
            setUploadingField(null);
        }
    };

    const handleSaveCountySettings = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!myCounty?.id) return;
        setIsSavingSettings(true);
        try {
            await onUpdateCounty?.(myCounty.id, countySettingsForm);
            onLogAction?.(`Updated county branding and configuration for ${countySettingsForm.name}`);
            setSettingsSavedToast(true);
            setTimeout(() => setSettingsSavedToast(false), 4000);
        } catch (err: any) {
            console.error("Failed to save county settings:", err);
            alert("Failed to save settings: " + (err.message || 'Unknown error'));
        } finally {
            setIsSavingSettings(false);
        }
    };
    const myInstitutions = useMemo(() => institutions.filter(inst => inst.countyId === myCounty?.id || (inst as any).county_id === myCounty?.id), [institutions, myCounty]);
    const myStaff = useMemo(() => users.filter(u => 
        (u.countyId === myCounty?.id || (u as any).county_id === myCounty?.id || u.institutionId === myCounty?.id) && 
        (u.role?.startsWith('county_') || u.role === 'county_admin' || u.role === 'county_staff')
    ), [users, myCounty]);
    const myInventory = useMemo(() => inventoryItems.filter(item => item.countyId === myCounty?.id || (item as any).county_id === myCounty?.id), [inventoryItems, myCounty]);
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
                await onUpdateUser?.(editingStaff.id, {
                    ...staffForm,
                    countyId: myCounty.id,
                    county_id: myCounty.id,
                    institutionId: myCounty.id
                });
                onLogAction?.(`Updated staff member: ${staffForm.name}`);
            } else {
                await onAddUser?.({
                    ...staffForm,
                    countyId: myCounty.id,
                    county_id: myCounty.id,
                    institutionId: myCounty.id,
                    status: 'active'
                });
                onLogAction?.(`Added new staff member: ${staffForm.name}`);
            }
            setShowStaffModal(false);
            setEditingStaff(null);
            setStaffForm({ name: '', email: '', phoneNumber: '', role: 'county_staff' as Role, staffId: '' });
        } catch (error: any) {
            console.error("Staff management error:", error);
            alert("Failed to save staff member: " + (error?.message || 'Unknown error'));
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
                            <img loading="lazy" src={myCounty.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
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
                                {myCounty.logoUrl && <img loading="lazy" src={myCounty.logoUrl} className="h-12 w-12 object-contain" alt="County Logo" />}
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
                                            <>
                                                {activityLog.slice(0, props.activityLogLimit || 8).map(log => (
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
                                                                    {log.timestamp ? new Date(log.timestamp)?.toLocaleString() : 'Recent'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {activityLog.length >= (props.activityLogLimit || 8) && (
                                                    <div className="p-6 text-center bg-slate-50/30">
                                                        <button 
                                                            onClick={() => props.setActivityLogLimit?.(prev => prev + 20)}
                                                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-2 mx-auto"
                                                        >
                                                            <ArrowPathIcon className="w-3 h-3" /> Sync More Activity
                                                        </button>
                                                    </div>
                                                )}
                                            </>
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
                                                KES {bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0)?.toLocaleString()}
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
                    </div>
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
                                                                <div className="text-[10px] font-bold text-slate-400">{users.find(u => u.id === app.studentId)?.email || 'No Email'}</div>
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
                                            incidents={incidents.filter(i => i.institutionId === perspectiveInstitution.id)}
                                            onAddIncident={async (incident) => { onAddIncident?.(incident); }}
                                            students={users.filter(u => u.institutionId === perspectiveInstitution.id && u.role === 'student')}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="space-y-8 animate-fade-in-up">
                                {/* Settings Header & Save Action Bar */}
                                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                                                <Palette className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                                                        County Branding & Settings
                                                    </h2>
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
                                                        Code: {countySettingsForm.code || myCounty.code || 'CTY'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-sm font-medium mt-0.5">
                                                    Configure official letterheads, logos, digital seals, and color themes for {countySettingsForm.name || myCounty.name}.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        {settingsSavedToast && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold animate-in fade-in zoom-in-95">
                                                <CheckCheck className="w-4 h-4 text-emerald-600" />
                                                Saved Successfully!
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleSaveCountySettings()}
                                            disabled={isSavingSettings}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                                        >
                                            {isSavingSettings ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" /> Save All Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Settings Sub-Navigation */}
                                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                                    <button
                                        onClick={() => setSettingsSubTab('branding')}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                            settingsSubTab === 'branding'
                                                ? 'bg-slate-900 text-white shadow-md'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        <Palette className="w-4 h-4" /> Branding & Letterhead
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('executive')}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                            settingsSubTab === 'executive'
                                                ? 'bg-slate-900 text-white shadow-md'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        <Award className="w-4 h-4" /> Executive & Signatories
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('contact')}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                            settingsSubTab === 'contact'
                                                ? 'bg-slate-900 text-white shadow-md'
                                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        <Building className="w-4 h-4" /> Contact & Location
                                    </button>
                                    <button
                                        onClick={() => setSettingsSubTab('preview')}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                            settingsSubTab === 'preview'
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" /> Live Document Preview
                                    </button>
                                </div>

                                {/* TAB 1: BRANDING & LETTERHEAD */}
                                {settingsSubTab === 'branding' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* County Official Logo Card */}
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Official County Logo</h3>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Primary crest or emblem used across portals and avatars.</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">PNG / SVG</span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                <div className="w-28 h-28 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden p-2 relative group">
                                                    {countySettingsForm.logoUrl ? (
                                                        <img src={countySettingsForm.logoUrl} alt="County Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <BuildingOfficeIcon className="w-12 h-12 text-slate-300" />
                                                    )}
                                                    {uploadingField === 'logoUrl' && (
                                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-3 w-full">
                                                    <div className="flex flex-wrap gap-2">
                                                        <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm">
                                                            <Upload className="w-4 h-4" />
                                                            {uploadingField === 'logoUrl' ? 'Uploading...' : 'Upload Logo'}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={e => handleBrandingFileUpload(e, 'logoUrl')}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        {countySettingsForm.logoUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setCountySettingsForm(prev => ({ ...prev, logoUrl: '' }))}
                                                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Direct Image URL</label>
                                                        <input
                                                            type="text"
                                                            value={countySettingsForm.logoUrl}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, logoUrl: e.target.value })}
                                                            placeholder="https://.../county-logo.png"
                                                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Official Coat of Arms / Seal Card */}
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Official Seal / Coat of Arms</h3>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Used for legal decrees, bursary certificates, and watermarks.</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">High-Res</span>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                <div className="w-28 h-28 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden p-2 relative">
                                                    {countySettingsForm.sealUrl ? (
                                                        <img src={countySettingsForm.sealUrl} alt="County Seal" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <ShieldIcon className="w-12 h-12 text-slate-300" />
                                                    )}
                                                    {uploadingField === 'sealUrl' && (
                                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-3 w-full">
                                                    <div className="flex flex-wrap gap-2">
                                                        <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm">
                                                            <Upload className="w-4 h-4" />
                                                            {uploadingField === 'sealUrl' ? 'Uploading...' : 'Upload Seal'}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={e => handleBrandingFileUpload(e, 'sealUrl')}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        {countySettingsForm.sealUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setCountySettingsForm(prev => ({ ...prev, sealUrl: '' }))}
                                                                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Direct Seal URL</label>
                                                        <input
                                                            type="text"
                                                            value={countySettingsForm.sealUrl}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, sealUrl: e.target.value })}
                                                            placeholder="https://.../county-seal.png"
                                                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Letterhead Header Banner (Full Width) */}
                                        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">County Letterhead Header Image / Banner</h3>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                        Banner graphic placed at the top of A4 circulars, bursary awards, statements, and procurement memos.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm">
                                                        <Upload className="w-4 h-4" />
                                                        {uploadingField === 'letterheadUrl' ? 'Uploading Banner...' : 'Upload Header Banner'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={e => handleBrandingFileUpload(e, 'letterheadUrl')}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                    {countySettingsForm.letterheadUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCountySettingsForm(prev => ({ ...prev, letterheadUrl: '' }))}
                                                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors"
                                                        >
                                                            Remove Banner
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                <div className="w-full h-40 rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden relative flex items-center justify-center">
                                                    {countySettingsForm.letterheadUrl ? (
                                                        <img
                                                            src={countySettingsForm.letterheadUrl}
                                                            alt="Letterhead Banner"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="text-center p-6 text-slate-400 space-y-2">
                                                            <FileText className="w-10 h-10 mx-auto text-slate-300" />
                                                            <div className="text-xs font-black uppercase tracking-wider">No Custom Letterhead Banner Configured</div>
                                                            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                                                                Recommended dimensions: 2480 x 380px. If left blank, standard county crest header typography will be generated automatically.
                                                            </p>
                                                        </div>
                                                    )}
                                                    {uploadingField === 'letterheadUrl' && (
                                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                                            <RefreshCw className="w-8 h-8 text-white animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-3">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Direct Banner Image URL</label>
                                                    <input
                                                        type="text"
                                                        value={countySettingsForm.letterheadUrl}
                                                        onChange={e => setCountySettingsForm({ ...countySettingsForm, letterheadUrl: e.target.value })}
                                                        placeholder="https://.../county-letterhead-banner.png"
                                                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Color Themes & Palettes */}
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Brand Color Palette</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Colors applied across county dashboard cards, badges, and banners.</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        Primary Brand Color
                                                    </label>
                                                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                                                        <input
                                                            type="color"
                                                            value={countySettingsForm.primaryColor}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, primaryColor: e.target.value })}
                                                            className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={countySettingsForm.primaryColor}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, primaryColor: e.target.value })}
                                                            className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        Secondary Accent Color
                                                    </label>
                                                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                                                        <input
                                                            type="color"
                                                            value={countySettingsForm.secondaryColor}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, secondaryColor: e.target.value })}
                                                            className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={countySettingsForm.secondaryColor}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, secondaryColor: e.target.value })}
                                                            className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Regional Government Palette Presets</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { name: 'Nairobi Green', primary: '#059669', sec: '#064e3b' },
                                                        { name: 'Royal Indigo', primary: '#4f46e5', sec: '#1e1b4b' },
                                                        { name: 'Mombasa Ocean', primary: '#0284c7', sec: '#0c4a6e' },
                                                        { name: 'Gold / Amber', primary: '#d97706', sec: '#78350f' },
                                                        { name: 'Crimson Flag', primary: '#dc2626', sec: '#7f1d1d' },
                                                        { name: 'Executive Slate', primary: '#334155', sec: '#0f172a' }
                                                    ].map(preset => (
                                                        <button
                                                            key={preset.name}
                                                            type="button"
                                                            onClick={() => setCountySettingsForm(prev => ({ ...prev, primaryColor: preset.primary, secondaryColor: preset.sec }))}
                                                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-[11px] font-bold flex items-center gap-1.5 bg-slate-50 transition-colors"
                                                        >
                                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                                                            {preset.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Motto & Official Website */}
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Motto & Official Web Portal</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Displayed on official documents and header bars.</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        County Motto / Slogan
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={countySettingsForm.motto}
                                                        onChange={e => setCountySettingsForm({ ...countySettingsForm, motto: e.target.value })}
                                                        placeholder="e.g. City of Peace and Prosperity"
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        Official County Website
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="url"
                                                            value={countySettingsForm.website}
                                                            onChange={e => setCountySettingsForm({ ...countySettingsForm, website: e.target.value })}
                                                            placeholder="https://county.go.ke"
                                                            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                        />
                                                        {countySettingsForm.website && (
                                                            <a
                                                                href={countySettingsForm.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 transition-colors"
                                                            >
                                                                <Globe className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: EXECUTIVE & SIGNATORIES */}
                                {settingsSubTab === 'executive' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Executive Leadership Details */}
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Executive Leadership</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Key officials listed on circulars and reports.</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        Governor's Full Name & Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={countySettingsForm.governorName}
                                                        onChange={e => setCountySettingsForm({ ...countySettingsForm, governorName: e.target.value })}
                                                        placeholder="H.E. The Governor"
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        Deputy Governor
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={countySettingsForm.deputyGovernorName}
                                                        onChange={e => setCountySettingsForm({ ...countySettingsForm, deputyGovernorName: e.target.value })}
                                                        placeholder="H.E. The Deputy Governor"
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                        County Secretary / Head of Public Service
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={countySettingsForm.adminName}
                                                        onChange={e => setCountySettingsForm({ ...countySettingsForm, adminName: e.target.value })}
                                                        placeholder="County Secretary / Chief Executive"
                                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Digital Stamp & Signature Uploaders */}
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Official Stamp & Signature</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Digital assets stamped on authorized bursary award letters.</p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Official Stamp */}
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                                                    <div className="w-24 h-24 mx-auto rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center p-2 overflow-hidden relative">
                                                        {countySettingsForm.stampUrl ? (
                                                            <img src={countySettingsForm.stampUrl} alt="County Stamp" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Award className="w-10 h-10 text-slate-300" />
                                                        )}
                                                        {uploadingField === 'stampUrl' && (
                                                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                                                <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="cursor-pointer inline-flex px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors items-center gap-1.5">
                                                        <Upload className="w-3.5 h-3.5" /> Upload Stamp
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={e => handleBrandingFileUpload(e, 'stampUrl')}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>

                                                {/* Authorized Signature */}
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                                                    <div className="w-full h-24 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center p-2 overflow-hidden relative">
                                                        {countySettingsForm.signatureUrl ? (
                                                            <img src={countySettingsForm.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <PenTool className="w-8 h-8 text-slate-300" />
                                                        )}
                                                        {uploadingField === 'signatureUrl' && (
                                                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                                                <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="cursor-pointer inline-flex px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors items-center gap-1.5">
                                                        <Upload className="w-3.5 h-3.5" /> Upload Signature
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={e => handleBrandingFileUpload(e, 'signatureUrl')}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: CONTACT & LOCATION */}
                                {settingsSubTab === 'contact' && (
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6 max-w-4xl">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">County Contact & Location</h3>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">Official postal, telephone, and headquarters physical location.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    County Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={countySettingsForm.name}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, name: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    County Code / ID No.
                                                </label>
                                                <input
                                                    type="text"
                                                    value={countySettingsForm.code}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, code: e.target.value })}
                                                    placeholder="047"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    Official Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={countySettingsForm.email}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, email: e.target.value })}
                                                    placeholder="info@county.go.ke"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    Phone / Switchboard Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={countySettingsForm.phoneNumber}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, phoneNumber: e.target.value })}
                                                    placeholder="+254 20 0000000"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    County Headquarters / Governor's Office Building
                                                </label>
                                                <input
                                                    type="text"
                                                    value={countySettingsForm.headquarters}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, headquarters: e.target.value })}
                                                    placeholder="e.g. City Hall Annex / County HQ"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    Physical Address / Street
                                                </label>
                                                <input
                                                    type="text"
                                                    value={countySettingsForm.address}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, address: e.target.value })}
                                                    placeholder="e.g. Mama Ngina Street, CBD"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                                    Postal Address & Postal Code
                                                </label>
                                                <input
                                                    type="text"
                                                    value={countySettingsForm.postalCode}
                                                    onChange={e => setCountySettingsForm({ ...countySettingsForm, postalCode: e.target.value })}
                                                    placeholder="e.g. P.O. Box 30075 - 00100, Nairobi"
                                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: LIVE DOCUMENT & LETTERHEAD PREVIEWER */}
                                {settingsSubTab === 'preview' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Official Letterhead Simulator</h3>
                                                <p className="text-xs text-slate-500 font-medium">Real-time preview of how official county letters, memos, and awards will render.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => window.print()}
                                                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2"
                                            >
                                                <Printer className="w-4 h-4" /> Print Sample A4
                                            </button>
                                        </div>

                                        {/* A4 Sheet Mockup */}
                                        <div className="max-w-3xl mx-auto bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-200 font-serif text-slate-900 space-y-8 min-h-[900px] relative">
                                            {/* Top Banner or Crest Header */}
                                            {countySettingsForm.letterheadUrl ? (
                                                <div className="w-full h-32 overflow-hidden rounded-xl">
                                                    <img src={countySettingsForm.letterheadUrl} alt="Letterhead" className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
                                                    <div className="flex items-center justify-center gap-4">
                                                        {countySettingsForm.sealUrl && (
                                                            <img src={countySettingsForm.sealUrl} alt="Seal" className="w-16 h-16 object-contain" />
                                                        )}
                                                        {countySettingsForm.logoUrl && !countySettingsForm.sealUrl && (
                                                            <img src={countySettingsForm.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                                                        )}
                                                        <div>
                                                            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">
                                                                {countySettingsForm.name || myCounty.name || 'COUNTY GOVERNMENT'}
                                                            </h1>
                                                            <p className="text-xs uppercase tracking-widest font-sans font-bold text-slate-600">
                                                                OFFICE OF THE COUNTY EXECUTIVE · DEPARTMENT OF EDUCATION & PUBLIC SERVICE
                                                            </p>
                                                            {countySettingsForm.motto && (
                                                                <p className="text-xs italic text-slate-500 font-sans mt-0.5">"{countySettingsForm.motto}"</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] font-sans text-slate-500 flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 border-t border-slate-200 mt-2">
                                                        {countySettingsForm.headquarters && <span><strong>HQ:</strong> {countySettingsForm.headquarters}</span>}
                                                        {countySettingsForm.postalCode && <span><strong>Postal:</strong> {countySettingsForm.postalCode}</span>}
                                                        {countySettingsForm.email && <span><strong>Email:</strong> {countySettingsForm.email}</span>}
                                                        {countySettingsForm.phoneNumber && <span><strong>Tel:</strong> {countySettingsForm.phoneNumber}</span>}
                                                        {countySettingsForm.website && <span><strong>Web:</strong> {countySettingsForm.website}</span>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reference Number and Date */}
                                            <div className="flex justify-between items-center text-xs font-sans font-bold text-slate-700">
                                                <div>
                                                    <span>Ref: </span>
                                                    <span className="font-mono">CTY/{countySettingsForm.code || '047'}/BURSARY/{new Date().getFullYear()}/0094</span>
                                                </div>
                                                <div>
                                                    <span>Date: </span>
                                                    <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                </div>
                                            </div>

                                            {/* Recipient & Subject */}
                                            <div className="font-sans space-y-2">
                                                <div className="text-xs font-bold uppercase text-slate-700">
                                                    TO: ALL WARD EDUCATION COMMITTEES & SUB-COUNTY DIRECTORS
                                                </div>
                                                <div className="text-sm font-black uppercase text-slate-900 border-b border-slate-300 pb-1">
                                                    SUBJECT: OFFICIAL DISBURSEMENT NOTIFICATION — COUNTY BURSARY & SCHOLARSHIP FUND
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="space-y-4 text-sm leading-relaxed text-slate-700 font-sans">
                                                <p>
                                                    The County Government of <strong>{countySettingsForm.name || myCounty.name}</strong> hereby notifies all educational institutions, schools, and bursary applicants that the fiscal vetting process for the academic cycle has been duly finalized.
                                                </p>
                                                <p>
                                                    All approved allocations will be dispatched directly to the mapped schools and institutions. Administrators may verify student allocations on the unified County Portal.
                                                </p>
                                            </div>

                                            {/* Signatory & Stamp Block */}
                                            <div className="pt-12 flex justify-between items-end">
                                                <div className="font-sans space-y-1">
                                                    {countySettingsForm.signatureUrl && (
                                                        <div className="w-36 h-14 mb-1">
                                                            <img src={countySettingsForm.signatureUrl} alt="Signature" className="w-full h-full object-contain object-left" />
                                                        </div>
                                                    )}
                                                    <div className="text-xs font-black uppercase text-slate-900">
                                                        {countySettingsForm.adminName || countySettingsForm.governorName || 'Authorized Signatory'}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                                                        County Secretary & Head of Public Service
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {countySettingsForm.name || myCounty.name}
                                                    </div>
                                                </div>

                                                {countySettingsForm.stampUrl && (
                                                    <div className="w-28 h-28 opacity-85 rotate-[-6deg]">
                                                        <img src={countySettingsForm.stampUrl} alt="Stamp" className="w-full h-full object-contain" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>

            {/* Staff Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    {editingStaff ? 'Edit Staff Member' : 'Register County Staff'}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    {myCounty.name} Administration
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowStaffModal(false); setEditingStaff(null); }}
                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <CloseIcon className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <form onSubmit={handleStaffSubmit} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={staffForm.name}
                                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                                    placeholder="e.g. Jane Mwangi"
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-sm outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Official Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={staffForm.email}
                                        onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                                        placeholder="jane@county.gov.ke"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={staffForm.phoneNumber}
                                        onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })}
                                        placeholder="+254700000000"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Staff / Employee ID
                                    </label>
                                    <input
                                        type="text"
                                        value={staffForm.staffId}
                                        onChange={e => setStaffForm({ ...staffForm, staffId: e.target.value })}
                                        placeholder="e.g. CTY/EDU/042"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        County Role
                                    </label>
                                    <select
                                        value={staffForm.role}
                                        onChange={e => setStaffForm({ ...staffForm, role: e.target.value as Role })}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-sm outline-none bg-white"
                                    >
                                        <option value="county_staff">County Staff Officer</option>
                                        <option value="county_admin">County Administrator</option>
                                        <option value="county_director">County Director</option>
                                        <option value="county_co">Chief Officer (CO)</option>
                                        <option value="county_cec">CECM Executive</option>
                                        <option value="county_secretary">County Secretary</option>
                                        <option value="county_store_keeper">County Store Keeper</option>
                                        <option value="county_driver">County Driver</option>
                                        <option value="county_teacher">County Education Officer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowStaffModal(false); setEditingStaff(null); }}
                                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 transition-colors"
                                >
                                    {editingStaff ? 'Save Changes' : 'Create Staff Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inventory Modal */}
            {showInventoryModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    {editingInventory ? 'Edit Inventory Item' : 'Add Central Inventory'}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    HQ Stock Management · {myCounty.name}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowInventoryModal(false); setEditingInventory(null); }}
                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <CloseIcon className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <form onSubmit={handleInventorySubmit} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Item Name / Description
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={inventoryForm.name}
                                    onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                                    placeholder="e.g. Textbooks (Grade 7 CBC), Desks, Medical Supplies"
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-sm outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={inventoryForm.category}
                                        onChange={e => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                                        placeholder="e.g. Education"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={inventoryForm.quantity}
                                        onChange={e => setInventoryForm({ ...inventoryForm, quantity: Number(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Unit
                                    </label>
                                    <input
                                        type="text"
                                        value={inventoryForm.unit}
                                        onChange={e => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                                        placeholder="Boxes / Pcs"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Supplier Name
                                    </label>
                                    <input
                                        type="text"
                                        value={inventoryForm.supplierName}
                                        onChange={e => setInventoryForm({ ...inventoryForm, supplierName: e.target.value })}
                                        placeholder="Supplier / Manufacturer"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Target Facility (Optional)
                                    </label>
                                    <select
                                        value={inventoryForm.targetInstitutionId}
                                        onChange={e => setInventoryForm({ ...inventoryForm, targetInstitutionId: e.target.value })}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none bg-white"
                                    >
                                        <option value="">-- Central Store (Hold at HQ) --</option>
                                        {myInstitutions.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowInventoryModal(false); setEditingInventory(null); }}
                                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 transition-colors"
                                >
                                    {editingInventory ? 'Save Changes' : 'Add Inventory Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Fund Modal */}
            {showFundModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    {editingFund ? 'Edit Bursary Fund' : 'New Bursary Fund'}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    Financial Aid Allocation · {myCounty.name}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowFundModal(false); setEditingFund(null); }}
                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <CloseIcon className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (editingFund) {
                                await onUpdateBursaryFund?.(editingFund.id, fundForm);
                            } else {
                                await onAddBursaryFund?.({ ...fundForm, countyId: myCounty.id, disbursedAmount: 0 });
                            }
                            setShowFundModal(false);
                            setEditingFund(null);
                        }} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Fund Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={fundForm.name}
                                    onChange={e => setFundForm({ ...fundForm, name: e.target.value })}
                                    placeholder="e.g. County Executive Bursary 2026/27"
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Budget (KES)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={fundForm.totalBudget}
                                        onChange={e => setFundForm({ ...fundForm, totalBudget: Number(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Fiscal Year
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={fundForm.year}
                                        onChange={e => setFundForm({ ...fundForm, year: Number(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Description / Guidelines
                                </label>
                                <textarea
                                    rows={3}
                                    value={fundForm.description}
                                    onChange={e => setFundForm({ ...fundForm, description: e.target.value })}
                                    placeholder="Eligibility criteria, target beneficiaries..."
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowFundModal(false); setEditingFund(null); }}
                                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 transition-colors"
                                >
                                    {editingFund ? 'Save Changes' : 'Create Fund'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Register Institution / Facility Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    Register Facility / Institution
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    Enroll new facility under {myCounty.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <CloseIcon className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formEl = e.currentTarget;
                            const fd = new FormData(formEl);
                            const newInst = {
                                name: fd.get('name') as string,
                                email: fd.get('email') as string,
                                phoneNumber: fd.get('phoneNumber') as string,
                                institutionType: fd.get('institutionType') as any,
                                category: fd.get('category') as string,
                                countyId: myCounty.id,
                                status: 'active'
                            };
                            await onAddInstitution?.(newInst);
                            setShowRegisterModal(false);
                        }} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                    Institution / Facility Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. County Central Hospital or St. Jude Academy"
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Sector Type
                                    </label>
                                    <select
                                        name="institutionType"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none bg-white"
                                    >
                                        <option value="Education">Education Sector (School/College)</option>
                                        <option value="HIS">Health Sector (Hospital/Clinic)</option>
                                        <option value="Cooperative">Agriculture / Cooperative</option>
                                        <option value="Business">County Business / Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Category / Level
                                    </label>
                                    <input
                                        type="text"
                                        name="category"
                                        placeholder="e.g. Primary School, Level 4 Hospital"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Official Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="admin@facility.co.ke"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        required
                                        placeholder="+254700000000"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-indigo-600 font-bold text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-200 transition-colors"
                                >
                                    Register Facility
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

