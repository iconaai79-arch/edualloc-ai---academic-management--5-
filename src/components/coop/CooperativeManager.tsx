
import React, { useState, useMemo } from 'react';
import { 
    Users as UsersIcon, 
    ClipboardList as CollectionIcon, 
    Truck as LogisticsIcon, 
    PieChart as ReportsIcon,
    Plus as PlusIcon,
    Search as SearchIcon,
    Filter as FilterIcon,
    CheckCircle2 as SuccessIcon,
    AlertCircle as AlertIcon,
    ChevronRight as ChevronRightIcon,
    ShoppingCart as StoreIcon,
    CreditCard as SaccoIcon,
    Banknote as PayoutIcon,
    Leaf as FarmerIcon,
    DollarSign as FinanceIcon,
    UserCheck as ApprovalIcon,
    FileText as StatementIcon,
    Mail as EmailIcon,
    Send as SmsIcon,
    Eye as EyeIcon,
    ArrowUpRight as ExportIcon,
    Settings as CogIcon,
    UploadCloud,
    X
} from 'lucide-react';
import { SettingsManager } from '../SettingsManager';
import { CommunicationsManager } from '../CommunicationsManager';
import { SmartFarmerImporterModal } from './SmartFarmerImporterModal';
import { SmartCollectionImporterModal } from './SmartCollectionImporterModal';
import * as pdfService from '../../services/pdfService';
import { apiService } from '../../services/apiService';
import { 
    CoopFarmer, 
    CoopCollection, 
    CoopRider, 
    User,
    Institution,
    CoopAgrovetInventory,
    CoopAgrovetSales,
    SaccoAccount,
    CoopMonthlyPayout,
    SaccoTransaction,
    CoopExpense,
    CoopIncome
} from '../../types';

const dataUriToBlob = (dataUri: string) => {
    const byteString = atob(dataUri.split(',')[1]);
    const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
};

interface CooperativeManagerProps {
    farmers: CoopFarmer[];
    collections: CoopCollection[];
    riders: CoopRider[];
    currentUser: User;
    inventory: CoopAgrovetInventory[];
    sales: CoopAgrovetSales[];
    saccoAccounts: SaccoAccount[];
    payouts: CoopMonthlyPayout[];
    expenses: CoopExpense[];
    income: CoopIncome[];
    onAddFarmer: (data: Partial<CoopFarmer>) => Promise<void>;
    onImportFarmers?: (data: Partial<CoopFarmer>[]) => Promise<void>;
    onUpdateFarmer: (id: string, data: Partial<CoopFarmer>) => Promise<void>;
    onLogCollection: (data: Partial<CoopCollection>) => Promise<void>;
    onImportCollections?: (data: Partial<CoopCollection>[]) => Promise<void>;
    onBulkConfirmCollections?: (riderId: string, collections: CoopCollection[]) => Promise<void>;
    onAddRider: (data: Partial<CoopRider>) => Promise<void>;
    onConfirmCollection?: (id: string, qty: number) => Promise<void>;
    onApproveCollection?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddExpense?: (data: Partial<CoopExpense>) => Promise<void>;
    onAddIncome?: (data: Partial<CoopIncome>) => Promise<void>;
    onLogAction?: (action: string) => Promise<void>;
    onInitiatePayouts?: (payoutIds: string[]) => Promise<void>;
    onApprovePayouts?: (payoutIds: string[]) => Promise<void>;
    onAddPayouts?: (payouts: any[]) => Promise<void>;
    onAddInventory?: (data: any) => Promise<void>;
    onAddSale?: (data: any) => Promise<void>;
    currentInstitution?: Institution | null;
    activeTab?: 'overview' | 'farmers' | 'collections' | 'logistics' | 'agrovet' | 'sacco' | 'payouts' | 'finances' | 'approvals' | 'reports' | 'communication' | 'settings';
    onTabChange?: (tab: string) => void;
    onUpdateInstitution?: (id: string, data: any) => Promise<void> | void;
    onUpdateLogo?: (url: string | null) => void;
    onUpdateFooterImage?: (url: string | null) => void;
    onSaveLetterheadConfig?: (config: any) => void;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    companyDetails?: any;
    onUpdateCompanyDetails?: (details: any) => Promise<void>;
    letterheadConfig?: any;
    users?: User[];
    onAddUser?: (userData: any) => Promise<void>;
    onEditUser?: (userId: string, data: any) => Promise<void>;
    onDeleteUser?: (userId: string) => Promise<void>;
    onImportUsers?: (users: any[]) => Promise<void>;
    smsConfig?: any;
    departments?: any[];
    subjects?: any[];
    courses?: any[];
    onImportStudents?: (students: any[]) => Promise<void>;
    onWithdrawRequest?: (requestId: string) => Promise<void>;
    onAddExtensionRequest?: (reason: string) => void;
    onAddInventory?: (data: Partial<CoopAgrovetInventory>) => Promise<void>;
    onAddSale?: (data: Partial<CoopAgrovetSales>) => Promise<void>;
}

