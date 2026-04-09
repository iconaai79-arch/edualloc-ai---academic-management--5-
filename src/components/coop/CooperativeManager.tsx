
import React, { useState, useMemo } from 'react';
import { UsersIcon } from '../icons/UsersIcon';
import { ClipboardListIcon as CollectionIcon } from '../icons/ClipboardListIcon';
import { TruckIcon as LogisticsIcon } from '../icons/TruckIcon';
import { ChartPieIcon as ReportsIcon } from '../icons/ChartPieIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { FilterIcon } from '../icons/FilterIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ShoppingCartIcon as StoreIcon } from '../icons/ShoppingCartIcon';
import { CreditCardIcon as SaccoIcon } from '../icons/CreditCardIcon';
import { BanknotesIcon as PayoutIcon } from '../icons/BanknotesIcon';
import { SparklesIcon as FarmerIcon } from '../icons/SparklesIcon';
import { CurrencyIcon as FinanceIcon } from '../icons/CurrencyIcon';
import { CheckCircleIcon as ApprovalIcon } from '../icons/CheckCircleIcon';
import { FileTextIcon as StatementIcon } from '../icons/FileTextIcon';
import { EnvelopeIcon as EmailIcon } from '../icons/EnvelopeIcon';
import { SendIcon as SmsIcon } from '../icons/SendIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { ArrowUpRightIcon as ExportIcon } from '../icons/ArrowUpRightIcon';
import { Cog8ToothIcon as CogIcon } from '../icons/Cog8ToothIcon';
import { InformationCircleIcon as AlertIcon } from '../icons/InformationCircleIcon';
import { UploadIcon as UploadCloud } from '../icons/UploadIcon';
import { Trash2Icon as TrashIcon } from '../icons/Trash2Icon';
import { ArrowPathIcon as ResetIcon } from '../icons/ArrowPathIcon';
import { MinusIcon } from '../icons/MinusIcon';
import { CheckCircleIcon as SuccessIcon } from '../icons/CheckCircleIcon';
import { XIcon } from '../icons/XIcon';

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
    onDisbursePayouts?: (payoutIds: string[]) => Promise<void>;
    onAddPayouts?: (payouts: any[]) => Promise<void>;
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
    onAddSales?: (data: Partial<CoopAgrovetSales>[]) => Promise<void>;
    onSendSms?: (recipient: string, message: string, config?: any, units?: number, institutionId?: string) => Promise<any>;
    onAddSaccoAccount?: (data: Partial<SaccoAccount>) => Promise<void>;
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
    onDisbursePayouts,
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
    onAddSale,
    onAddSales,
    onSendSms,
    onAddSaccoAccount
}) => {
    const [localActiveSubTab, setLocalActiveSubTab] = useState<'overview' | 'farmers' | 'collections' | 'logistics' | 'agrovet' | 'sacco' | 'payouts' | 'finances' | 'approvals' | 'reports' | 'communication' | 'settings'>('overview');
    const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'archive' | 'disbursed'>('pending');
    const [farmerSubTab, setFarmerSubTab] = useState<'registry' | 'collections' | 'logistics' | 'payouts'>('registry');
    const [payoutRate, setPayoutRate] = useState<number>(currentInstitution?.coopSettings?.payoutRate || 50);
    
    const formatDateString = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        return formatDateString(new Date(d.getFullYear(), d.getMonth(), 1));
    });
    const [endDate, setEndDate] = useState<string>(() => {
        const d = new Date();
        return formatDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    });
    const [payoutStatusFilter, setPayoutStatusFilter] = useState<'pending' | 'approved' | 'paid'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [reportSubTab, setReportSubTab] = useState<'overview' | 'payouts' | 'ledger' | 'statements'>('overview');
    const [isAddingFarmer, setIsAddingFarmer] = useState(false);
    const [isLoggingCollection, setIsLoggingCollection] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showCollectionImportModal, setShowCollectionImportModal] = useState(false);
    const [isAddingInventory, setIsAddingInventory] = useState(false);
    const [isRecordingSale, setIsRecordingSale] = useState(false);
    const [isAddingRider, setIsAddingRider] = useState(false);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [isAddingIncome, setIsAddingIncome] = useState(false);
    const [isOpeningAccount, setIsOpeningAccount] = useState(false);
    const [newSaccoAccount, setNewSaccoAccount] = useState<Partial<SaccoAccount>>({
        accountType: 'Savings',
        status: 'active'
    });
    const [newInventory, setNewInventory] = useState<any>({});
    const [newExpense, setNewExpense] = useState<Partial<CoopExpense>>({
        date: formatDateString(new Date()),
        category: 'General Operations'
    });
    const [newIncome, setNewIncome] = useState<Partial<CoopIncome>>({
        date: formatDateString(new Date()),
        quantity: 0,
        unit: 'kgs'
    });
    const [newSale, setNewSale] = useState<Partial<CoopAgrovetSales>>({
        saleDate: formatDateString(new Date()),
        paymentStatus: 'paid'
    });
    const [isSavingRate, setIsSavingRate] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState<CoopFarmer | null>(null);
    const [riderVolumes, setRiderVolumes] = useState<Record<string, string>>({});

    // Verification Logic
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [userEnteredCode, setUserEnteredCode] = useState('');
    const [pendingApprovalIds, setPendingApprovalIds] = useState<string[]>([]);
    const [isUndoVerification, setIsUndoVerification] = useState(false);

    // POS System States
    const [posBasket, setPosBasket] = useState<any[]>([]);
    const [posHeldSales, setPosHeldSales] = useState<any[]>([]);
    const [agrovetFarmerSearchQuery, setAgrovetFarmerSearchQuery] = useState('');
    const [agrovetItemSearchQuery, setAgrovetItemSearchQuery] = useState('');
    const [posSaleDate, setPosSaleDate] = useState(formatDateString(new Date()));
    
    // Disbursement States
    const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
    const [disbursementMethod, setDisbursementMethod] = useState<'mpesa' | 'bank' | 'cash' | 'cheque' | 'default'>('default');
    const [disbursementReference, setDisbursementReference] = useState('');
    const [disbursementAccount, setDisbursementAccount] = useState('');
    const [disbursementDate, setDisbursementDate] = useState(formatDateString(new Date()));
    const [disbursementBatchIds, setDisbursementBatchIds] = useState<string[]>([]);
    const [processViaIntegratedApi, setProcessViaIntegratedApi] = useState(false);

    const [posFarmerId, setPosFarmerId] = useState('');
    const [posStatus, setPosStatus] = useState<'paid' | 'credit'>('paid');
    const [isPOSHeldView, setIsPOSHeldView] = useState(false);
    const [newFarmer, setNewFarmer] = useState<Partial<CoopFarmer>>({
        status: 'active',
        joinedAt: formatDateString(new Date()),
        paymentMethod: 'mpesa'
    });
    const [newCollection, setNewCollection] = useState<Partial<CoopCollection>>({
        collectionDate: formatDateString(new Date()),
        productType: 'milk',
        unit: 'kgs',
        factoryConfirmed: false,
        notified: false
    });
    const [newRider, setNewRider] = useState<Partial<CoopRider>>({
        status: 'active'
    });

    const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'approved'>('pending');
    const [processingItems, setProcessingItems] = useState<string[]>([]);

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

    React.useEffect(() => {
        setSelectedCollections([]);
        setCurrentPage(1);
    }, [startDate, endDate, searchTerm]);



    const getFarmerName = (id?: string) => {
        if (!id) return 'Unknown Farmer';
        const farmer = farmers.find(f => f.id === id);
        return farmer ? farmer.name : 'Unknown Farmer';
    };

    const filteredCollections = useMemo(() => {
        return collections.filter(c => {
            if (!c.collectionDate) return false;
            // Use substring for robust local day comparison (avoids timezone shifts)
            const dateStr = c.collectionDate.substring(0, 10);
            
            const matchesDate = dateStr >= startDate && dateStr <= endDate;
            
            const farmer = farmers.find(f => f.id === c.farmerId);
            const farmerName = farmer?.name || '';
            const farmerPhone = farmer?.phone || '';
            const farmerNationalId = farmer?.nationalId || '';
            const farmerMemberId = farmer?.memberId || '';

            const matchesSearch = !searchTerm || 
                farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                farmerPhone.includes(searchTerm) ||
                farmerNationalId.includes(searchTerm) ||
                farmerMemberId.includes(searchTerm) ||
                (c.productType || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesSearch;
        }).sort((a, b) => new Date(b.collectionDate).getTime() - new Date(a.collectionDate).getTime());
    }, [collections, startDate, endDate, searchTerm, farmers]);

    const paginatedCollections = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCollections.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCollections, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);


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
            setNewFarmer({ status: 'active', joinedAt: formatDateString(new Date()) });
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
            const payoutRate = currentInstitution?.coopSettings?.payoutRate || 50;
            const collectionWithPayout = {
                ...newCollection,
                id: `c_${Date.now()}`,
                institutionId: currentInstitution?.id || '',
                estimatedPayout: Number(newCollection.quantity) * payoutRate
            };
            await onLogCollection(collectionWithPayout);
            setIsLoggingCollection(false);
            setNewCollection({
                collectionDate: formatDateString(new Date()),
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
            setIsProcessing(false);
        }
    };

    const handleConfirmAllLog = async () => {
        const pending = filteredCollections.filter(c => !c.factoryConfirmed);
        if (pending.length === 0) {
            alert("No pending records to confirm for the selected month.");
            return;
        }
        if (!confirm(`Confirm ALL ${pending.length} pending intake records for the period ${startDate} to ${endDate}?`)) return;

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
            setIsProcessing(false);
        }
    };

    const handleGeneratePayoutDrafts = async () => {
        if (!onAddPayouts) return;
        if (!confirm(`Generate draft payouts for all farmers for the period ${startDate} to ${endDate}?`)) return;

        setIsProcessing(true);
        try {
            const drafts: any[] = [];
            const startD = new Date(startDate);
            const payoutMonth = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-01`;

            for (const farmer of farmers) {
                // Check if draft already exists
                const exists = payouts.find(p => p.farmerId === farmer.id && p.payoutMonth === payoutMonth);
                if (exists) continue;

                const farmerCollections = collections.filter(c => {
                    if (!c.collectionDate || !c.factoryConfirmed) return false;
                    const dateStr = c.collectionDate.substring(0, 10);
                    return c.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                });
                
                const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                const gross = totalQty * payoutRate;
                
                const advances = expenses.filter(ex => {
                    if (!ex.date) return false;
                    const dateStr = ex.date.substring(0, 10);
                    return ex.farmerId === farmer.id && 
                           ex.category.toLowerCase().includes('advance') &&
                           dateStr >= startDate && dateStr <= endDate;
                }).reduce((s, ex) => s + ex.amount, 0);

                const agrovetDeduction = sales.filter(s => {
                    if (!s.saleDate) return false;
                    const dateStr = s.saleDate.substring(0, 10);
                    return s.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                }).reduce((acc, sa) => acc + sa.amount, 0);

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
            const startD = new Date(startDate);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = monthNames[startD.getMonth()];
            const year = startD.getFullYear();
            
            const settlementData = farmers.map(farmer => {
                const farmerCollections = collections.filter(c => {
                    if (!c.collectionDate || !c.factoryConfirmed) return false;
                    const dateStr = c.collectionDate.substring(0, 10);
                    return c.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                });
                const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                const gross = totalQty * payoutRate;
                
                const advances = expenses.filter(ex => {
                    if (!ex.date) return false;
                    const dateStr = ex.date.substring(0, 10);
                    return ex.farmerId === farmer.id && 
                           ex.category.toLowerCase().includes('advance') &&
                           dateStr >= startDate && dateStr <= endDate;
                }).reduce((s, ex) => s + ex.amount, 0);

                const deductions = sales.filter(s => {
                    if (!s.saleDate) return false;
                    const dateStr = s.saleDate.substring(0, 10);
                    return s.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                }).reduce((acc, sa) => acc + sa.amount, 0);

                const net = gross - advances - deductions;
                return { name: farmer.name, phone: farmer.phone, totalQty, gross, advances, deductions, net };
            }).filter(item => item.totalQty > 0 || item.advances > 0 || item.deductions > 0);

            const totalNet = settlementData.reduce((sum, item) => sum + item.net, 0);

            const dataUri = await pdfService.generateCoopSettlementSchedulePdf(
                settlementData, 
                monthName, 
                year, 
                totalNet, 
                currentInstitution || {} as any, 
                undefined, 
                null
            );
            
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `Settlement_Schedule_${startDate}_to_${endDate}.pdf`;
            link.click();
        } catch (err) {
            console.error(err);
            alert("Failed to generate settlement PDF");
        }
    };

    const filteredFarmers = useMemo(() => {
        return farmers.filter(f => 
            f.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            f.phone?.includes(searchTerm) ||
            f.nationalId?.includes(searchTerm) ||
            f.memberId?.includes(searchTerm)
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
        return payouts.filter(p => {
            if (!p.payoutMonth) return false;
            const matchesMonth = p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate;
            return matchesMonth && p.status === payoutStatusFilter;
        });
    };

    const stats = useMemo(() => {
        const today = formatDateString(new Date());
        const todayCollections = collections.filter(c => c.collectionDate && c.collectionDate.substring(0, 10) === today);
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


    const getRiderName = (id?: string) => riders.find(r => r.id === id)?.name || 'N/A';

    const filteredApprovalPayouts = useMemo(() => {
        return payouts.filter(p => {
            const farmer = farmers.find(f => f.id === p.farmerId);
            const matchesSearch = !searchTerm || (
                (farmer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (farmer?.memberId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (farmer?.phone || '').includes(searchTerm) ||
                (farmer?.nationalId || '').includes(searchTerm) ||
                (p.payoutMonth || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesTab = approvalSubTab === 'pending' ? p.status === 'pending' : p.status === 'approved';
            return matchesSearch && matchesTab;
        });
    }, [payouts, searchTerm, farmers, approvalSubTab]);

    const filteredApprovalCollections = useMemo(() => {
        return collections.filter(c => {
            const farmer = farmers.find(f => f.id === c.farmerId);
            const matchesSearch = !searchTerm || (
                (farmer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (farmer?.memberId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (farmer?.phone || '').includes(searchTerm) ||
                (farmer?.nationalId || '').includes(searchTerm) ||
                (c.productType || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesTab = approvalSubTab === 'pending' 
                ? (c.requiresApproval && c.approvalStatus === 'pending')
                : (c.requiresApproval && c.approvalStatus === 'approved');
            return matchesSearch && matchesTab;
        });
    }, [collections, searchTerm, farmers, approvalSubTab]);

    const handleTriggerVerification = async (ids: string[]) => {
        const chairman = users.find(u => u.role === 'coop_chairman' && u.institutionId === currentInstitution?.id);
        if (!chairman) {
            alert("Approval Required: No Cooperative Chairman found in the system to verify this request. Please onboard a Chairman first.");
            return;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setVerificationCode(code);
        setPendingApprovalIds(ids);
        
        try {
            await onSendSms?.(chairman.phoneNumber, `EduAI Cooperative: Approval Code for ${ids.length} payout(s) is ${code}. Requested by ${currentUser?.name}.`);
            setIsVerifying(true);
        } catch (err) {
            alert("Failed to send verification code to Chairman. Check SMS configuration.");
        }
    };

    const handleConfirmVerification = async () => {
        if (userEnteredCode !== verificationCode) {
            alert("Invalid verification code. Access denied.");
            return;
        }

        setIsVerifying(false);
        setUserEnteredCode('');
        
        try {
            setIsProcessing(true);
            setProcessingProgress(30);
            await onApprovePayouts?.(pendingApprovalIds);
            setProcessingProgress(100);
            setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 500);
        } catch (err: any) {
            alert(`Verified approval failed: ${err.message}`);
            setIsProcessing(false);
        }
    };

    const handleConfirmDisbursement = async () => {
        if (!disbursementBatchIds.length) return;
        
        setIsProcessing(true);
        setProcessingProgress(10);
        
        try {
            if (processViaIntegratedApi) {
                setProcessingProgress(20);
                // Group by method if using defaults
                const methodGroups: Record<string, string[]> = {};
                
                disbursementBatchIds.forEach(id => {
                    const payout = payouts.find(p => p.id === id);
                    const farmer = farmers.find(f => f.id === payout?.farmerId);
                    const method = disbursementMethod === 'default' ? (farmer?.paymentMethod || 'cash') : disbursementMethod;
                    if (!methodGroups[method]) methodGroups[method] = [];
                    methodGroups[method].push(id);
                });

                // Process each group
                const methods = Object.keys(methodGroups);
                for (let i = 0; i < methods.length; i++) {
                    const method = methods[i];
                    const ids = methodGroups[method];
                    setProcessingProgress(20 + ((i + 1) / methods.length * 50));
                    
                    console.log(`Sending bulk payment instructions via ${method} for ${ids.length} payouts...`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate per-gateway logic

                    await apiService.updatePayoutStatus(ids, 'paid', currentUser.id, {
                        disbursementMethod: method as any,
                        disbursementReference: disbursementReference || `REFC-${Date.now()}-${method}`,
                        disbursementAccount,
                        disbursementDate
                    });
                }
            } else {
                // Manual processing update
                await apiService.updatePayoutStatus(disbursementBatchIds, 'paid', currentUser.id, {
                    disbursementMethod: disbursementMethod === 'default' ? 'cash' : disbursementMethod,
                    disbursementReference: disbursementReference || `REFC-${Date.now()}`,
                    disbursementAccount,
                    disbursementDate
                });
            }

            setProcessingProgress(100);
            setTimeout(() => {
                setIsProcessing(false);
                setIsDisbursementModalOpen(false);
                setDisbursementBatchIds([]);
                setDisbursementReference('');
                setDisbursementAccount('');
            }, 500);
            
            if (onLogAction) await onLogAction(`Disbursed ${disbursementBatchIds.length} payouts via ${disbursementMethod}`);
        } catch (err: any) {
            alert(`Disbursement failed: ${err.message}`);
            setIsProcessing(false);
        }
    };

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
    
    const handleSubmitSaccoAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSaccoAccount.farmerId || !newSaccoAccount.accountType) {
            alert("Please select a farmer and account type");
            return;
        }
        setIsProcessing(true);
        try {
            await onAddSaccoAccount?.({
                ...newSaccoAccount,
                id: `sa_${Date.now()}`,
                institutionId: currentInstitution?.id || '',
                createdAt: new Date().toISOString()
            });
            setIsOpeningAccount(false);
            setNewSaccoAccount({ accountType: 'Savings', status: 'active' });
            if (onLogAction) await onLogAction(`Opened SACCO account for farmer ${newSaccoAccount.farmerId}`);
        } catch (err) {
            console.error(err);
            alert("Failed to open SACCO account");
        } finally {
            setIsProcessing(false);
        }
    };

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
                institutionId: currentInstitution?.id || '',
                recordedBy: currentUser.id
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

    const handleSubmitExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount || !newExpense.description || !newExpense.category) {
            alert("Please fill in Amount, Description and Category");
            return;
        }
        setIsProcessing(true);
        try {
            await onAddExpense?.({
                ...newExpense,
                id: `exp_${Date.now()}`,
                institutionId: currentInstitution?.id || '',
                recordedBy: currentUser.id
            } as any);
            setIsAddingExpense(false);
            setNewExpense({ date: formatDateString(new Date()), category: 'General Operations' });
            if (onLogAction) await onLogAction(`Recorded expense: ${newExpense.description}`);
        } catch (err) {
            console.error(err);
            alert("Failed to record expense");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitIncome = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIncome.amount || !newIncome.companyName || !newIncome.productType) {
            alert("Please fill in Amount, Company Name and Product Type");
            return;
        }
        setIsProcessing(true);
        try {
            await onAddIncome?.({
                ...newIncome,
                id: `inc_${Date.now()}`,
                institutionId: currentInstitution?.id || '',
                recordedBy: currentUser.id
            } as any);
            setIsAddingIncome(false);
            setNewIncome({ date: formatDateString(new Date()), quantity: 0, unit: 'kgs' });
            if (onLogAction) await onLogAction(`Recorded income from: ${newIncome.companyName}`);
        } catch (err) {
            console.error(err);
            alert("Failed to record income");
        } finally {
            setIsProcessing(false);
        }
    };

    const addToBasket = (item: CoopAgrovetInventory) => {
        const existing = posBasket.find(i => i.itemId === item.id);
        if (existing) {
            updateBasketQuantity(item.id, existing.quantity + 1);
        } else {
            setPosBasket([...posBasket, { 
                itemId: item.id, 
                itemName: item.itemName, 
                unitPrice: item.unitPrice, 
                quantity: 1, 
                amount: item.unitPrice 
            }]);
        }
    };

    const removeFromBasket = (itemId: string) => {
        setPosBasket(posBasket.filter(i => i.itemId !== itemId));
    };

    const updateBasketQuantity = (itemId: string, qty: number) => {
        if (qty <= 0) {
            removeFromBasket(itemId);
            return;
        }
        setPosBasket(posBasket.map(i => i.itemId === itemId ? { ...i, quantity: qty, amount: i.unitPrice * qty } : i));
    };

    const handlePOSCheckout = async () => {
        if (!posFarmerId) {
            alert("Please select a farmer for this sale");
            return;
        }
        if (posBasket.length === 0) {
            alert("Basket is empty");
            return;
        }

        // Credit Rule Validation
        if (posStatus === 'credit' && currentInstitution?.coopSettings?.requireCurrentMonthDeliveryForCredit) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const hasDeliveryThisMonth = collections.some(col => {
                if (col.farmerId !== posFarmerId) return false;
                const d = new Date(col.collectionDate);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });

            if (!hasDeliveryThisMonth) {
                alert(`Credit access denied: Farmer ${farmers.find(f => f.id === posFarmerId)?.name || 'N/A'} has no milk deliveries recorded for the current month. Please settle with CASH.`);
                setIsProcessing(false);
                return;
            }
        }

        setIsProcessing(true);
        try {
            const saleRecords = posBasket.map(basketItem => ({
                id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                farmerId: posFarmerId,
                itemId: basketItem.itemId,
                quantity: Number(basketItem.quantity),
                amount: Number(basketItem.amount),
                saleDate: posSaleDate,
                paymentStatus: posStatus,
                institutionId: currentInstitution?.id || '',
                recordedBy: currentUser.id
            }));

            if (onAddSales) {
                await onAddSales(saleRecords);
            } else if (onAddSale) {
                // Fallback to sequential if plural is not provided (though it should be now)
                for (const record of saleRecords) {
                    await onAddSale(record);
                }
            }
            
            if (onLogAction) await onLogAction(`Processed POS sale with ${posBasket.length} items for farmer ${posFarmerId}`);
            
            // SMS Notification for Credit Sales
            if (posStatus === 'credit' && onSendSms) {
                const farmer = farmers.find(f => f.id === posFarmerId);
                if (farmer && farmer.phone) {
                    const total = posBasket.reduce((sum, item) => sum + item.amount, 0);
                    const msg = `Dear ${farmer.name}, a credit sale of KES ${total.toLocaleString()} for ${posBasket.length} items has been recorded (Member: ${farmer.memberId || 'N/A'}). This will be deducted from your next payout. Thank you for your continued partnership.`;
                    onSendSms(farmer.phone, msg, smsConfig, 1, currentInstitution?.id).catch(e => console.error("Failed to send credit sale SMS:", e));
                }
            }

            setPosBasket([]);
            setPosFarmerId('');
            setIsRecordingSale(false);
            alert("Sale processed successfully");
        } catch (err: any) {
            console.error(err);
            alert(`Failed to process POS checkout: ${err.message || "Please check your network and try again"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const holdTransaction = () => {
        if (posBasket.length === 0) return;
        const newHold = {
            id: `held_${Date.now()}`,
            basket: [...posBasket],
            farmerId: posFarmerId,
            date: posSaleDate,
            heldAt: new Date().toISOString()
        };
        setPosHeldSales([newHold, ...posHeldSales]);
        setPosBasket([]);
        setPosFarmerId('');
        alert("Transaction held successfully");
    };

    const resumeHold = (heldSale: any) => {
        setPosBasket(heldSale.basket);
        setPosFarmerId(heldSale.farmerId);
        setPosSaleDate(heldSale.date);
        setPosHeldSales(posHeldSales.filter(h => h.id !== heldSale.id));
        setIsPOSHeldView(false);
    };

    const handleSubmitSale = async (e: React.FormEvent) => {
        e.preventDefault();
        // Legacy single item submit replaced by loop in handlePOSCheckout
        handlePOSCheckout();
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
                            { 
                                id: 'approvals', 
                                label: 'Approvals', 
                                icon: <ApprovalIcon className="w-4 h-4" />,
                                badge: collections.filter(c => c.requiresApproval && c.approvalStatus === 'pending').length + payouts.filter(p => p.status === 'pending').length
                            },
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
                                {(tab as any).badge > 0 && (
                                    <span className="ml-2 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                        {(tab as any).badge}
                                    </span>
                                )}
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
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Settlement Method</label>
                                                    <select 
                                                        required
                                                        value={newFarmer.paymentMethod || 'mpesa'} 
                                                        onChange={e => setNewFarmer({...newFarmer, paymentMethod: e.target.value as any})}
                                                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                                    >
                                                        <option value="mpesa">M-PESA</option>
                                                        <option value="bank">Bank Transfer</option>
                                                        <option value="cash">Cash Settlement</option>
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
                                                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Settlement</th>
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
                                                    <td className="py-4 px-6">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                            farmer.paymentMethod === 'bank' ? 'bg-blue-50 text-blue-600' :
                                                            farmer.paymentMethod === 'cash' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {farmer.paymentMethod || 'mpesa'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                            farmer.paymentMethod === 'mpesa' ? 'bg-emerald-50 text-emerald-600' :
                                                            farmer.paymentMethod === 'bank' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-amber-50 text-amber-600'
                                                        }`}>
                                                            {farmer.paymentMethod || 'mpesa'}
                                                        </span>
                                                    </td>
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
                                                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
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
                                        <h2 className="text-xl font-black tracking-tighter uppercase">Payout Processing</h2>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {selectedPayouts.length} Payouts selected
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <input 
                                                        type="date" 
                                                        value={startDate}
                                                        onChange={e => setStartDate(e.target.value)}
                                                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                                    />
                                                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                                                    <input 
                                                        type="date" 
                                                        value={endDate}
                                                        onChange={e => setEndDate(e.target.value)}
                                                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            const d = new Date();
                                                            setStartDate(formatDateString(new Date(d.getFullYear(), d.getMonth(), 1)));
                                                            setEndDate(formatDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
                                                        }}
                                                        className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                                    >
                                                        This Month
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const d = new Date();
                                                            d.setMonth(d.getMonth() - 1);
                                                            setStartDate(formatDateString(new Date(d.getFullYear(), d.getMonth(), 1)));
                                                            setEndDate(formatDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
                                                        }}
                                                        className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                                    >
                                                        Last Month
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-3xl p-1.5 shadow-inner">
                                        {(['pending', 'approved', 'paid'] as const).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setPayoutStatusFilter(status);
                                                    setSelectedPayouts([]);
                                                }}
                                                className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                                    payoutStatusFilter === status 
                                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl scale-[1.02]' 
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                {status === 'pending' ? 'Review Drafts' : status === 'approved' ? 'Approved (Ready)' : 'Payment History'}
                                                {status !== 'paid' && (
                                                    <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-[8px]">
                                                        {payouts.filter(px => px.status === status).length}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {payoutStatusFilter === 'pending' && (currentUser.role === 'cooperative_manager' || currentUser.role === 'coop_chairman' || currentUser.role === 'super_admin') && (
                                            <button 
                                                disabled={selectedPayouts.length === 0 || isProcessing}
                                                onClick={async () => {
                                                    if (window.confirm(`Approve ${selectedPayouts.length} payout drafts for disbursement?`)) {
                                                        setIsProcessing(true);
                                                        await onApprovePayouts?.(selectedPayouts);
                                                        setSelectedPayouts([]);
                                                        setIsProcessing(false);
                                                        onLogAction?.(`Approved ${selectedPayouts.length} payout drafts`);
                                                    }
                                                }}
                                                className="flex items-center gap-2 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                                            >
                                                <SuccessIcon className="w-4 h-4 text-emerald-300" />
                                                Approve Selected
                                            </button>
                                        )}

                                        {payoutStatusFilter === 'approved' && (currentUser.role === 'coop_chairman' || currentUser.role === 'super_admin') && (
                                            <button 
                                                disabled={selectedPayouts.length === 0 || isProcessing}
                                                onClick={async () => {
                                                    if (window.confirm(`Approve and Disburse funds via M-PESA for ${selectedPayouts.length} farmers?`)) {
                                                        setIsProcessing(true);
                                                        await onDisbursePayouts?.(selectedPayouts);
                                                        setSelectedPayouts([]);
                                                        setIsProcessing(false);
                                                        onLogAction?.(`Disbursed bulk M-Pesa payout to ${selectedPayouts.length} farmers`);
                                                    }
                                                }}
                                                className="flex items-center gap-2 bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
                                            >
                                                <PayoutIcon className="w-4 h-4" />
                                                Disburse (M-PESA)
                                            </button>
                                        )}

                                        {payoutStatusFilter === 'pending' && (
                                            <button 
                                                disabled={isProcessing}
                                                onClick={handleGeneratePayoutDrafts}
                                                className="flex items-center gap-2 border-2 border-slate-100 dark:border-slate-700 px-6 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Generate Drafts
                                            </button>
                                        )}
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
                                                <th className="px-6 pb-2 text-center">Settlement</th>
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
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                            farmers.find(f => f.id === p.farmerId)?.paymentMethod === 'bank' ? 'bg-blue-50 text-blue-600' :
                                                            farmers.find(f => f.id === p.farmerId)?.paymentMethod === 'cash' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {farmers.find(f => f.id === p.farmerId)?.paymentMethod || 'mpesa'}
                                                        </span>
                                                    </td>
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
                                                            {p.approvedAt && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-indigo-600">Approved: {new Date(p.approvedAt).toLocaleDateString()}</p>}
                                                            {p.status === 'paid' && (
                                                                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">
                                                                        {p.disbursementMethod?.toUpperCase()} | {p.disbursementReference || 'NO-REF'}
                                                                    </p>
                                                                    <p className="text-[7px] font-bold text-slate-400 uppercase">{p.disbursementDate ? new Date(p.disbursementDate).toLocaleString() : 'Date missing'}</p>
                                                                </div>
                                                            )}
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
                                    <div>
                                        <h2 className="text-xl font-black tracking-tighter uppercase">Daily Intake Log</h2>
                                        <div className="flex items-center gap-4 mt-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {filteredCollections.filter(c => !c.factoryConfirmed).length} Pending Records
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <input 
                                                        type="date" 
                                                        value={startDate}
                                                        onChange={e => setStartDate(e.target.value)}
                                                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                                    />
                                                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                                                    <input 
                                                        type="date" 
                                                        value={endDate}
                                                        onChange={e => setEndDate(e.target.value)}
                                                        className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            const d = new Date();
                                                            setStartDate(formatDateString(new Date(d.getFullYear(), d.getMonth(), 1)));
                                                            setEndDate(formatDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
                                                        }}
                                                        className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                                    >
                                                        This Month
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const d = new Date();
                                                            d.setMonth(d.getMonth() - 1);
                                                            setStartDate(formatDateString(new Date(d.getFullYear(), d.getMonth(), 1)));
                                                            setEndDate(formatDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
                                                        }}
                                                        className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
                                                    >
                                                        Last Month
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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
                                                <SuccessIcon className="w-4 h-4" />
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
                                                        checked={selectedCollections.length > 0 && selectedCollections.length === filteredCollections.filter(c => !c.factoryConfirmed).length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedCollections(filteredCollections.filter(c => !c.factoryConfirmed).map(c => c.id));
                                                            else setSelectedCollections([]);
                                                        }}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-6 pb-2">Farmer</th>
                                                <th className="px-6 pb-2">Product</th>
                                                <th className="px-6 pb-2 text-right uppercase tracking-widest text-[9px]">Rider Qty</th>
                                                <th className="px-6 pb-2 text-right uppercase tracking-widest text-[9px]">Final Qty</th>
                                                <th className="px-6 pb-2 text-right uppercase tracking-widest text-[9px]">Est. Payout</th>
                                                <th className="px-6 pb-2">Status</th>
                                                <th className="px-6 pb-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedCollections.map(col => (
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
                                                    <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white">
                                                        KES {(col.estimatedPayout || (Number(col.finalQuantity || col.quantity) * (currentInstitution?.coopSettings?.payoutRate || 50))).toLocaleString()}
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

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-8 px-6 py-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Page {currentPage} of {totalPages}
                                            </p>
                                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Showing {Math.min(filteredCollections.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredCollections.length, currentPage * itemsPerPage)} of {filteredCollections.length} records
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                                            >
                                                <ChevronRightIcon className="w-5 h-5 rotate-180" />
                                            </button>
                                            
                                            <div className="flex items-center gap-1">
                                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                    let pageNum = currentPage;
                                                    if (currentPage <= 3) pageNum = i + 1;
                                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                    else pageNum = currentPage - 2 + i;
                                                    
                                                    if (pageNum <= 0 || pageNum > totalPages) return null;

                                                    return (
                                                        <button 
                                                            key={pageNum}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-110' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600'}`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <button 
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-all"
                                            >
                                                <ChevronRightIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeSubTab === 'approvals' && (
                    <div className="p-8 animate-fade-in space-y-12 pb-12 relative">
                        {/* High-Fidelity Progress Indicator */}
                        {isProcessing && (
                            <div className="fixed inset-x-0 top-0 z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 border-b border-indigo-100 dark:border-indigo-900/30 shadow-2xl animate-in slide-in-from-top duration-500">
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                                    <ApprovalIcon className={`w-5 h-5 ${processingProgress < 100 ? 'animate-spin' : ''}`} />
                                                </div>
                                                {processingProgress === 100 && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-bounce flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60">Payout System Authorization</h4>
                                                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                                    {processingProgress < 100 ? 'Authorizing Secure Batch...' : 'Batch Successfully Authorized'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black tracking-tighter text-indigo-600 tabular-nums">{processingProgress}%</p>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-[2px]">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-600 rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                                            style={{ width: `${processingProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter uppercase">Board Approvals Queue</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review and authorize sensitive operations</p>
                            </div>
                             {approvalSubTab === 'pending' && filteredApprovalPayouts.length > 0 && (
                                 <button 
                                    onClick={async () => {
                                        const pendingIds = filteredApprovalPayouts.map(p => p.id);
                                        if (window.confirm(`Approve all ${pendingIds.length} matching payout drafts?`)) {
                                            const isChairmanOrSuper = currentUser?.role === 'coop_chairman' || currentUser?.role === 'super_admin';
                                            if (!isChairmanOrSuper) {
                                                handleTriggerVerification(pendingIds);
                                                return;
                                            }
                                            
                                            try {
                                                setIsProcessing(true);
                                                setProcessingProgress(10);
                                                
                                                const interval = setInterval(() => {
                                                    setProcessingProgress(prev => prev >= 90 ? 90 : prev + 10);
                                                }, 200);

                                                await onApprovePayouts?.(pendingIds);
                                                
                                                clearInterval(interval);
                                                setProcessingProgress(100);
                                                setTimeout(() => { setIsProcessing(false); setProcessingProgress(0); }, 600);
                                            } catch (err: any) {
                                                alert(`Global approval failed: ${err.message}`);
                                                setIsProcessing(false);
                                                setProcessingProgress(0);
                                            }
                                        }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                                >
                                    Approve All Payouts
                                </button>
                            )}
                        </div>

                        <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <button
                                onClick={() => setApprovalSubTab('pending')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalSubTab === 'pending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Drafts & Deviations
                            </button>
                            <button
                                onClick={() => setApprovalSubTab('archive')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalSubTab === 'archive' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Approved Archive
                            </button>
                            <button
                                onClick={() => setApprovalSubTab('disbursed')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalSubTab === 'disbursed' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Disbursed History
                            </button>
                        </div>
                        
                        {approvalSubTab === 'pending' ? (
                            <>
                                {/* 1. Financial Payouts Section */}
                                {filteredApprovalPayouts.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                        <PayoutIcon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Financial Payout Drafts ({filteredApprovalPayouts.length})</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredApprovalPayouts.map(p => (
                                        <div key={p.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-black text-slate-400 text-xs">
                                                    {getFarmerName(p.farmerId).substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{getFarmerName(p.farmerId)}</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.payoutMonth} · Net Payout</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount Due</p>
                                                    <p className="text-xl font-black text-emerald-600 tracking-tighter">KES {p.netPayout.toLocaleString()}</p>
                                                </div>
                                                 <div className="flex items-center gap-2">
                                                    <button 
                                                        disabled={isProcessing || processingItems.includes(p.id)}
                                                        onClick={async () => {
                                                            const isChairmanOrSuper = currentUser?.role === 'coop_chairman' || currentUser?.role === 'super_admin';
                                                            if (!isChairmanOrSuper) {
                                                                handleTriggerVerification([p.id]);
                                                                return;
                                                            }

                                                            try {
                                                                setProcessingItems(prev => [...prev, p.id]);
                                                                await onApprovePayouts?.([p.id]);
                                                            } catch (err: any) {
                                                                alert(`Approval failed: ${err.message}`);
                                                            } finally {
                                                                setProcessingItems(prev => prev.filter(id => id !== p.id));
                                                            }
                                                        }}
                                                        className="bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 min-w-[140px]"
                                                    >
                                                        {processingItems.includes(p.id) ? 'Processing...' : 'Approve Draft'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Collection Quantity Section */}
                        {filteredApprovalCollections.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                        <AlertIcon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Collection Quantity Variances ({filteredApprovalCollections.length})</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    {filteredApprovalCollections.map(col => (
                                        <div key={col.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 animate-fade-in-up hover:shadow-md transition-all">
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
                                                    disabled={isProcessing || processingItems.includes(`${col.id}_reject`)}
                                                    onClick={async () => {
                                                        try {
                                                            setProcessingItems(prev => [...prev, `${col.id}_reject`]);
                                                            await onApproveCollection?.(col.id, 'rejected');
                                                        } finally {
                                                            setProcessingItems(prev => prev.filter(id => id !== `${col.id}_reject`));
                                                        }
                                                    }}
                                                    className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 text-slate-400 disabled:opacity-30"
                                                >
                                                    {processingItems.includes(`${col.id}_reject`) ? '...' : 'Reject'}
                                                </button>
                                                <button 
                                                    disabled={isProcessing || processingItems.includes(`${col.id}_approve`)}
                                                    onClick={async () => {
                                                        try {
                                                            setProcessingItems(prev => [...prev, `${col.id}_approve`]);
                                                            await onApproveCollection?.(col.id, 'approved');
                                                        } finally {
                                                            setProcessingItems(prev => prev.filter(id => id !== `${col.id}_approve`));
                                                        }
                                                    }}
                                                    className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 min-w-[120px]"
                                                >
                                                    {processingItems.includes(`${col.id}_approve`) ? 'Confirming...' : 'Approve'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Unified Empty State */}
                        {collections.filter(c => c.requiresApproval && c.approvalStatus === 'pending').length === 0 && payouts.filter(p => p.status === 'pending').length === 0 && (
                            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                                    <SuccessIcon className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mb-2">Queue Fully Cleared</h3>
                                <p className="text-xs font-medium text-slate-500 max-w-sm">There are no pending collection or payout approvals at this moment. All discrepancies and drafts have been resolved.</p>
                            </div>
                        )}
                            </>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                {approvalSubTab === 'archive' && (
                                    <>
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                                <SuccessIcon className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Approved Payouts Archive</h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <input 
                                                type="date" 
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                            />
                                            <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
                                            <input 
                                                type="date" 
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {approvalSubTab === 'archive' && (
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                <input 
                                                    type="checkbox"
                                                    checked={payouts.filter(p => p.status === 'approved' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).length > 0 && selectedPayouts.length === payouts.filter(p => p.status === 'approved' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            const allIds = payouts.filter(p => p.status === 'approved' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).map(p => p.id);
                                                            setSelectedPayouts(allIds);
                                                        } else {
                                                            setSelectedPayouts([]);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Select All</span>
                                            </div>
                                        )}

                                        {selectedPayouts.length > 0 && (
                                            <div className="flex items-center gap-4 animate-scale-in">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{selectedPayouts.length} selected</p>
                                                <button 
                                                    onClick={() => {
                                                        setDisbursementBatchIds(selectedPayouts);
                                                        setIsDisbursementModalOpen(true);
                                                    }}
                                                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                                >
                                                    Bulk Disburse
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedPayouts([])}
                                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {payouts.filter(p => p.status === 'approved' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).map(p => (
                                        <div key={p.id} className={`bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border ${selectedPayouts.includes(p.id) ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-700'} shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all`}>
                                            <div className="flex items-center gap-6">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedPayouts.includes(p.id)}
                                                    onChange={() => {
                                                        if (selectedPayouts.includes(p.id)) {
                                                            setSelectedPayouts(selectedPayouts.filter(id => id !== p.id));
                                                        } else {
                                                            setSelectedPayouts([...selectedPayouts, p.id]);
                                                        }
                                                    }}
                                                    className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900 flex items-center justify-center font-black text-emerald-400 text-xs">
                                                    {getFarmerName(p.farmerId).substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{getFarmerName(p.farmerId)}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.payoutMonth}</p>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Approved</span>
                                                    </div>
                                                </div>
                                            </div>
                                                <div className="flex items-center gap-4">
                                                    {(currentUser?.role === 'coop_chairman' || currentUser?.role === 'super_admin' || currentUser?.role === 'coop_admin' || currentUser?.role === 'cooperative_manager') && (
                                                        <button 
                                                            disabled={isProcessing || processingItems.includes(`${p.id}_undo`)}
                                                            onClick={async () => {
                                                                if (window.confirm(`Revert ${getFarmerName(p.farmerId)}'s payout to draft status?`)) {
                                                                    try {
                                                                        setProcessingItems(prev => [...prev, `${p.id}_undo`]);
                                                                        await onApprovePayouts?.([p.id], 'pending');
                                                                    } finally {
                                                                        setProcessingItems(prev => prev.filter(id => id !== `${p.id}_undo`));
                                                                    }
                                                                }
                                                            }}
                                                            className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all active:scale-95 disabled:opacity-30"
                                                        >
                                                            {processingItems.includes(`${p.id}_undo`) ? '...' : 'Undo Approval'}
                                                        </button>
                                                    )}
                                                    <button 
                                                        disabled={isProcessing || processingItems.includes(`${p.id}_disburse`)}
                                                        onClick={() => {
                                                            setDisbursementBatchIds([p.id]);
                                                            setIsDisbursementModalOpen(true);
                                                        }}
                                                        className="bg-slate-900 dark:bg-emerald-600 text-white px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 disabled:opacity-50 min-w-[140px]"
                                                    >
                                                        {processingItems.includes(`${p.id}_disburse`) ? 'Disbursing...' : 'Disburse Funds'}
                                                    </button>
                                                </div>
                                        </div>
                                    ))}
                                    {payouts.filter(p => p.status === 'approved' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).length === 0 && (
                                        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                                <PayoutIcon className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No Approved Payouts for this period</h3>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                        {approvalSubTab === 'disbursed' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                                <PayoutIcon className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Paid Disbursement History</h3>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <input 
                                                type="date" 
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                            />
                                            <div className="w-px h-3 bg-slate-300 dark:bg-slate-700" />
                                            <input 
                                                type="date" 
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none border-none p-1 dark:text-white cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {payouts.filter(p => p.status === 'paid' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).map(p => (
                                        <div key={p.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center font-black text-indigo-400 text-sm">
                                                    {getFarmerName(p.farmerId).substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{getFarmerName(p.farmerId)}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.payoutMonth}</p>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Disbursed</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</p>
                                                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">KES {p.netPayout.toLocaleString()}</p>
                                                </div>
                                                
                                                <div className="h-10 w-px bg-slate-100 dark:bg-slate-700 hidden md:block" />
                                                
                                                <div className="text-left md:min-w-[150px]">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 text-indigo-600`}>
                                                            {p.disbursementMethod || 'Manual'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight truncate max-w-[140px]">Ref: {p.disbursementReference || 'N/A'}</p>
                                                    <p className="text-[8px] font-bold text-slate-400">{p.disbursementDate ? new Date(p.disbursementDate).toLocaleString() : ''}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {payouts.filter(p => p.status === 'paid' && p.payoutMonth.substring(0, 10) >= startDate && p.payoutMonth.substring(0, 10) <= endDate).length === 0 && (
                                        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Disbursement History found for this period</p>
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
                                            onClick={() => setIsAddingExpense(true)}
                                            className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 text-slate-900 dark:text-white flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Record Expense
                                        </button>
                                        <button 
                                            onClick={() => setIsAddingIncome(true)}
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

                                {/* Record Sale Form (POS System) */}
                                {isRecordingSale && (
                                    <div className="mb-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] shadow-xl overflow-hidden animate-fade-in-up">
                                        <div className="flex flex-col lg:flex-row min-h-[700px]">
                                            {/* POS - Product Picker (Left) */}
                                            <div className="flex-1 p-8 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h3 className="text-xl font-black tracking-tighter uppercase text-slate-900 dark:text-white flex items-center gap-3">
                                                            <StoreIcon className="w-6 h-6 text-indigo-600" />
                                                            Product Selection
                                                        </h3>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select items to add to basket</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => setIsPOSHeldView(!isPOSHeldView)}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPOSHeldView ? 'bg-orange-500 text-white shadow-lg' : 'bg-orange-50 dark:bg-orange-900/10 text-orange-600 border border-orange-100 dark:border-orange-900/20'}`}
                                                        >
                                                            {isPOSHeldView ? 'Back to Selection' : `Held Sales (${posHeldSales.length})`}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isPOSHeldView ? (
                                                    <div className="space-y-4">
                                                        {posHeldSales.length === 0 ? (
                                                            <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                                                <ResetIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transactions on hold</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {posHeldSales.map(held => (
                                                                    <div key={held.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                                                        <div>
                                                                            <div className="flex justify-between items-start mb-4">
                                                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Held: {new Date(held.heldAt).toLocaleTimeString()}</p>
                                                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">{held.basket.length} Items</span>
                                                                            </div>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 truncate text-emerald-600">
                                                                                {farmers.find(f => f.id === held.farmerId)?.name || 'Walk-in Customer'}
                                                                            </p>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => resumeHold(held)}
                                                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3 text-[10px] font-black uppercase tracking-widest transition-all"
                                                                        >
                                                                            Resume Sale
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        {/* Product Search */}
                                                        <div className="relative">
                                                            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Search items by name or category..."
                                                                value={agrovetItemSearchQuery}
                                                                onChange={(e) => setAgrovetItemSearchQuery(e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-5 pl-14 pr-6 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white placeholder:text-slate-400"
                                                            />
                                                        </div>

                                                        {/* Inventory Grid */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                            {inventory
                                                                .filter(item => 
                                                                    item.itemName.toLowerCase().includes(agrovetItemSearchQuery.toLowerCase()) || 
                                                                    item.category?.toLowerCase().includes(agrovetItemSearchQuery.toLowerCase())
                                                                )
                                                                .map(item => (
                                                                    <button 
                                                                        key={item.id}
                                                                        disabled={item.quantity <= 0}
                                                                        onClick={() => addToBasket(item)}
                                                                        className="group bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left relative overflow-hidden"
                                                                    >
                                                                        <div className="absolute top-0 right-0 p-4">
                                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.quantity > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                                {item.quantity} In Stock
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-4">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{item.category}</p>
                                                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-3 line-clamp-1">{item.itemName}</h4>
                                                                            <p className="text-xl font-black text-indigo-600">KES {Number(item.unitPrice).toLocaleString()}</p>
                                                                        </div>
                                                                        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">Add to basket</span>
                                                                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                                                <PlusIcon className="w-4 h-4" />
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* POS - Basket & Checkout (Right Sidebar) */}
                                            <div className="w-full lg:w-[450px] bg-white dark:bg-slate-900 p-10 flex flex-col justify-between shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.05)]">
                                                <div>
                                                    <div className="flex items-center justify-between mb-10">
                                                        <h3 className="text-xl font-black tracking-tighter uppercase text-slate-900 dark:text-white flex items-center gap-3">
                                                            <FinanceIcon className="w-6 h-6 text-emerald-600" />
                                                            Basket Total
                                                        </h3>
                                                        <button 
                                                            onClick={() => setPosBasket([])}
                                                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
                                                        >
                                                            <ResetIcon className="w-3.5 h-3.5" />
                                                            Clear
                                                        </button>
                                                    </div>

                                                    {/* Cart Items */}
                                                    <div className="space-y-6 mb-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {posBasket.length === 0 ? (
                                                            <div className="text-center py-10 opacity-40">
                                                                <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                                                <p className="text-[10px] font-black uppercase tracking-widest">Basket is empty</p>
                                                            </div>
                                                        ) : (
                                                            posBasket.map(basketItem => (
                                                                <div key={basketItem.itemId} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl relative group">
                                                                    <div className="flex-1">
                                                                        <h5 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter line-clamp-1">{basketItem.itemName}</h5>
                                                                        <p className="text-[10px] font-bold text-slate-400">KES {Number(basketItem.unitPrice).toLocaleString()} × {basketItem.quantity}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-1.5 shadow-sm">
                                                                        <button 
                                                                            onClick={() => updateBasketQuantity(basketItem.itemId, basketItem.quantity - 1)}
                                                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                                        >
                                                                            <MinusIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <span className="text-xs font-black text-slate-900 dark:text-white w-6 text-center">{basketItem.quantity}</span>
                                                                        <button 
                                                                            onClick={() => updateBasketQuantity(basketItem.itemId, basketItem.quantity + 1)}
                                                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                                        >
                                                                            <PlusIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-xs font-black text-slate-900 dark:text-white min-w-[80px] text-right">KES {Number(basketItem.amount).toLocaleString()}</p>
                                                                    <button 
                                                                        onClick={() => removeFromBasket(basketItem.itemId)}
                                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg scale-0 group-hover:scale-100 transition-all active:scale-90"
                                                                    >
                                                                        <TrashIcon className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* Farmer & Date Configuration */}
                                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Customer / Farmer Search</label>
                                                            <div className="relative">
                                                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Search farmer..."
                                                                    value={agrovetFarmerSearchQuery}
                                                                    onChange={(e) => setAgrovetFarmerSearchQuery(e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold p-3.5 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all dark:text-white"
                                                                />
                                                            </div>
                                                            <select 
                                                                value={posFarmerId}
                                                                onChange={(e) => setPosFarmerId(e.target.value)}
                                                                className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3.5 rounded-xl text-xs font-black uppercase tracking-tighter outline-none focus:border-indigo-500 transition-all dark:text-white"
                                                            >
                                                                <option value="">Select Farmer</option>
                                                                {farmers
                                                                    .filter(f => f.name.toLowerCase().includes(agrovetFarmerSearchQuery.toLowerCase()) || f.memberId?.toLowerCase().includes(agrovetFarmerSearchQuery.toLowerCase()))
                                                                    .map(f => (
                                                                        <option key={f.id} value={f.id}>{f.name} ({f.memberId})</option>
                                                                    ))}
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Process Date</label>
                                                                <input 
                                                                    type="date"
                                                                    value={posSaleDate}
                                                                    onChange={(e) => setPosSaleDate(e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all dark:text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Method</label>
                                                                <select 
                                                                    value={posStatus}
                                                                    onChange={(e) => setPosStatus(e.target.value as any)}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl text-xs font-bold outline-none border-none transition-all dark:text-white"
                                                                >
                                                                    <option value="paid">Cash Sale (Paid)</option>
                                                                    <option value="credit">On Credit (Deducted)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-10 space-y-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Total Payable</span>
                                                        <span className="text-3xl font-black text-slate-900 dark:text-white">KES {posBasket.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button 
                                                            disabled={posBasket.length === 0}
                                                            onClick={holdTransaction}
                                                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Hold Sale
                                                        </button>
                                                        <button 
                                                            disabled={isProcessing || posBasket.length === 0 || !posFarmerId}
                                                            onClick={handlePOSCheckout}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                                                        >
                                                            {isProcessing ? 'Processing...' : 'Checkout Now'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
                                    <button 
                                        onClick={() => setIsOpeningAccount(true)}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Open Account
                                    </button>
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
                            return list.filter(item => {
                                const searchLower = stSearch.toLowerCase();
                                const matchesBase = item.name?.toLowerCase().includes(searchLower) || item.phone?.includes(stSearch);
                                
                                if (targetType === 'farmer') {
                                    const farmer = item as CoopFarmer;
                                    return matchesBase || 
                                           farmer.nationalId?.includes(stSearch) || 
                                           farmer.memberId?.includes(stSearch) ||
                                           farmer.accountNumber?.includes(stSearch);
                                }
                                return matchesBase || (item as CoopRider).nationalId?.includes(stSearch);
                            });
                        }, [targetType, stSearch, farmers, riders]);

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
                                if (t.type === 'credit') {
                                    acc.credit += t.amount;
                                    acc.totalQty += (t.quantity || 0);
                                } else {
                                    acc.debit += t.amount;
                                    // Itemize deduction
                                    const category = t.description.includes('Payout') ? 'Payouts' : 
                                                   t.description.includes('Agrovet') ? 'Agrovet' : 
                                                   t.description.includes('SACCO') ? 'SACCO' : 'Other';
                                    acc.deductionsBreakdown[category] = (acc.deductionsBreakdown[category] || 0) + t.amount;
                                }
                                acc.balance = t.balance;
                                return acc;
                            }, { credit: 0, debit: 0, balance: 0, totalQty: 0, deductionsBreakdown: {} as Record<string, number> });
                        }, [transactions]);

                        const handlePreview = async () => {
                            if (!selectedEntity) return alert("Select a recipient first");
                            try {
                                let dataUri = '';
                                if (targetType === 'farmer') {
                                    dataUri = await pdfService.generateFarmerStatementPdf(
                                        selectedEntity as CoopFarmer, 
                                        transactions, 
                                        0, 
                                        totals, 
                                        stStartDate, 
                                        stEndDate, 
                                        currentInstitution as any, 
                                        letterheadConfig, 
                                        footerImageUrl ?? null
                                    );
                                } else {
                                    dataUri = await pdfService.generateRiderStatementPdf(
                                        selectedEntity as CoopRider, 
                                        transactions, 
                                        0, 
                                        totals, 
                                        stStartDate, 
                                        stEndDate, 
                                        currentInstitution as any, 
                                        letterheadConfig, 
                                        footerImageUrl ?? null
                                    );
                                }
                                if (dataUri) {
                                    const blob = dataUriToBlob(dataUri);
                                    const url = URL.createObjectURL(blob);
                                    const pdfWindow = window.open(url, '_blank');
                                    if (pdfWindow) {
                                        pdfWindow.focus();
                                    } else {
                                        // Fallback if popup blocked
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.target = '_blank';
                                        link.click();
                                    }
                                    // Optimization: Revoke URL after a delay to keep the blob alive for the new window
                                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                                }
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
                                            <input type="text" value={stSearch} onChange={e => setStSearch(e.target.value)} placeholder="Search name, phone, or ID..." className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 font-bold outline-none text-sm dark:text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-4 font-bold outline-none text-sm appearance-none dark:text-white">
                                                <option value="">--- Select {targetType === 'farmer' ? 'Farmer' : 'Rider'} ---</option>
                                                {filteredTargets.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} ({t.phone})
                                                    </option>
                                                ))}
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
                                                <div className="flex gap-12 text-right">
                                                    <div>
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">Total Quantity</p>
                                                        <p className="text-2xl font-black text-slate-900 dark:text-white italic">{totals.totalQty.toLocaleString()} <span className="text-xs uppercase font-bold text-slate-400">Units</span></p>
                                                    </div>
                                                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                                                    <div className="flex gap-6">
                                                        {(Object.entries(totals.deductionsBreakdown) as [string, number][]).map(([cat, amt]) => (
                                                            <div key={cat}>
                                                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">{cat}</p>
                                                                <p className="text-sm font-black text-slate-900 dark:text-white italic">-{amt.toLocaleString()}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest italic">Closing Balance</p>
                                                        <p className="text-2xl font-black text-slate-900 dark:text-white italic">KES {totals.balance.toLocaleString()}</p>
                                                    </div>
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
                                            KES {(income.filter(i => {
                                                const d = i.date.substring(0, 10);
                                                return d >= startDate && d <= endDate;
                                            }).reduce((s, i) => s + i.amount, 0) - expenses.filter(e => {
                                                const d = e.date.substring(0, 10);
                                                return d >= startDate && d <= endDate;
                                            }).reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                                        </h4>
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full">
                                            Period Balance
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Period Income</p>
                                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                            KES {income.filter(i => {
                                                const d = i.date.substring(0, 10);
                                                return d >= startDate && d <= endDate;
                                            }).reduce((s, i) => s + i.amount, 0).toLocaleString()}
                                        </h4>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">+ Gross Income</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Period Expenses</p>
                                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                            KES {expenses.filter(e => {
                                                const d = e.date.substring(0, 10);
                                                return d >= startDate && d <= endDate;
                                            }).reduce((s, e) => s + e.amount, 0).toLocaleString()}
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
                                                const prodTotal = collections.filter(c => {
                                                    if (!c.collectionDate || !c.factoryConfirmed || c.productType !== prod) return false;
                                                    const dateStr = c.collectionDate.substring(0, 10);
                                                    return dateStr >= startDate && dateStr <= endDate;
                                                }).reduce((s, c) => s + Number(c.finalQuantity), 0);
                                                const maxProd = Math.max(...['Milk', 'Coffee', 'Tea', 'Pyrethrum'].map(p => collections.filter(c => {
                                                    if (!c.collectionDate || !c.factoryConfirmed || c.productType !== p) return false;
                                                    const dateStr = c.collectionDate.substring(0, 10);
                                                    return dateStr >= startDate && dateStr <= endDate;
                                                }).reduce((s, c) => s + Number(c.finalQuantity), 0)), 1);
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
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl flex items-center gap-2 border border-slate-100 dark:border-slate-700/50">
                                                <input 
                                                    type="date" 
                                                    value={startDate}
                                                    onChange={e => setStartDate(e.target.value)}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-2 dark:text-white"
                                                />
                                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                                                <input 
                                                    type="date" 
                                                    value={endDate}
                                                    onChange={e => setEndDate(e.target.value)}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-2 dark:text-white"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => {
                                                        const d = new Date();
                                                        setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
                                                        setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
                                                    }}
                                                    className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    This Month
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const d = new Date();
                                                        d.setMonth(d.getMonth() - 1);
                                                        setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
                                                        setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]);
                                                    }}
                                                    className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    Last Month
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {['all', 'mpesa', 'bank', 'cash'].map(m => (
                                                <button 
                                                    key={m}
                                                    onClick={async () => {
                                                        const docUri = await pdfService.generatePaymentSchedulePdf(
                                                            getFilteredPayouts(), 
                                                            farmers, 
                                                            m as any, 
                                                            currentInstitution!, 
                                                            letterheadConfig, 
                                                            footerImageUrl ?? null
                                                        );
                                                        const link = document.createElement('a');
                                                        link.href = docUri;
                                                        link.download = `Payment_Schedule_${m.toUpperCase()}_${new Date().toLocaleDateString()}.pdf`;
                                                        link.click();
                                                    }}
                                                    className="bg-slate-50 hover:bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 dark:border-slate-700 hover:border-indigo-200 shadow-sm active:scale-95"
                                                >
                                                    {m === 'all' ? 'All Methods' : m.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
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
                                                const farmerCollections = collections.filter(c => {
                                                    if (!c.collectionDate || !c.factoryConfirmed) return false;
                                                    const dateStr = c.collectionDate.substring(0, 10);
                                                    return c.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                                                });
                                                const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                                                const gross = totalQty * payoutRate;
                                                
                                                const advances = expenses.filter(ex => {
                                                    if (!ex.date) return false;
                                                    const dateStr = ex.date.substring(0, 10);
                                                    return ex.farmerId === farmer.id && 
                                                           ex.category.toLowerCase().includes('advance') &&
                                                           dateStr >= startDate && dateStr <= endDate;
                                                }).reduce((s, ex) => s + ex.amount, 0);

                                                const deductions = sales.filter(s => {
                                                    if (!s.saleDate) return false;
                                                    const dateStr = s.saleDate.substring(0, 10);
                                                    return s.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                                                }).reduce((acc, sa) => acc + sa.amount, 0);

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
                                        const c = collections.some(col => {
                                            if (!col.collectionDate || !col.factoryConfirmed) return false;
                                            const dateStr = col.collectionDate.substring(0, 10);
                                            return col.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                                        });
                                        const e = expenses.some(ex => {
                                            if (!ex.date) return false;
                                            const dateStr = ex.date.substring(0, 10);
                                            return ex.farmerId === farmer.id && 
                                                   ex.category.toLowerCase().includes('advance') &&
                                                   dateStr >= startDate && dateStr <= endDate;
                                        });
                                        const s = sales.some(sa => {
                                            if (!sa.saleDate) return false;
                                            const dateStr = sa.saleDate.substring(0, 10);
                                            return sa.farmerId === farmer.id && dateStr >= startDate && dateStr <= endDate;
                                        });
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
                                        const result = await apiService.sendSms(
                                            recipient,
                                            message,
                                            smsConfig,
                                            undefined,
                                            instId || currentInstitution?.id || ''
                                        );
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

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Credit Eligibility Rule</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Require delivery for credit POS</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={currentInstitution?.coopSettings?.requireCurrentMonthDeliveryForCredit || false}
                                                onChange={(e) => onUpdateInstitution?.(currentInstitution!.id, { 
                                                    coopSettings: {
                                                        ...currentInstitution?.coopSettings,
                                                        requireCurrentMonthDeliveryForCredit: e.target.checked 
                                                    }
                                                })}
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 bg-indigo-600 rounded-[3rem] p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-150"></div>
                             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                 <div>
                                     <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Payout Configuration</h3>
                                     <p className="text-[11px] font-bold text-indigo-100 uppercase tracking-widest opacity-80 mb-6">Set the global price per production unit (KES)</p>
                                     <div className="flex items-center gap-4">
                                         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                                            <input 
                                                type="number" 
                                                value={payoutRate} 
                                                onChange={e => setPayoutRate(Number(e.target.value))}
                                                className="bg-transparent text-2xl font-black outline-none border-none w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="ml-2 font-bold opacity-60">KES / Unit</span>
                                         </div>
                                         <button 
                                            disabled={isSavingRate}
                                            onClick={async () => {
                                                if (onUpdateInstitution && currentInstitution) {
                                                    setIsSavingRate(true);
                                                    try {
                                                        await onUpdateInstitution(currentInstitution.id, {
                                                            coopSettings: {
                                                                ...currentInstitution.coopSettings,
                                                                payoutRate
                                                            }
                                                        });
                                                        onLogAction?.(`Updated global payout rate to KES ${payoutRate}`);
                                                        alert("Payout rate saved successfully!");
                                                    } catch (err) {
                                                        alert("Failed to save rate. Please try again.");
                                                    } finally {
                                                        setIsSavingRate(false);
                                                    }
                                                }
                                            }}
                                            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                         >
                                             {isSavingRate ? 'Saving...' : 'Save Rate'}
                                         </button>
                                     </div>
                                 </div>
                                 <div className="md:border-l border-white/20 md:pl-8">
                                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Historical Rate Tracker</p>
                                     <div className="space-y-3">
                                         <div className="flex justify-between items-center gap-6">
                                             <span className="text-[10px] font-bold uppercase">Current Price</span>
                                             <span className="font-black">KES {currentInstitution?.coopSettings?.payoutRate || 50}</span>
                                         </div>
                                         <div className="flex justify-between items-center gap-6">
                                             <span className="text-[10px] font-bold uppercase">Last Change</span>
                                             <span className="font-black">{currentInstitution?.coopSettings?.payoutRate ? 'Recently' : 'Initial'}</span>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                             <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                                 <AlertIcon className="w-8 h-8" />
                             </div>
                             <h4 className="text-lg font-black tracking-tighter uppercase mb-2">Billing Impact</h4>
                             <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-tight">
                                Changing the payout rate will affect all DRAFT payouts. Approved or Paid records remain locked to their original rates.
                             </p>
                        </div>
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
                        onUpdateCompanyDetails={onUpdateCompanyDetails}
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
                    isAutoConfirm={true}
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
                                <XIcon className="w-5 h-5" />
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
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Location / Route</label>
                                    <input 
                                        type="text" 
                                        value={editingFarmer.location || ''} 
                                        onChange={e => setEditingFarmer({...editingFarmer, location: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Settlement Method</label>
                                    <select 
                                        value={editingFarmer.paymentMethod || 'mpesa'} 
                                        onChange={e => setEditingFarmer({...editingFarmer, paymentMethod: e.target.value as any})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    >
                                        <option value="mpesa">M-PESA</option>
                                        <option value="bank">Bank Transfer</option>
                                        <option value="cash">Cash Settlement</option>
                                    </select>
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

            {isOpeningAccount && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setIsOpeningAccount(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Open SACCO Account</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">New Financial Identity</p>
                            </div>
                            <button onClick={() => setIsOpeningAccount(false)} className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitSaccoAccount} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Farmer</label>
                                <select 
                                    value={newSaccoAccount.farmerId || ''} 
                                    onChange={e => setNewSaccoAccount({...newSaccoAccount, farmerId: e.target.value})}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                >
                                    <option value="">-- Choose Farmer --</option>
                                    {farmers.map(f => (
                                        <option key={f.id} value={f.id}>{f.name} ({f.memberId})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Account Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                {(['Savings', 'Shares'] as const).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setNewSaccoAccount({...newSaccoAccount, accountType: type})}
                                        className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            newSaccoAccount.accountType === type 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-3xl space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertIcon className="w-4 h-4 text-amber-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">Pre-Opening Notice</span>
                                </div>
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold leading-relaxed uppercase">
                                    New accounts are initialized with KES 0.00 balance. Monthly deductions will be automated from milk collections.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Opening Account...' : 'Confirm & Open Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isAddingExpense && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setIsAddingExpense(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-rose-600">Record Expenditure</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Cooperative Operational Outflow</p>
                            </div>
                            <button onClick={() => setIsAddingExpense(false)} className="p-3 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900 Transition-colors">
                                <XIcon className="w-6 h-6 text-rose-600" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitExpense} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Expense Date</label>
                                    <input 
                                        type="date" 
                                        value={newExpense.date || ''} 
                                        onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Amount (KES)</label>
                                    <input 
                                        type="number" 
                                        value={newExpense.amount || ''} 
                                        onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                                        required
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Description</label>
                                <input 
                                    type="text" 
                                    value={newExpense.description || ''} 
                                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                                    required
                                    placeholder="e.g., Factory Maintenance, Fuel for Logistics"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                <select 
                                    value={newExpense.category || ''} 
                                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white"
                                >
                                    <option value="General Operations">General Operations</option>
                                    <option value="Logistics & Fuel">Logistics & Fuel</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Farmer Advance">Farmer Advance (Credit)</option>
                                    <option value="Staff Wages">Staff Wages</option>
                                    <option value="Utilities">Utilities (Water/Power)</option>
                                </select>
                            </div>

                            {newExpense.category === 'Farmer Advance' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Farmer (For Advances)</label>
                                    <select 
                                        value={newExpense.farmerId || ''} 
                                        onChange={e => setNewExpense({...newExpense, farmerId: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white"
                                    >
                                        <option value="">-- Apply to specific farmer --</option>
                                        {farmers.map(f => (
                                            <option key={f.id} value={f.id}>{f.name} ({f.memberId})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-rose-600 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-rose-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Recording...' : 'Save Expense Record'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isAddingIncome && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setIsAddingIncome(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-emerald-600">Record Revenue</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Product Sale Inflow</p>
                            </div>
                            <button onClick={() => setIsAddingIncome(false)} className="p-3 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors">
                                <XIcon className="w-6 h-6 text-emerald-600" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitIncome} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Sale Date</label>
                                    <input 
                                        type="date" 
                                        value={newIncome.date || ''} 
                                        onChange={e => setNewIncome({...newIncome, date: e.target.value})}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Total Amount (KES)</label>
                                    <input 
                                        type="number" 
                                        value={newIncome.amount || ''} 
                                        onChange={e => setNewIncome({...newIncome, amount: Number(e.target.value)})}
                                        required
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Purchasing Company / Client</label>
                                <input 
                                    type="text" 
                                    value={newIncome.companyName || ''} 
                                    onChange={e => setNewIncome({...newIncome, companyName: e.target.value})}
                                    required
                                    placeholder="e.g., Brookside Dairy, KCC, Private Processor"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Product Type</label>
                                    <select 
                                        value={newIncome.productType || ''} 
                                        onChange={e => setNewIncome({...newIncome, productType: e.target.value})}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                    >
                                        <option value="Milk Intake">Milk Intake (Processed)</option>
                                        <option value="Bulk Raw Milk">Bulk Raw Milk</option>
                                        <option value="Animal Feed">Animal Feed Sales</option>
                                        <option value="Consultancy">Consultancy Services</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Quantity ({newIncome.unit})</label>
                                    <input 
                                        type="number" 
                                        value={newIncome.quantity || ''} 
                                        onChange={e => setNewIncome({...newIncome, quantity: Number(e.target.value)})}
                                        required
                                        placeholder="0"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all dark:text-white"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Recording...' : 'Confirm Receipt'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
                {/* Verification Modal */}
                {isVerifying && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 border border-white/20 shadow-2xl animate-scale-in">
                            <div className="text-center space-y-6">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto">
                                    <LockClosedIcon className="w-10 h-10" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Authorization Required</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-2">A unique approval code has been sent to the Chairman's registered phone number. Please enter it below to complete authorization.</p>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        maxLength={6}
                                        value={userEnteredCode}
                                        onChange={e => setUserEnteredCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-5 text-center text-2xl font-black tracking-[0.5em] focus:border-indigo-500 outline-none transition-all dark:text-white"
                                    />
                                    {userEnteredCode.length === 6 && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-bounce">
                                            <SuccessIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => { setIsVerifying(false); setUserEnteredCode(''); }}
                                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={userEnteredCode.length !== 6}
                                        onClick={handleConfirmVerification}
                                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        Authorize Payout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Disbursement Modal */}
                {isDisbursementModalOpen && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3.5rem] p-12 border border-white/20 shadow-2xl animate-scale-in">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Batch Disbursement</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Authorize funds transfer for {disbursementBatchIds.length} farmers</p>
                                </div>
                                <button onClick={() => setIsDisbursementModalOpen(false)} className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Strategy</label>
                                        <select 
                                            value={disbursementMethod}
                                            onChange={e => setDisbursementMethod(e.target.value as any)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-black outline-none focus:border-indigo-500 dark:text-white"
                                        >
                                            <option value="default">Farmer Choice (Remembered)</option>
                                            <option value="mpesa">Bulk M-PESA B2C</option>
                                            <option value="bank">Bulk Bank Transfer</option>
                                            <option value="cash">Manual Cash</option>
                                            <option value="cheque">Manual Cheque</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Release Date</label>
                                        <input 
                                            type="date"
                                            value={disbursementDate}
                                            onChange={e => setDisbursementDate(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-black outline-none focus:border-indigo-500 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference / Account Number</label>
                                    <input 
                                        type="text"
                                        placeholder={disbursementMethod === 'bank' ? "Enter recipient account number" : "e.g. BATCH-NCBA-001"}
                                        value={disbursementAccount}
                                        onChange={e => setDisbursementAccount(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-black outline-none focus:border-indigo-500 dark:text-white"
                                    />
                                </div>

                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                                <AlertIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Integration Suite</h4>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Proceed with Bulk API Instructions?</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setProcessViaIntegratedApi(!processViaIntegratedApi)}
                                            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${processViaIntegratedApi ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${processViaIntegratedApi ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    {processViaIntegratedApi && (
                                        <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-indigo-500/80 animate-pulse">
                                            Ready to broadcast to {disbursementMethod === 'mpesa' ? 'Safaricom Daraja' : 'Bank Gateway'}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <button 
                                        disabled={isProcessing}
                                        onClick={handleConfirmDisbursement}
                                        className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                                    >
                                        {isProcessing ? 'Executing Batch Transfer...' : 'Confirm External Disbursement'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