export const CooperativeManager: React.FC<CooperativeManagerProps> = ({
    farmers = [],
    collections = [],
    riders = [],
    currentUser,
    inventory = [],
    sales = [],
    saccoAccounts = [],
    payouts = [],
    expenses = [],
    income = [],
    onAddFarmer,
    onImportFarmers,
    onUpdateFarmer,
    onLogCollection,
    onImportCollections,
    onAddRider,
    onConfirmCollection,
    onApproveCollection,
    onAddExpense,
    onAddIncome,
    onLogAction,
    onInitiatePayouts,
    onApprovePayouts,
    onAddPayouts,
    currentInstitution,
    activeTab: externalActiveTab,
    onTabChange,
    onUpdateInstitution,
    onUpdateLogo,
    onUpdateFooterImage,
    onSaveLetterheadConfig,
    logoUrl,
    footerImageUrl,
    companyDetails,
    onUpdateCompanyDetails,
    letterheadConfig,
    users = [],
    onAddUser,
    onEditUser,
    onDeleteUser,
    onImportUsers,
    onBulkConfirmCollections,
    smsConfig = { provider: 'at', apiKey: '', username: '', senderId: '' },
    departments = [],
    subjects = [],
    courses = [],
    onImportStudents,
    onWithdrawRequest,
    onAddExtensionRequest,
    onAddInventory,
    onAddSale
}) => {
    const [localActiveSubTab, setLocalActiveSubTab] = useState<'overview' | 'farmers' | 'collections' | 'logistics' | 'agrovet' | 'sacco' | 'payouts' | 'finances' | 'approvals' | 'reports' | 'communication' | 'settings'>('overview');
    const [farmerSubTab, setFarmerSubTab] = useState<'registry' | 'collections' | 'logistics' | 'payouts'>('registry');
    
    const activeSubTab = externalActiveTab || localActiveSubTab;
    const setActiveSubTab = (tab: any) => {
        if (onTabChange) onTabChange(tab);
        else setLocalActiveSubTab(tab);        // Reset farmer sub-tab when navigating away from farmers section
        if (tab !== 'farmers' && tab !== 'payouts' && tab !== 'logistics' && tab !== 'collections') {
            setFarmerSubTab('registry');
        }
    };

    // Sync farmer sub-tab with active sub-tab for deep links
    React.useEffect(() => {
        if (activeSubTab === 'payouts') setFarmerSubTab('payouts');
        if (activeSubTab === 'logistics') setFarmerSubTab('logistics');
        if (activeSubTab === 'collections') setFarmerSubTab('collections');
    }, [activeSubTab]);

    const [payoutRate, setPayoutRate] = useState<number>(50); // Default rate KES 50 per Unit
    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [reportSubTab, setReportSubTab] = useState<'overview' | 'payouts' | 'ledger' | 'statements'>('overview');
    const [isAddingFarmer, setIsAddingFarmer] = useState(false);
    const [isLoggingCollection, setIsLoggingCollection] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCollectionImportModal, setShowCollectionImportModal] = useState(false);
    const [newFarmer, setNewFarmer] = useState<Partial<CoopFarmer>>({
        status: 'active',
        joinedAt: new Date().toISOString().split('T')[0]
    });
    const [newCollection, setNewCollection] = useState<Partial<CoopCollection>>({
        collectionDate: new Date().toISOString().split('T')[0],
        productType: 'milk',
        unit: 'kgs',
        factoryConfirmed: false,
        notified: false
    });
    const [newRider, setNewRider] = useState<Partial<CoopRider>>({
        status: 'active'
    });
    const [isAddingInventory, setIsAddingInventory] = useState(false);
    const [isRecordingSale, setIsRecordingSale] = useState(false);
    const [isAddingRider, setIsAddingRider] = useState(false);
    const [newInventory, setNewInventory] = useState<any>({});
    const [newSale, setNewSale] = useState<Partial<CoopAgrovetSales>>({
        saleDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'cash'
    });
    const [editingFarmer, setEditingFarmer] = useState<CoopFarmer | null>(null);
    const [riderVolumes, setRiderVolumes] = useState<Record<string, string>>({});
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

    const handleSubmitFarmer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFarmer.name || !newFarmer.phone || !newFarmer.accountNumber || !newFarmer.memberId) {
            alert("Please fill in Name, Phone, Account Number and Member ID");
            return;
        }
        setIsProcessing(true);
        try {
            await onAddFarmer({
                ...newFarmer,
                id: `f_${Date.now()}`,
                institutionId: currentInstitution?.id || ''
            });
            setIsAddingFarmer(false);
            setNewFarmer({ status: 'active', joinedAt: new Date().toISOString().split('T')[0] });
        } catch (err) {
            console.error(err);
            alert("Failed to save farmer record");
        } finally {
            setIsProcessing(false);
        }
    };


    const handleSubmitCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollection.farmerId || !newCollection.quantity) {
            alert("Please select a farmer and enter quantity");
            return;
        }
        setIsProcessing(true);
        try {
            await onLogCollection({
                ...newCollection,
                id: `c_${Date.now()}`,
                institutionId: currentInstitution?.id || ''
            });
            setIsLoggingCollection(false);
            setNewCollection({
                collectionDate: new Date().toISOString().split('T')[0],
                productType: 'milk',
                unit: 'kgs',
                factoryConfirmed: false,
                notified: false
            });
            if (onLogAction) await onLogAction(`Logged collection for farmer ${newCollection.farmerId}`);
        } catch (err) {
            console.error(err);
            alert("Failed to save collection record");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkConfirmLog = async () => {
        if (selectedCollections.length === 0) return;
        if (!confirm(`Confirm ${selectedCollections.length} selected intake records?`)) return;

        setIsProcessing(true);
        try {
            const toConfirm = collections.filter(c => selectedCollections.includes(c.id));
            if (onBulkConfirmCollections) {
                await onBulkConfirmCollections('', toConfirm);
                setSelectedCollections([]);
                alert(`Successfully confirmed ${toConfirm.length} records.`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to bulk confirm collections");
        } finally {
            setIsProcessing(true); // Wait for loadData to refresh
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    const handleConfirmAllLog = async () => {
        const pending = collections.filter(c => !c.factoryConfirmed);
        if (pending.length === 0) {
            alert("No pending records to confirm.");
            return;
        }
        if (!confirm(`Confirm ALL ${pending.length} pending intake records?`)) return;

        setIsProcessing(true);
        try {
            if (onBulkConfirmCollections) {
                await onBulkConfirmCollections('', pending);
                setSelectedCollections([]);
                alert(`Successfully confirmed all ${pending.length} records.`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to confirm all collections");
        } finally {
            setIsProcessing(true);
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    const handleGeneratePayoutDrafts = async () => {
        if (!onAddPayouts) return;
        if (!confirm(`Generate draft payouts for all farmers for ${filterMonth + 1}/${filterYear}?`)) return;

        setIsProcessing(true);
        try {
            const drafts: any[] = [];
            const payoutMonth = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}-01`;

            for (const farmer of farmers) {
                // Check if draft already exists
                const exists = payouts.find(p => p.farmerId === farmer.id && p.payoutMonth === payoutMonth);
                if (exists) continue;

                const farmerCollections = collections.filter(c => 
                    c.farmerId === farmer.id && 
                    c.factoryConfirmed && 
                    new Date(c.collectionDate).getMonth() === filterMonth &&
                    new Date(c.collectionDate).getFullYear() === filterYear
                );
                
                const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                const gross = totalQty * payoutRate;
                
                const advances = expenses.filter(ex => 
                    ex.farmerId === farmer.id && 
                    ex.category.toLowerCase().includes('advance') &&
                    new Date(ex.date).getMonth() === filterMonth &&
                    new Date(ex.date).getFullYear() === filterYear
                ).reduce((s, ex) => s + ex.amount, 0);

                const agrovetDeduction = sales.filter(s => 
                    s.farmerId === farmer.id && 
                    new Date(s.saleDate).getMonth() === filterMonth &&
                    new Date(s.saleDate).getFullYear() === filterYear
                ).reduce((acc, sa) => acc + sa.amount, 0);

                const net = gross - advances - agrovetDeduction;

                // Only generate if there's activity
                if (totalQty > 0 || advances > 0 || agrovetDeduction > 0) {
                    drafts.push({
                        id: `p_${Date.now()}_${farmer.id}`,
                        institutionId: currentInstitution?.id,
                        farmerId: farmer.id,
                        payoutMonth,
                        grossPayout: gross,
                        agrovetDeduction,
                        saccoDeduction: 0,
                        logisticsDeduction: 0,
                        netPayout: net,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    });
                }
            }

            if (drafts.length === 0) {
                alert("No new payouts to generate for this period.");
            } else {
                await onAddPayouts(drafts);
                onLogAction?.(`Generated ${drafts.length} payout drafts for ${payoutMonth}`);
                alert(`Successfully generated ${drafts.length} payout drafts.`);
            }
        } catch (err: any) {
            console.error("Payout generation failed:", err);
            alert(`Failed to generate payouts: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSettlementPreview = async () => {
        try {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = monthNames[filterMonth];
            
            const settlementData = farmers.map(farmer => {
                const farmerCollections = collections.filter(c => 
                    c.farmerId === farmer.id && 
                    c.factoryConfirmed && 
                    new Date(c.collectionDate).getMonth() === filterMonth &&
                    new Date(c.collectionDate).getFullYear() === filterYear
                );
                const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                const gross = totalQty * payoutRate;
                
                const advances = expenses.filter(ex => 
                    ex.farmerId === farmer.id && 
                    ex.category.toLowerCase().includes('advance') &&
                    new Date(ex.date).getMonth() === filterMonth &&
                    new Date(ex.date).getFullYear() === filterYear
                ).reduce((s, ex) => s + ex.amount, 0);

                const deductions = sales.filter(s => 
                    s.farmerId === farmer.id && 
                    new Date(s.saleDate).getMonth() === filterMonth &&
                    new Date(s.saleDate).getFullYear() === filterYear
                ).reduce((acc, sa) => acc + sa.amount, 0);

                const net = gross - advances - deductions;
                return { name: farmer.name, phone: farmer.phone, totalQty, gross, advances, deductions, net };
            }).filter(item => item.totalQty > 0 || item.advances > 0 || item.deductions > 0);

            const totalNet = settlementData.reduce((sum, item) => sum + item.net, 0);

            const dataUri = await pdfService.generateCoopSettlementSchedulePdf(
                settlementData, 
                monthName, 
                filterYear, 
                totalNet, 
                currentInstitution || {} as any, 
                undefined, 
                null
            );
            
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Settlement_Schedule_${monthName}_${filterYear}.pdf`;
            link.click();
        } catch (err) {
            console.error(err);
            alert("Failed to generate settlement PDF");
        }
    };

    const filteredFarmers = useMemo(() => {
        return farmers.filter(f => 
            f.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            f.phone?.includes(searchTerm)
        );
    }, [farmers, searchTerm]);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => 
            item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);
    
    const getFilteredPayouts = () => {
        const payoutMonth = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}-01`;
        return payouts.filter(p => p.payoutMonth === payoutMonth);
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayCollections = collections.filter(c => c.collectionDate === today);
        const todayQty = todayCollections.reduce((sum, c) => sum + Number(c.quantity), 0);
        const totalSaccoAssets = saccoAccounts.reduce((sum, a) => sum + a.balance, 0);
        const totalPayouts = payouts.reduce((sum, p) => sum + p.netPayout, 0);

        return {
            todayQty,
            totalFarmers: farmers.length,
            activeRiders: riders.filter(r => r.status === 'active').length,
            totalSaccoAssets,
            totalPayouts
        };
    }, [collections, farmers, riders, saccoAccounts, payouts]);

    const getFarmerName = (id: string) => farmers.find(f => f.id === id)?.name || 'Unknown Farmer';
    const getRiderName = (id?: string) => riders.find(r => r.id === id)?.name || 'N/A';

    async function handleSubmitRider(e: React.FormEvent) {
        e.preventDefault();
        console.log("handleSubmitRider triggered", { newRider });
        if (!newRider.name || !newRider.phone) {
            alert("Please fill in Name and Phone");
            return;
        }
        setIsProcessing(true);
        try {
            await onAddRider({
                ...newRider,
                id: `r_${Date.now()}`,
                institutionId: currentInstitution?.id || ''
            });
            setIsAddingRider(false);
            setNewRider({ status: 'active' });
        } catch (err) {
            console.error(err);
            alert("Failed to save rider record");
        } finally {
            setIsProcessing(false);
        }
    }

    const handleSubmitInventory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInventory.itemName || !newInventory.quantity) {
            alert("Please fill in Item Name and Quantity");
            return;
        }
        setIsProcessing(true);
        try {
            await onAddInventory?.({
                ...newInventory,
                id: `inv_${Date.now()}`,
                institutionId: currentInstitution?.id || ''
            });
            setIsAddingInventory(false);
            setNewInventory({});
            if (onLogAction) await onLogAction(`Added inventory item: ${newInventory.itemName}`);
        } catch (err) {
            console.error(err);
            alert("Failed to save inventory record");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitSale = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSale.farmerId || !newSale.itemId || !newSale.quantity) {
            alert("Please select a farmer, item and enter quantity");
            return;
        }
        setIsProcessing(true);
        try {
            if (onAddSale) {
                const { ...cleanSale } = newSale;
                if(cleanSale.paymentStatus === 'pending') { cleanSale.paymentStatus = 'credit'; }
                await onAddSale({
                    ...cleanSale,
                    id: `sale_${Date.now()}`,
                    institutionId: currentInstitution?.id || ''
                });
            }
            setIsRecordingSale(false);
            setNewSale({
                saleDate: new Date().toISOString().split('T')[0],
                paymentStatus: 'cash'
            });
            if (onLogAction) await onLogAction(`Recorded sale for farmer ${newSale.farmerId}`);
        } catch (err) {
            console.error(err);
            alert("Failed to record sale");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Navigation & Search will be shown always, but stats move to Overview */}

            {/* Navigation & Search */}
            <div className={`flex flex-col lg:flex-row ${onTabChange ? 'lg:justify-end' : 'lg:items-center justify-between'} gap-6`}>
                {!onTabChange && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'farmers', label: 'Farmers', icon: <FarmerIcon className="w-4 h-4" /> },
                            { id: 'agrovet', label: 'Agrovet', icon: <StoreIcon className="w-4 h-4" /> },
                            { id: 'sacco', label: 'SACCO', icon: <SaccoIcon className="w-4 h-4" /> },
                            { id: 'finances', label: 'Finances', icon: <FinanceIcon className="w-4 h-4" /> },
                            { id: 'communication', label: 'Communication', icon: <EmailIcon className="w-4 h-4" /> },
                            { id: 'approvals', label: 'Approvals', icon: <ApprovalIcon className="w-4 h-4" /> },
                            { id: 'settings', label: 'Config', icon: <CogIcon className="w-4 h-4" /> },
                            { id: 'reports', label: 'Analytics', icon: <ReportsIcon className="w-4 h-4" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeSubTab === tab.id 
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="relative group min-w-[300px]">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="search"
                        placeholder="Search farmers, collections, or records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm min-h-[500px]">
                {activeSubTab === 'overview' && (
                    <div className="p-8 animate-fade-in">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white mb-2 uppercase">Cooperative Hub</h1>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Unified Operations & Financial Control</p>
                            </div>
                        </div>

                        {/* Integrated Header Stats (Overview Only) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                                <div className="absolute -right-4 -top-4 bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-full" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Intake</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {stats.todayQty.toLocaleString()} <span className="text-xs text-slate-400 font-bold ml-1">Units</span>
                                </h3>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                                <div className="absolute -right-4 -top-4 bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Farmers</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalFarmers}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                                <div className="absolute -right-4 -top-4 bg-amber-50 dark:bg-amber-900/20 w-16 h-16 rounded-full" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Payouts</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">KES {stats.totalPayouts.toLocaleString()}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                                <div className="absolute -right-4 -top-4 bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SACCO Assets</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">KES {stats.totalSaccoAssets.toLocaleString()}</h3>
                            </div>
                        </div>

                        {/* Top Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600">
                                        <FarmerIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Farmers</span>
                                </div>
                                <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{farmers.length}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600">
                                        <CollectionIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intake Records</span>
                                </div>
                                <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{collections.length}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-indigo-500 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-amber-600">
                                        <LogisticsIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Riders</span>
                                </div>
                                <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{riders.length}</p>
                            </div>
                            <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-500/10 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/10 rounded-2xl text-white">
                                        <FinanceIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Cash Position</span>
                                </div>
                                <p className="text-2xl font-black tracking-tighter text-white">
                                    KES {(income.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Operational Shortcuts */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                                        <PlusIcon className="w-5 h-5 text-indigo-500" />
                                        Quick Operations
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setActiveSubTab('farmers')}
                                            className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-transparent hover:border-indigo-500 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600">
                                                <FarmerIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-black text-xs uppercase tracking-tight block">Manage Farmers</span>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">Registry & Profiles</p>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setActiveSubTab('collections')}
                                            className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-transparent hover:border-emerald-500 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                                                <CollectionIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-black text-xs uppercase tracking-tight block">Intake Logistics</span>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">Daily Intake Logs</p>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setActiveSubTab('payouts')}
                                            className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-transparent hover:border-amber-500 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600">
                                                <PayoutIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-black text-xs uppercase tracking-tight block">Payout Settlements</span>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">Farmer Payments</p>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setActiveSubTab('reports')}
                                            className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-transparent hover:border-indigo-500 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600">
                                                <ReportsIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-black text-xs uppercase tracking-tight block">Yield Analytics</span>
                                                <p className="text-[10px] text-slate-500 uppercase mt-0.5">Operational Data</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Recent Collections Snapshot */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                        <CollectionIcon className="w-5 h-5 text-indigo-500" />
                                        Recent Deliveries
                                    </h3>
                                    <div className="space-y-4">
                                        {collections.slice(0, 5).map(col => (
                                            <div key={col.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center font-black text-slate-400 text-xs">
                                                        {getFarmerName(col.farmerId)?.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{getFarmerName(col.farmerId)}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{col.collectionDate}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-indigo-600">{col.quantity} {col.unit}</p>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${col.approvalStatus === 'approved' || col.factoryConfirmed ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {col.approvalStatus || (col.factoryConfirmed ? 'confirmed' : 'pending')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Activity Feed / Mini Ledger */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <FinanceIcon className="w-32 h-32" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest mb-8 relative z-10">Latest Cashflow</h3>
                                <div className="space-y-6 relative z-10">
                                    {[...income.map(i => ({...i, type: 'income'})), ...expenses.map(e => ({...e, type: 'expense'}))]
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .slice(0, 10)
                                        .map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-4">
                                                <div className={`mt-1 w-2 h-2 rounded-full ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{(item as any).companyName || (item as any).description}</p>
                                                        <p className={`text-[10px] font-black ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {item.type === 'income' ? '+' : '-'} {item.amount.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {(activeSubTab === 'farmers' || activeSubTab === 'payouts' || activeSubTab === 'logistics' || activeSubTab === 'collections') && (
                    <div className="p-8">
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit mb-8 border border-slate-200 dark:border-slate-800">
                            {[
                                { id: 'registry', label: 'Farmer Registry', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                { id: 'collections', label: 'Daily Intake Log', icon: <CollectionIcon className="w-3.5 h-3.5" /> },
                                { id: 'logistics', label: 'Logistics & Riders', icon: <LogisticsIcon className="w-3.5 h-3.5" /> },
                                { id: 'payouts', label: 'Payouts Processing', icon: <PayoutIcon className="w-3.5 h-3.5" /> }
                            ].map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setFarmerSubTab(sub.id as any)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        farmerSubTab === sub.id 
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {sub.icon}
                                    {sub.label}
                                </button>
                            ))}
                        </div>

                        {farmerSubTab === 'registry' && (
                            <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Farmer Registry</h2>
                                    {!isAddingFarmer && 
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setShowImportModal(true)}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                                            >
                                                <UploadCloud className="w-4 h-4" />
                                                Import Farmers
                                            </button>
                                            <button 
                                                onClick={() => setIsAddingFarmer(true)}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Onboard Farmer
                                            </button>
                                        </div>
                                    }
                                </div>
                                
                                {isAddingFarmer && 
                                    <div className="mb-12 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                                    <FarmerIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black tracking-tighter uppercase mb-0.5">New Farmer Registration</h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add a new member to the cooperative registry</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setIsAddingFarmer(false)}
                                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400"
                                            >
                                                <PlusIcon className="w-5 h-5 rotate-45" />
                                            </button>
                                        </div>

                                        <form onSubmit={handleSubmitFarmer} className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
                                                    <input 
                                                        required
                                                        type="text" 
                                                        value={newFarmer.name || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, name: e.target.value})}
                                                        placeholder="Enter farmer's full name"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                                                    <input 
                                                        required
                                                        type="tel" 
                                                        value={newFarmer.phone || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, phone: e.target.value})}
                                                        placeholder="07XXXXXXXX"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Member ID</label>
                                                    <input 
                                                        required
                                                        type="text" 
                                                        value={newFarmer.memberId || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, memberId: e.target.value})}
                                                        placeholder="M-XXXX"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Bank Account Number</label>
                                                    <input 
                                                        required
                                                        type="text" 
                                                        value={newFarmer.accountNumber || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, accountNumber: e.target.value})}
                                                        placeholder="Acc No"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">National ID</label>
                                                    <input 
                                                        type="text" 
                                                        value={newFarmer.nationalId || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, nationalId: e.target.value})}
                                                        placeholder="ID Number"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">KRA PIN (Optional)</label>
                                                    <input 
                                                        type="text" 
                                                        value={newFarmer.kraPin || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, kraPin: e.target.value})}
                                                        placeholder="AXXXXXXXXX"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white uppercase"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Route / Location</label>
                                                    <input 
                                                        type="text" 
                                                        value={newFarmer.location || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, location: e.target.value})}
                                                        placeholder="e.g. Route A, Zone B"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assigned Rider</label>
                                                    <select 
                                                        value={newFarmer.riderId || ''} 
                                                        onChange={e => setNewFarmer({...newFarmer, riderId: e.target.value})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Select Rider (Optional)</option>
                                                        {riders.map(r => (
                                                            <option key={r.id} value={r.id}>{r.name} ({r.vehiclePlate || r.licenseNumber})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-4 pt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsAddingFarmer(false)}
                                                    className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={isProcessing}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                                >
                                                    {isProcessing ? 'Onboarding...' : 'Save Farmer Record'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                }

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                            <tr>
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Farmer Name / ID</th>
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">A/C Number</th>
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Rider</th>
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Number</th>
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                                                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                            {filteredFarmers.map(farmer => (
                                                <tr key={farmer.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all cursor-pointer border-none">
                                                    <td className="py-4 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-slate-400 uppercase text-[10px]">
                                                                {farmer.name.substring(0, 2)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900 dark:text-white text-xs tracking-tight group-hover:text-indigo-600 transition-colors">
                                                                    {farmer.name}
                                                                </span>
                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                                                                    {farmer.memberId || 'NO ID'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">{farmer.phone}</td>
                                                    <td className="py-4 px-6 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-tighter">{farmer.accountNumber}</td>
                                                    <td className="py-4 px-6 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                        {farmer.riderId ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-600">
                                                                    <LogisticsIcon className="w-3 h-3" />
                                                                </div>
                                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                                    {riders.find(r => r.id === farmer.riderId)?.name || 'Unknown Rider'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 italic">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-xs font-medium text-slate-500">{farmer.nationalId || 'N/A'}</td>
                                                    <td className="py-4 px-6 text-xs font-bold text-slate-700 dark:text-slate-300">{farmer.location || 'Main'}</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                                                            farmer.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                                                        }`}>
                                                            {farmer.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingFarmer(farmer);
                                                            }}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <CogIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredFarmers.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                                        No farmers found matching your search
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {farmerSubTab === 'logistics' && (
                            <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Logistics & Riders</h2>
                                    {!isAddingRider && (
                                        <button 
                                            onClick={() => setIsAddingRider(true)}
                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Register Rider
                                        </button>
                                    )}
                                </div>

                                {/* Active Deliveries Section */}
                                <div className="mb-12">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                        <h3 className="text-sm font-black uppercase tracking-widest">Active Deliveries (Pending Confirmation)</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6">
                                        {riders.map(rider => {
                                            const pending = collections.filter(c => c.riderId === rider.id && !c.factoryConfirmed);
                                            if (pending.length === 0) return null;
                                            
                                            const systemTotal = pending.reduce((sum, c) => sum + Number(c.quantity), 0);
                                            const reportedVol = riderVolumes[rider.id] || '';
                                            const isMatch = Number(reportedVol) === systemTotal;

                                            return (
                                                <div key={`delivery-${rider.id}`} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all group">
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                                                <LogisticsIcon className="w-8 h-8" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">{rider.name}</h4>
                                                                <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase">{rider.vehiclePlate || 'NO PLATE'}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{pending.length} Collections Pending</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                            <div className="text-center sm:text-right">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Summed Total</p>
                                                                <p className="text-2xl font-black text-slate-900 dark:text-white">{systemTotal} <span className="text-xs text-slate-400 tracking-tighter uppercase font-bold">Ltrs/Kgs</span></p>
                                                            </div>
                                                            
                                                            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                                                            
                                                            <div className="flex-1 min-w-[200px]">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Total Quantity Received</p>
                                                                <div className="relative">
                                                                    <input 
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="Enter gate weight..."
                                                                        value={reportedVol}
                                                                        onChange={e => setRiderVolumes({...riderVolumes, [rider.id]: e.target.value})}
                                                                        className={`w-full bg-white dark:bg-slate-800 border-2 rounded-2xl p-4 text-sm font-black outline-none transition-all ${
                                                                            reportedVol ? (isMatch ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-rose-300 ring-4 ring-rose-500/5') : 'border-slate-100 dark:border-slate-800'
                                                                        }`}
                                                                    />
                                                                    {reportedVol && isMatch && (
                                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                                                            <SuccessIcon className="w-5 h-5" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {isMatch && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (onBulkConfirmCollections) {
                                                                            setIsProcessing(true);
                                                                            try {
                                                                                await onBulkConfirmCollections(rider.id, pending);
                                                                                setRiderVolumes({...riderVolumes, [rider.id]: ''});
                                                                            } finally {
                                                                                setIsProcessing(false);
                                                                            }
                                                                        }
                                                                    }}
                                                                    disabled={isProcessing}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 animate-in zoom-in duration-300"
                                                                >
                                                                    {isProcessing ? 'Confirming...' : 'Bulk Confirm Delivery'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {riders.every(r => collections.every(c => c.riderId !== r.id || c.factoryConfirmed)) && (
                                            <div className="p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active deliveries pending confirmation</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isAddingRider && (
                                    <div className="mb-12 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                                                    <LogisticsIcon className="w-6 h-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black tracking-tighter uppercase">New Rider Onboarding</h3>
                                                    <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Register a delivery partner</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setIsAddingRider(false)}
                                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400"
                                            >
                                                <PlusIcon className="w-5 h-5 rotate-45" />
                                            </button>
                                        </div>

                                        <form onSubmit={handleSubmitRider} className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Rider Name</label>
                                                    <input 
                                                        required
                                                        type="text" 
                                                        value={newRider.name || ''} 
                                                        onChange={e => setNewRider({...newRider, name: e.target.value})}
                                                        placeholder="Enter rider's full name"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Phone Number</label>
                                                    <input 
                                                        required
                                                        type="tel" 
                                                        value={newRider.phone || ''} 
                                                        onChange={e => setNewRider({...newRider, phone: e.target.value})}
                                                        placeholder="07XXXXXXXX"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">National ID</label>
                                                    <input 
                                                        type="text" 
                                                        value={newRider.nationalId || ''} 
                                                        onChange={e => setNewRider({...newRider, nationalId: e.target.value})}
                                                        placeholder="ID Number"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">License Number</label>
                                                    <input 
                                                        type="text" 
                                                        value={newRider.licenseNumber || ''} 
                                                        onChange={e => setNewRider({...newRider, licenseNumber: e.target.value})}
                                                        placeholder="Driving License"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Vehicle Plate</label>
                                                    <input 
                                                        type="text" 
                                                        value={newRider.vehiclePlate || ''} 
                                                        onChange={e => setNewRider({...newRider, vehiclePlate: e.target.value})}
                                                        placeholder="KXX 000X"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white uppercase"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-4 pt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsAddingRider(false)}
                                                    className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={isProcessing}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                                >
                                                    {isProcessing ? 'Registering...' : 'Save Rider Record'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {riders.map(rider => (
                                        <div key={rider.id} className="p-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
                                                    <LogisticsIcon className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 dark:text-white tracking-tighter">{rider.name}</h4>
                                                    <p className="text-xs text-indigo-500 font-bold tracking-widest uppercase">{rider.vehiclePlate || 'NO PLATE'}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                                    <p className="text-xs font-black uppercase text-emerald-500">{rider.status}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Number</p>
                                                    <p className="text-xs font-black">{rider.nationalId}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {farmerSubTab === 'payouts' && (
                            <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-xl font-black tracking-tighter uppercase">Monthly Payout Processing</h2>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {selectedPayouts.length} Payouts selected
                                            </p>
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <select 
                                                    value={filterMonth} 
                                                    onChange={e => setFilterMonth(Number(e.target.value))}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                                >
                                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                        <option key={i} value={i} className="dark:bg-slate-800">{m}</option>
                                                    ))}
                                                </select>
                                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                                                <select 
                                                    value={filterYear} 
                                                    onChange={e => setFilterYear(Number(e.target.value))}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                                >
                                                    {[2024, 2025, 2026].map(y => (
                                                        <option key={y} value={y} className="dark:bg-slate-800">{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {(currentUser.role === 'cooperative_manager' || currentUser.role === 'admin') && (
                                            <button 
                                                disabled={selectedPayouts.length === 0 || isProcessing}
                                                onClick={async () => {
                                                    if (window.confirm(`Initiate monthly dues for ${selectedPayouts.length} farmers?`)) {
                                                        setIsProcessing(true);
                                                        await onInitiatePayouts?.(selectedPayouts);
                                                        setSelectedPayouts([]);
                                                        setIsProcessing(false);
                                                        onLogAction?.(`Initiated bulk payout for ${selectedPayouts.length} farmers`);
                                                    }
                                                }}
                                                className="flex items-center gap-2 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                            >
                                                <PayoutIcon className="w-4 h-4" />
                                                Initiate Bulk Dues
                                            </button>
                                        )}
                                        {(currentUser.role === 'coop_chairman' || currentUser.role === 'super_admin') && (
                                            <button 
                                                disabled={selectedPayouts.length === 0 || isProcessing}
                                                onClick={async () => {
                                                    if (window.confirm(`Approve and Disburse funds via M-PESA for ${selectedPayouts.length} farmers?`)) {
                                                        setIsProcessing(true);
                                                        await onApprovePayouts?.(selectedPayouts);
                                                        setSelectedPayouts([]);
                                                        setIsProcessing(false);
                                                        onLogAction?.(`Approved and Disbursed bulk M-Pesa payout to ${selectedPayouts.length} farmers`);
                                                    }
                                                }}
                                                className="flex items-center gap-2 bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                            >
                                                <SuccessIcon className="w-4 h-4" />
                                                Approve & Play (M-PESA)
                                            </button>
                                        )}
                                                                                <button 
                                            disabled={isProcessing}
                                            onClick={handleGeneratePayoutDrafts}
                                            className="flex items-center gap-2 border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Generate Drafts
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-4">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                <th className="px-6 pb-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedPayouts.length > 0 && selectedPayouts.length === getFilteredPayouts().length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedPayouts(getFilteredPayouts().map(p => p.id));
                                                            else setSelectedPayouts([]);
                                                        }}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-6 pb-2">Farmer</th>
                                                <th className="px-6 pb-2 text-right">Gross</th>
                                                <th className="px-6 pb-2 text-right text-rose-500">Deductions</th>
                                                <th className="px-6 pb-2 text-right text-emerald-600 font-black">Net Amount</th>
                                                <th className="px-6 pb-2">Status</th>
                                                <th className="px-6 pb-2">Workflow</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getFilteredPayouts().map(p => (
                                                <tr key={p.id} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                                                    <td className="px-6 py-5 rounded-l-3xl">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedPayouts.includes(p.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedPayouts(prev => [...prev, p.id]);
                                                                else setSelectedPayouts(prev => prev.filter(id => id !== p.id));
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(p.farmerId)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.payoutMonth}</p>
                                                </td>
                                                <td className="px-6 py-5 text-right font-bold text-slate-600">KES {p.grossPayout.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-right font-medium text-rose-500">- KES {(p.agrovetDeduction + p.saccoDeduction + p.logisticsDeduction).toLocaleString()}</td>
                                                <td className="px-6 py-5 text-right font-black text-emerald-700 text-lg tracking-tighter">KES {p.netPayout.toLocaleString()}</td>
                                                    <td className="px-6 py-5">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                                            p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                            p.status === 'approved' ? 'bg-indigo-50 text-indigo-600' :
                                                            p.status === 'initiated' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 rounded-r-3xl">
                                                        <div className="flex flex-col gap-1">
                                                            {p.initiatedAt && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Initiated: {new Date(p.initiatedAt).toLocaleDateString()}</p>}
                                                            {p.approvedAt && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-emerald-600">Approved: {new Date(p.approvedAt).toLocaleDateString()}</p>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {farmerSubTab === 'collections' && (
                            <div className="animate-fade-in">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Daily Intake Log</h2>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setIsLoggingCollection(!isLoggingCollection)}
                                            className={`flex items-center gap-2 ${isLoggingCollection ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95`}
                                        >
                                            <PlusIcon className={`w-4 h-4 transition-transform ${isLoggingCollection ? 'rotate-45' : ''}`} />
                                            {isLoggingCollection ? 'Cancel' : 'Log Collection'}
                                        </button>
                                        <button 
                                            onClick={() => setShowCollectionImportModal(true)}
                                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                        >
                                            <UploadCloud className="w-4 h-4" />
                                            Bulk Import
                                        </button>
                                        {selectedCollections.length > 0 && (
                                            <button 
                                                onClick={handleBulkConfirmLog}
                                                className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 animate-in slide-in-from-right-4"
                                            >
                                                <ApprovalIcon className="w-4 h-4" />
                                                Confirm {selectedCollections.length} Selected
                                            </button>
                                        )}
                                        {collections.filter(c => !c.factoryConfirmed).length > 0 && selectedCollections.length === 0 && (
                                            <button 
                                                onClick={handleConfirmAllLog}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 animate-in slide-in-from-right-4"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Confirm All Pending
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isLoggingCollection && (
                                    <div className="mb-12 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                                <CollectionIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black tracking-tighter uppercase mb-0.5">Log Daily Intake</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record farmer produce collection</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSubmitCollection} className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Farmer</label>
                                                    <select 
                                                        required
                                                        value={newCollection.farmerId || ''}
                                                        onChange={e => setNewCollection({...newCollection, farmerId: e.target.value})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="">Select Farmer</option>
                                                        {farmers.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name} ({f.accountNumber})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Product Type</label>
                                                    <select 
                                                        required
                                                        value={newCollection.productType || 'milk'}
                                                        onChange={e => setNewCollection({...newCollection, productType: e.target.value as any})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="milk">Milk</option>
                                                        <option value="tea">Tea</option>
                                                        <option value="coffee">Coffee</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Quantity ({newCollection.unit === 'liters' ? 'Ltr' : 'KGs'})</label>
                                                    <input 
                                                        required
                                                        type="number" 
                                                        step="0.01"
                                                        value={newCollection.quantity || ''}
                                                        onChange={e => setNewCollection({...newCollection, quantity: Number(e.target.value)})}
                                                        placeholder="0.00"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Unit</label>
                                                    <select 
                                                        required
                                                        value={newCollection.unit || 'kgs'}
                                                        onChange={e => setNewCollection({...newCollection, unit: e.target.value as any})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="kgs">Kilograms (KGs)</option>
                                                        <option value="liters">Liters</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Collection Date</label>
                                                    <input 
                                                        required
                                                        type="date" 
                                                        value={newCollection.collectionDate || ''}
                                                        onChange={e => setNewCollection({...newCollection, collectionDate: e.target.value})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsLoggingCollection(false)}
                                                    className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all"
                                                >
                                                    Discard
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={isProcessing}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-3"
                                                >
                                                    {isProcessing ? 'Processing...' : 'Save Intake Record'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-4">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                <th className="px-6 pb-2">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedCollections.length > 0 && selectedCollections.length === collections.filter(c => !c.factoryConfirmed).length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedCollections(collections.filter(c => !c.factoryConfirmed).map(c => c.id));
                                                            else setSelectedCollections([]);
                                                        }}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-6 pb-2">Farmer</th>
                                                <th className="px-6 pb-2">Product</th>
                                                <th className="px-6 pb-2 text-right">Rider Qty</th>
                                                <th className="px-6 pb-2 text-right">Final Qty</th>
                                                <th className="px-6 pb-2">Status</th>
                                                <th className="px-6 pb-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {collections.slice(0, 30).map(col => (
                                                <tr key={col.id} className="group bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                    <td className="px-6 py-5 rounded-l-3xl">
                                                        <input 
                                                            type="checkbox" 
                                                            disabled={col.factoryConfirmed}
                                                            checked={selectedCollections.includes(col.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedCollections(prev => [...prev, col.id]);
                                                                else setSelectedCollections(prev => prev.filter(id => id !== col.id));
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(col.farmerId)}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{col.collectionDate}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                                                            {col.productType}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-slate-400">{col.quantity}</td>
                                                    <td className="px-6 py-5 text-right font-black text-indigo-600 dark:text-indigo-400">
                                                        {col.factoryConfirmed ? col.finalQuantity : '-'}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${
                                                                col.factoryConfirmed 
                                                                    ? col.requiresApproval 
                                                                        ? col.approvalStatus === 'approved' ? 'bg-emerald-500' : col.approvalStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                                                        : 'bg-emerald-500'
                                                                    : 'bg-slate-300'
                                                            }`} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                                {col.factoryConfirmed 
                                                                    ? col.requiresApproval 
                                                                        ? col.approvalStatus === 'pending' ? 'Pending Approval' : col.approvalStatus
                                                                        : 'Confirmed'
                                                                    : 'Pending Intake'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right rounded-r-3xl">
                                                        {!col.factoryConfirmed && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const finalQty = prompt(`Confirm quantity for ${getFarmerName(col.farmerId)} (Rider recorded: ${col.quantity})`, col.quantity.toString());
                                                                    if (finalQty !== null) onConfirmCollection?.(col.id, parseFloat(finalQty));
                                                                }}
                                                                className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                                            >
                                                                Confirm
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {farmerSubTab === 'approvals' && (
                            <div className="animate-fade-in">
                                <div className="mb-8">
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Board Approvals</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review quantity discrepancies and factory modifications</p>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {collections.filter(c => c.requiresApproval && c.approvalStatus === 'pending').map(col => (
                                        <div key={col.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 animate-fade-in-up">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                                    <AlertIcon className="w-8 h-8 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Discrepancy: {getFarmerName(col.farmerId)}</h4>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date: {col.collectionDate}</p>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product: {col.productType}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-12 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="text-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider Recorded</p>
                                                    <p className="text-xl font-black text-slate-600 dark:text-slate-400">{col.quantity}</p>
                                                </div>
                                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                                                <div className="text-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Factory Confirmed</p>
                                                    <p className="text-xl font-black text-indigo-600">{col.finalQuantity}</p>
                                                </div>
                                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                                                <div className="text-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Variance</p>
                                                    <p className={`text-xl font-black ${Number(col.finalQuantity) - Number(col.quantity) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {(Number(col.finalQuantity) - Number(col.quantity)).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => onApproveCollection?.(col.id, 'rejected')}
                                                    className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 text-slate-400"
                                                >
                                                    Reject Change
                                                </button>
                                                <button 
                                                    onClick={() => onApproveCollection?.(col.id, 'approved')}
                                                    className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                                                >
                                                    Approve Quantity
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {collections.filter(c => c.requiresApproval && c.approvalStatus === 'pending').length === 0 && (
                                        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                                                <SuccessIcon className="w-10 h-10 text-emerald-500" />
                                            </div>
                                            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mb-2">Queue Fully Cleared</h3>
                                            <p className="text-xs font-medium text-slate-500 max-w-sm">There are no pending collection approvals at this moment. All discrepancies have been resolved.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSubTab === 'finances' && (
                    <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-xl font-black tracking-tighter uppercase">Financial Ledger</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Cooperative Expenses & Income flows</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => onAddExpense?.({})}
                                            className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 text-slate-900 dark:text-white flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Record Expense
                                        </button>
                                        <button 
                                            onClick={() => onAddIncome?.({})}
                                            className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Record Income
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
                                    {/* Expenses List */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            Recent Expenditures
                                        </h3>
                                        <div className="space-y-4">
                                            {expenses.slice(0, 10).map(exp => (
                                                <div key={exp.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{exp.description}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{exp.date} • {exp.category}</p>
                                                    </div>
                                                    <p className="text-lg font-black text-rose-600">- KES {exp.amount.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Income List */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Revenue Generation
                                        </h3>
                                        <div className="space-y-4">
                                            {income.slice(0, 10).map(inc => (
                                                <div key={inc.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{inc.companyName}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inc.date} • {inc.productType} ({inc.quantity} {inc.unit})</p>
                                                    </div>
                                                    <p className="text-lg font-black text-emerald-600">+ KES {inc.amount.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSubTab === 'agrovet' && (
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black tracking-tighter uppercase">Agrovet Inventory & Sales</h2>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => { setIsAddingInventory(!isAddingInventory); setIsRecordingSale(false); }}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isAddingInventory ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'}`}
                                        >
                                            <PlusIcon className={`w-4 h-4 ${isAddingInventory ? 'rotate-45' : ''}`} />
                                            {isAddingInventory ? 'Cancel' : 'Add Stock'}
                                        </button>
                                        <button 
                                            onClick={() => { setIsRecordingSale(!isRecordingSale); setIsAddingInventory(false); }}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isRecordingSale ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white'}`}
                                        >
                                            <PlusIcon className={`w-4 h-4 ${isRecordingSale ? 'rotate-45' : ''}`} />
                                            {isRecordingSale ? 'Cancel' : 'Record Sale'}
                                        </button>
                                    </div>
                                </div>

                                {/* Add Inventory Form */}
                                {isAddingInventory && (
                                    <div className="mb-12 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                        <h3 className="text-lg font-black tracking-tighter uppercase mb-6 flex items-center gap-3">
                                            <StoreIcon className="w-5 h-5 text-indigo-500" />
                                            Restock Inventory
                                        </h3>
                                        <form onSubmit={handleSubmitInventory} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Item Name</label>
                                                    <input 
                                                        required
                                                        type="text" 
                                                        value={newInventory.itemName || ''} 
                                                        onChange={e => setNewInventory({...newInventory, itemName: e.target.value})}
                                                        placeholder="e.g. DAP Fertilizer"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                                    <select 
                                                        value={newInventory.category || ''} 
                                                        onChange={e => setNewInventory({...newInventory, category: e.target.value})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="">Select Category</option>
                                                        <option value="Fertilizer">Fertilizer</option>
                                                        <option value="Seeds">Seeds</option>
                                                        <option value="Animal Feed">Animal Feed</option>
                                                        <option value="Chemicals">Chemicals</option>
                                                        <option value="Tools">Tools</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Quantity</label>
                                                    <input 
                                                        required
                                                        type="number" 
                                                        value={newInventory.quantity || ''} 
                                                        onChange={e => setNewInventory({...newInventory, quantity: Number(e.target.value)})}
                                                        placeholder="0"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Unit Price (KES)</label>
                                                    <input 
                                                        required
                                                        type="number" 
                                                        value={newInventory.unitPrice || ''} 
                                                        onChange={e => setNewInventory({...newInventory, unitPrice: Number(e.target.value)})}
                                                        placeholder="0.00"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <button 
                                                    type="submit"
                                                    disabled={isProcessing}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                                                >
                                                    {isProcessing ? 'Saving...' : 'Confirm Restock'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Record Sale Form */}
                                {isRecordingSale && (
                                    <div className="mb-12 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                        <h3 className="text-lg font-black tracking-tighter uppercase mb-6 flex items-center gap-3">
                                            <PayoutIcon className="w-5 h-5 text-emerald-500" />
                                            New Sales Record
                                        </h3>
                                        <form onSubmit={handleSubmitSale} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Farmer / Customer</label>
                                                    <select 
                                                        required
                                                        value={newSale.farmerId || ''} 
                                                        onChange={e => setNewSale({...newSale, farmerId: e.target.value})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="">Select Farmer</option>
                                                        {farmers.map(f => (
                                                            <option key={f.id} value={f.id}>{f.name} ({f.memberId})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Inventory Item</label>
                                                    <select 
                                                        required
                                                        value={newSale.itemId || ''} 
                                                        onChange={e => {
                                                            const item = inventory.find(i => i.id === e.target.value);
                                                            setNewSale({
                                                                ...newSale, 
                                                                itemId: e.target.value,
                                                                amount: item ? item.unitPrice * (newSale.quantity || 0) : 0
                                                            });
                                                        }}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="">Select Item</option>
                                                        {inventory.map(i => (
                                                            <option key={i.id} value={i.id}>{i.itemName} (Stock: {i.quantity})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Quantity</label>
                                                    <input 
                                                        required
                                                        type="number" 
                                                        value={newSale.quantity || ''} 
                                                        onChange={e => {
                                                            const qty = Number(e.target.value);
                                                            const item = inventory.find(i => i.id === newSale.itemId);
                                                            setNewSale({
                                                                ...newSale, 
                                                                quantity: qty,
                                                                amount: item ? item.unitPrice * qty : 0
                                                            });
                                                        }}
                                                        placeholder="0"
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Total Amount (KES)</label>
                                                    <input 
                                                        required
                                                        readOnly
                                                        type="number" 
                                                        value={newSale.amount || ''} 
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-black outline-none transition-all dark:text-white text-emerald-600"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <button 
                                                    type="submit"
                                                    disabled={isProcessing}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                                                >
                                                    {isProcessing ? 'Recording...' : 'Finalize Sale'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                                    {filteredInventory.length > 0 ? filteredInventory.map(item => (
                                        <div key={item.id} className="p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm group hover:border-indigo-500 transition-all">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                    <StoreIcon className="w-6 h-6" />
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-full ${
                                                    Number(item.quantity) < 10 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                                                }`}>
                                                    {item.quantity} In Stock
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg mb-1">{item.itemName}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">{item.category}</p>
                                            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-6">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Price</p>
                                                    <p className="text-xl font-black text-indigo-600 tracking-tighter">KES {item.unitPrice.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reorder Level</p>
                                                    <p className="text-xs font-black uppercase text-slate-500 italic">{item.reorderLevel || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="col-span-full p-20 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                                            <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-black text-slate-400 uppercase italic">No inventory records found</h3>
                                            <p className="text-xs text-slate-400 mt-2 font-bold uppercase">Add stock to begin managing agrovet supplies</p>
                                        </div>
                                    )}
                                </div>

                                {sales.length > 0 && (
                                    <div className="mt-12">
                                        <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                                            <PayoutIcon className="w-5 h-5 text-indigo-500" />
                                            Recent Sales History
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                        <th className="px-6 pb-2">Farmer</th>
                                                        <th className="px-6 pb-2">Item</th>
                                                        <th className="px-6 pb-2 text-center">Qty</th>
                                                        <th className="px-6 pb-2 text-right">Total Amount</th>
                                                        <th className="px-6 pb-2">Date</th>
                                                        <th className="px-6 pb-2">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sales.slice(0, 10).map(sale => (
                                                        <tr key={sale.id} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                                                            <td className="px-6 py-5 rounded-l-3xl">
                                                                <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(sale.farmerId)}</p>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <p className="text-xs font-black uppercase italic dark:text-slate-300">
                                                                    {inventory.find(i => i.id === sale.itemId)?.itemName || 'Deleted Item'}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-5 text-center font-bold">{sale.quantity}</td>
                                                            <td className="px-6 py-5 text-right font-black text-emerald-600">KES {sale.amount.toLocaleString()}</td>
                                                            <td className="px-6 py-5">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sale.saleDate}</p>
                                                            </td>
                                                            <td className="px-6 py-5 rounded-r-3xl">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                                                    sale.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                                }`}>
                                                                    {sale.paymentStatus}
                                                                </span>
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

                        {activeSubTab === 'sacco' && (
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-black tracking-tighter uppercase">SACCO Accounts</h2>
                                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Open Account</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-4">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                                <th className="px-6 pb-2">Account Holder</th>
                                                <th className="px-6 pb-2">Acc Type</th>
                                                <th className="px-6 pb-2 text-right">Balance</th>
                                                <th className="px-6 pb-2">Status</th>
                                                <th className="px-6 pb-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {saccoAccounts.map(acc => (
                                                <tr key={acc.id} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                                                    <td className="px-6 py-5 rounded-l-3xl">
                                                        <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(acc.farmerId)}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 px-3 py-1.5 rounded-full">
                                                            {acc.accountType}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-emerald-600">KES {acc.balance.toLocaleString()}</td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{acc.status}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right rounded-r-3xl">
                                                        <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">View Statement</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}


                {activeSubTab === 'reports' && (() => {
                    const StatementsManager = () => {
                        const [targetType, setTargetType] = useState<'farmer' | 'rider'>('farmer');
                        const [targetId, setTargetId] = useState('');
                        const [stStartDate, setStStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
                        const [stEndDate, setStEndDate] = useState(new Date().toISOString().split('T')[0]);
                        const [stSearch, setStSearch] = useState('');
                        const [isBulkDispatching, setIsBulkDispatching] = useState(false);

                        const filteredTargets = useMemo(() => {
                            const list = targetType === 'farmer' ? farmers : riders;
                            return list.filter(item => 
                                item.name?.toLowerCase().includes(stSearch.toLowerCase()) || 
                                (targetType === 'farmer' && (item as CoopFarmer).accountNumber?.includes(stSearch))
                            );
                        }, [targetType, stSearch]);

                        const selectedEntity = (targetType === 'farmer' ? farmers : riders).find(e => e.id === targetId);

                        const transactions = useMemo(() => {
                            if (!targetId) return [];
                            let list: any[] = [];
                            
                            if (targetType === 'farmer') {
                                collections.filter(c => c.farmerId === targetId && c.factoryConfirmed && c.collectionDate >= stStartDate && c.collectionDate <= stEndDate)
                                    .forEach(c => list.push({
                                        id: c.id,
                                        date: c.collectionDate,
                                        description: `Collection: ${c.productType} (${c.finalQuantity || c.quantity} ${c.unit})`,
                                        ref: c.id.substring(0, 8).toUpperCase(),
                                        type: 'credit',
                                        amount: (c.finalQuantity || c.quantity) * payoutRate,
                                        quantity: c.finalQuantity || c.quantity
                                    }));

                                sales.filter(s => s.farmerId === targetId && s.saleDate >= stStartDate && s.saleDate <= stEndDate)
                                    .forEach(s => list.push({
                                        id: s.id,
                                        date: s.saleDate,
                                        description: `Agrovet Purchase (Deducted)`,
                                        ref: s.id.substring(0, 8).toUpperCase(),
                                        type: 'debit',
                                        amount: s.amount
                                    }));

                                payouts.filter(p => p.farmerId === targetId && p.status === 'paid' && p.processedAt && p.processedAt >= stStartDate && p.processedAt <= stEndDate)
                                    .forEach(p => list.push({
                                        id: p.id,
                                        date: p.processedAt,
                                        description: `Monthly Payout (${p.payoutMonth})`,
                                        ref: p.id.substring(0, 8).toUpperCase(),
                                        type: 'debit',
                                        amount: p.netPayout
                                    }));
                            } else {
                                collections.filter(c => c.riderId === targetId && c.factoryConfirmed && c.collectionDate >= stStartDate && c.collectionDate <= stEndDate)
                                    .forEach(c => list.push({
                                        id: c.id,
                                        date: c.collectionDate,
                                        description: `Delivery: Farmer ${getFarmerName(c.farmerId)}`,
                                        ref: c.id.substring(0, 8).toUpperCase(),
                                        type: 'credit',
                                        amount: 10,
                                        quantity: c.finalQuantity || c.quantity
                                    }));
                            }

                            list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            let currentBal = 0;
                            return list.map(t => {
                                if (t.type === 'credit') currentBal += t.amount; else currentBal -= t.amount;
                                return { ...t, balance: currentBal };
                            });
                        }, [targetId, targetType, stStartDate, stEndDate]);

                        const totals = useMemo(() => {
                            return transactions.reduce((acc, t) => {
                                if (t.type === 'credit') acc.credit += t.amount; else acc.debit += t.amount;
                                acc.balance = t.balance;
                                return acc;
                            }, { credit: 0, debit: 0, balance: 0 });
                        }, [transactions]);

                        const handlePreview = async () => {
                            if (!selectedEntity) return alert("Select a recipient first");
                            try {
                                let dataUri = '';
                                if (targetType === 'farmer') {
                                    dataUri = await pdfService.generateFarmerStatementPdf(
                                        selectedEntity as CoopFarmer, transactions, 0, totals, stStartDate, stEndDate, 
                                        {} as any, undefined, null
                                    );
                                } else {
                                    dataUri = await pdfService.generateRiderStatementPdf(
                                        selectedEntity as CoopRider, transactions, 0, totals, stStartDate, stEndDate, 
                                        {} as any, undefined, null
                                    );
                                }
                                const link = document.createElement('a');
                                link.href = dataUri;
                                link.download = `Statement_${selectedEntity.name}_${stStartDate}.pdf`;
                                link.click();
                            } catch (err) { alert("Failed to generate PDF"); }
                        };

                        const handleBulkDispatch = async () => {
                            const list = targetType === 'farmer' ? farmers : riders;
                            if (!confirm(`Generate and send statements to all ${list.length} ${targetType}s?`)) return;
                            setIsBulkDispatching(true);
                            try {
                                for (const entity of list) {
                                    // Implementation of bulk upload and SMS/Email would go here
                                    // following the pattern in PropertyManagementView.tsx
                                    await new Promise(r => setTimeout(r, 100)); // Simulate work
                                }
                                alert(`Bulk dispatch complete.`);
                            } catch (err) { alert("Failed in bulk process"); }
                            finally { setIsBulkDispatching(false); }
                        };

                        return (
                            <div className="space-y-8 animate-fade-in pb-20">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Entity Type</label>
                                            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1">
                                                <button onClick={() => { setTargetType('farmer'); setTargetId(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'farmer' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Farmer</button>
                                                <button onClick={() => { setTargetType('rider'); setTargetId(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${targetType === 'rider' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Rider</button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Search {targetType === 'farmer' ? 'Farmer' : 'Rider'}</label>
                                            <input type="text" value={stSearch} onChange={e => setStSearch(e.target.value)} placeholder="Search names..." className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 font-bold outline-none text-sm dark:text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 font-bold outline-none text-sm appearance-none dark:text-white">
                                                <option value="">--- Select {targetType === 'farmer' ? 'Farmer' : 'Rider'} ---</option>
                                                {filteredTargets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <input type="date" value={stStartDate} onChange={e => setStStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 font-bold outline-none text-sm dark:text-white" />
                                            <input type="date" value={stEndDate} onChange={e => setStEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 font-bold outline-none text-sm dark:text-white" />
                                        </div>
                                        <div className="pt-4 space-y-3">
                                            <button onClick={handlePreview} className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2"><EyeIcon className="w-4 h-4" /> Preview PDF</button>
                                            <button onClick={() => alert("Email integration requires setup")} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2"><EmailIcon className="w-4 h-4" /> Send Email</button>
                                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2"></div>
                                            <button onClick={handleBulkDispatch} disabled={isBulkDispatching} className="w-full py-4 border-2 border-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50">{isBulkDispatching ? "Processing..." : "Bulk Monthly Dispatch"}</button>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
                                        <div className="p-8 border-b border-slate-50 dark:border-slate-900/30 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Statement Preview</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{stStartDate} to {stEndDate}</p>
                                            </div>
                                            {targetId && (
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">Closing Balance</p>
                                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic">KES {totals.balance.toLocaleString()}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-auto max-h-[600px]">
                                            {targetId ? (
                                                <table className="w-full text-left">
                                                    <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-10">
                                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                                                            <th className="p-6 text-left">Date</th>
                                                            <th className="p-6 text-left">Description</th>
                                                            <th className="p-6 text-right">Debit</th>
                                                            <th className="p-6 text-right">Credit</th>
                                                            <th className="p-6 text-right">Balance</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {transactions.map(t => (
                                                            <tr key={t.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                                <td className="p-6 text-[10px] font-bold text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                                                                <td className="p-6 text-xs font-black text-slate-900 dark:text-white uppercase italic">{t.description}</td>
                                                                <td className="p-6 text-right text-sm font-black text-rose-500 italic">{t.type === 'debit' ? `KES ${t.amount.toLocaleString()}` : '-'}</td>
                                                                <td className="p-6 text-right text-sm font-black text-emerald-600 italic">{t.type === 'credit' ? `KES ${t.amount.toLocaleString()}` : '-'}</td>
                                                                <td className="p-6 text-right text-sm font-black text-indigo-600 italic">KES {t.balance.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-40">
                                                    <StatementIcon className="w-16 h-16 text-slate-300 mb-6" />
                                                    <h4 className="text-lg font-black text-slate-400 uppercase italic">Select an entity to preview data</h4>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    };

                    return (
                        <div className="p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter uppercase">Operational Intelligence</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced Financial Reporting & Yield Analytics</p>
                            </div>
                            <div className="flex bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-2xl w-fit">
                                <button 
                                    onClick={() => setReportSubTab('overview')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        reportSubTab === 'overview' 
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Operational Overview
                                </button>
                                <button 
                                    onClick={() => setReportSubTab('payouts')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        reportSubTab === 'payouts' 
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Settlement Schedule
                                </button>
                                <button 
                                    onClick={() => setReportSubTab('ledger')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        reportSubTab === 'ledger' 
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Financial Ledger
                                </button>
                                <button 
                                    onClick={() => setReportSubTab('statements')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        reportSubTab === 'statements' 
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    Statements
                                </button>
                            </div>
                        </div>

                        {reportSubTab === 'overview' && (
                            <>
                                {/* Top Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 animate-fade-in">
                                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Net Cash Position</p>
                                        <h4 className="text-3xl font-black tracking-tighter">
                                            KES {(income.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                                        </h4>
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full">
                                            Cashbook Balance
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Receivables</p>
                                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                            KES {income.reduce((s, i) => s + i.amount, 0).toLocaleString()}
                                        </h4>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">+ Gross Income</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Payables</p>
                                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                            KES {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                                        </h4>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2">- Operating Expenses</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-12">
                                    {/* Yield Analytics */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 animate-fade-in-up">
                                        <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                            <FarmerIcon className="w-5 h-5 text-indigo-500" />
                                            Yield Production Analytics
                                        </h3>
                                        <div className="space-y-6">
                                            {['Milk', 'Coffee', 'Tea', 'Pyrethrum'].map(prod => {
                                                const prodTotal = collections.filter(c => c.productType === prod && c.factoryConfirmed).reduce((s, c) => s + Number(c.finalQuantity), 0);
                                                const maxProd = Math.max(...['Milk', 'Coffee', 'Tea', 'Pyrethrum'].map(p => collections.filter(c => c.productType === p && c.factoryConfirmed).reduce((s, c) => s + Number(c.finalQuantity), 0)), 1);
                                                const percentage = (prodTotal / maxProd) * 100;
                                                
                                                return (
                                                    <div key={prod}>
                                                        <div className="flex justify-between items-end mb-2">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{prod}</p>
                                                            <p className="text-sm font-black tracking-tight">{prodTotal.toLocaleString()} Units</p>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {reportSubTab === 'payouts' && (
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in shadow-xl shadow-indigo-500/5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-1">Payment Schedule Report</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Settlement Summary</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl flex items-center gap-2">
                                            <select 
                                                value={filterMonth} 
                                                onChange={e => setFilterMonth(Number(e.target.value))}
                                                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-2 dark:text-white"
                                            >
                                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                    <option key={i} value={i} className="dark:bg-slate-800">{m}</option>
                                                ))}
                                            </select>
                                            <select 
                                                value={filterYear} 
                                                onChange={e => setFilterYear(Number(e.target.value))}
                                                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-2 dark:text-white"
                                            >
                                                {[2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y} className="dark:bg-slate-800">{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button 
                                            onClick={handleSettlementPreview}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                        >
                                            <ExportIcon className="w-4 h-4" />
                                            Preview PDF
                                        </button>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl flex items-center gap-3">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Rate (KES/Unit):</label>
                                            <input 
                                                type="number" 
                                                value={payoutRate} 
                                                onChange={e => setPayoutRate(Number(e.target.value))}
                                                className="w-20 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs font-black outline-none border border-slate-100 dark:border-slate-700 dark:text-white" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                <th className="pb-4">Farmer Name</th>
                                                <th className="pb-4 text-center">Total Qty</th>
                                                <th className="pb-4">Gross Payout</th>
                                                <th className="pb-4">Advances</th>
                                                <th className="pb-4">Deductions</th>
                                                <th className="pb-4 text-right">Net Payout</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                            {farmers.map(farmer => {
                                                const farmerCollections = collections.filter(c => 
                                                    c.farmerId === farmer.id && 
                                                    c.factoryConfirmed && 
                                                    new Date(c.collectionDate).getMonth() === filterMonth &&
                                                    new Date(c.collectionDate).getFullYear() === filterYear
                                                );
                                                const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                                                const gross = totalQty * payoutRate;
                                                
                                                const advances = expenses.filter(ex => 
                                                    ex.farmerId === farmer.id && 
                                                    ex.category.toLowerCase().includes('advance') &&
                                                    new Date(ex.date).getMonth() === filterMonth &&
                                                    new Date(ex.date).getFullYear() === filterYear
                                                ).reduce((s, ex) => s + ex.amount, 0);

                                                const deductions = sales.filter(s => 
                                                    s.farmerId === farmer.id && 
                                                    new Date(s.saleDate).getMonth() === filterMonth &&
                                                    new Date(s.saleDate).getFullYear() === filterYear
                                                ).reduce((acc, sa) => acc + sa.amount, 0);

                                                const net = gross - advances - deductions;

                                                if (totalQty === 0 && advances === 0 && deductions === 0) return null;

                                                return (
                                                    <tr key={farmer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                        <td className="py-5">
                                                            <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{farmer.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{farmer.phone}</p>
                                                        </td>
                                                        <td className="py-5 text-center">
                                                            <span className="text-sm font-bold dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">{totalQty.toLocaleString()}</span>
                                                        </td>
                                                        <td className="py-5 font-bold dark:text-slate-200">KES {gross.toLocaleString()}</td>
                                                        <td className="py-5 text-rose-500 font-bold">- KES {advances.toLocaleString()}</td>
                                                        <td className="py-5 text-rose-500 font-bold">- KES {deductions.toLocaleString()}</td>
                                                        <td className="py-5 text-right">
                                                            <span className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-500/20 uppercase tracking-widest block w-fit ml-auto">
                                                                KES {net.toLocaleString()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {farmers.filter(farmer => {
                                        const c = collections.some(col => col.farmerId === farmer.id && col.factoryConfirmed && new Date(col.collectionDate).getMonth() === filterMonth && new Date(col.collectionDate).getFullYear() === filterYear);
                                        const e = expenses.some(ex => ex.farmerId === farmer.id && ex.category.toLowerCase().includes('advance') && new Date(ex.date).getMonth() === filterMonth && new Date(ex.date).getFullYear() === filterYear);
                                        const s = sales.some(sa => sa.farmerId === farmer.id && new Date(sa.saleDate).getMonth() === filterMonth && new Date(sa.saleDate).getFullYear() === filterYear);
                                        return c || e || s;
                                    }).length === 0 && (
                                        <div className="py-12 text-center border-t border-slate-50 dark:border-slate-800">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No payout data for selected period</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {reportSubTab === 'ledger' && (
                            <div className="space-y-12 animate-fade-in">
                                {/* Trial Balance / Modern Report */}
                                <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm shadow-xl shadow-indigo-500/5">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
                                        <PayoutIcon className="w-5 h-5 text-indigo-500" />
                                        Snapshot: Trial Balance
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Income (Credit)</p>
                                            <p className="text-sm font-black text-emerald-600">KES {income.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Expenses (Debit)</p>
                                            <p className="text-sm font-black text-rose-600">KES {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SACCO Assets</p>
                                            <p className="text-sm font-black text-indigo-600">KES {saccoAccounts.reduce((s, a) => s + a.balance, 0).toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agrovet Inventory Value</p>
                                            <p className="text-sm font-black text-slate-600 dark:text-slate-400">KES {(inventory.reduce((s, i) => s + (i.quantity * i.unitPrice), 0)).toLocaleString()}</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-8">
                                            <div className="bg-slate-900 dark:bg-indigo-600 px-6 py-4 rounded-2xl w-full flex justify-between items-center shadow-xl shadow-indigo-500/20">
                                                <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Retained Earnings</p>
                                                <p className="text-xl font-black text-white tracking-widest">
                                                    KES {(income.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity Mini Ledger */}
                                <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm shadow-xl shadow-indigo-500/5">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-8">Consolidated Cashbook (Latest Activities)</h3>
                                    <div className="space-y-3">
                                        {[...income.map(i => ({...i, type: 'income'})), ...expenses.map(e => ({...e, type: 'expense'}))]
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .slice(0, 8)
                                            .map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-1 h-8 rounded-full ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{(item as any).companyName || (item as any).description}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm font-black ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {item.type === 'income' ? '+' : '-'} KES {item.amount.toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {reportSubTab === 'statements' && <StatementsManager />}
                    </div>
                );
            })()}

            {activeSubTab === 'communication' && (
                <div className="space-y-8 animate-fade-in px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase">Broadcast & Communications</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send SMS and Email notifications to farmers, riders, and staff</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8">
                            <CommunicationsManager 
                                users={users}
                                departments={departments}
                                courses={courses}
                                currentInstitution={currentInstitution}
                                smsConfig={smsConfig}
                                moduleContext="cooperative"
                                onSendSms={async (recipient, message, config, units, instId) => {
                                    // Implementation for sending SMS
                                    try {
                                        const result = await apiService.sendSms({
                                            to: recipient,
                                            message,
                                            institutionId: instId || currentInstitution?.id || ''
                                        });
                                        return { success: true, message: 'Sent' };
                                    } catch (err) {
                                        return { success: false, message: 'Failed to send' };
                                    }
                                }}
                                onRefreshData={() => {}}
                                smsBalance={currentInstitution?.smsBalance || 0}
                            />
                        </div>
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                        <SaccoIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-tight">Billing Preferences</h3>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Farmer SMS Billing Policy</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Monthly SMS Billing</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Bill farmers for notifications</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={currentInstitution?.farmerSmsBillingEnabled || false}
                                                onChange={(e) => onUpdateInstitution?.(currentInstitution!.id, { farmerSmsBillingEnabled: e.target.checked })}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                                        <p className="text-[9px] text-amber-600 dark:text-amber-500/80 leading-relaxed font-bold uppercase tracking-tight">
                                            When enabled, farmers will be automatically billed for SMS notifications sent to them throughout the month.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'settings' && (
                <div className="p-8">
                    <div className="mb-8">
                        <h2 className="text-xl font-black tracking-tighter uppercase">Portal Configuration</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage branding, institution profile and system settings</p>
                    </div>
                    <SettingsManager
                        currentUser={currentUser}
                        currentInstitution={currentInstitution}
                        onUpdateInstitution={onUpdateInstitution}
                        onUpdateLogo={onUpdateLogo}
                        onUpdateFooterImage={onUpdateFooterImage}
                        onSaveLetterheadConfig={onSaveLetterheadConfig}
                        logoUrl={logoUrl || null}
                        footerImageUrl={footerImageUrl || null}
                        companyDetails={companyDetails}
                        onUpdateCompanyDetails={props.onUpdateCompanyDetails}
                        letterheadConfig={letterheadConfig}
                        isCoop={true}
                        users={users}
                        onAddUser={onAddUser}
                        onEditUser={onEditUser}
                        onDeleteUser={onDeleteUser}
                        onImportUsers={onImportUsers}
                        smsConfig={smsConfig}
                        departments={departments}
                        subjects={subjects}
                        courses={courses}
                        academicLevels={[]}
                        buildings={[]}
                        rooms={[]}
                        allocations={[]}
                        academicYears={[]}
                        semesters={[]}
                        themeColor="#4f46e5"
                        onRefreshData={() => {}}
                        onImportStudents={onImportStudents}
                        onWithdrawRequest={onWithdrawRequest}
                        onAddExtensionRequest={onAddExtensionRequest}
                        timetableSettings={{ 
                            operatingDays: [], 
                            startTime: '08:00', 
                            endTime: '17:00', 
                            periods: [], 
                            breaks: [], 
                            cellSpanMinutes: 60,
                            periodLengthMinutes: 60,
                            maxPeriodsPerDay: 8,
                            minWeeklyPeriods: 0,
                            maxWeeklyPeriods: 40,
                            constraints: []
                        }}
                        examTimetableSettings={{ sessionsPerDay: [], rules: [] }}
                    />
                </div>
            )}

            {showImportModal && currentInstitution && currentUser && (
                <SmartFarmerImporterModal
                    onClose={() => setShowImportModal(false)}
                    onImport={async (farmersToImport) => {
                        if (onImportFarmers) {
                            await onImportFarmers(farmersToImport);
                        } else {
                            // Fallback if not provided
                            for (const f of farmersToImport) {
                                await onAddFarmer(f);
                            }
                        }
                    }}
                    existingFarmers={farmers}
                    currentInstitution={currentInstitution}
                    currentUser={currentUser}
                />
            )}

            {showCollectionImportModal && currentInstitution && currentUser && (
                <SmartCollectionImporterModal
                    onClose={() => setShowCollectionImportModal(false)}
                    onImport={async (collectionsToImport) => {
                        if (onImportCollections) {
                            await onImportCollections(collectionsToImport);
                        } else {
                            // Fallback
                            for (const c of collectionsToImport) {
                                await onLogCollection(c);
                            }
                        }
                    }}
                    farmers={farmers}
                    currentInstitution={currentInstitution}
                    currentUser={currentUser}
                />
            )}
            {editingFarmer && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[300] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden animate-fade-in-up">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                    <CogIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Edit Farmer</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingFarmer.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingFarmer(null)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.name || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, name: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.phone || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, phone: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Member ID</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.memberId || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, memberId: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Number</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.accountNumber || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, accountNumber: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">National ID</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.nationalId || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, nationalId: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">KRA PIN</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.kraPin || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, kraPin: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Location / Route</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.location || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, location: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assigned Rider (Collection Partner)</label>
                                <select 
                                    value={editingFarmer.riderId || ''} 
                                    onChange={e => setEditingFarmer({...editingFarmer, riderId: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                >
                                    <option value="">No Rider Assigned</option>
                                    {riders.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.vehiclePlate || r.licenseNumber})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Status</label>
                                <div className="flex gap-4">
                                    {(['active', 'inactive'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setEditingFarmer({...editingFarmer, status: s})}
                                            className={`flex-1 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                editingFarmer.status === s 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        await onUpdateFarmer(editingFarmer.id, editingFarmer);
                                        setEditingFarmer(null);
                                    } catch (err) {
                                        alert("Failed to update farmer record.");
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Updating...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

