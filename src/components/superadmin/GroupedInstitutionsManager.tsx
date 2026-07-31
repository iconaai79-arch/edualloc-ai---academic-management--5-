import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Building2, GitBranch, Plus, Search, Filter, RefreshCw, 
    Settings, ShieldCheck, MapPin, CreditCard, ChevronDown, ChevronRight, 
    UserCheck, Trash2, Edit3, CheckCircle2, AlertCircle, Sparkles, Building, Landmark, Smartphone
} from 'lucide-react';
import type { Institution, User } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../../services/ToastContext';

export interface Branch {
    id: string;
    institution_id: string;
    institutionId?: string;
    name: string;
    location?: string;
    linked_institution_id?: string;
    linkedInstitutionId?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BranchIntegrationConfig {
    id: string;
    branch_id: string;
    branchId?: string;
    provider: 'mpesa' | 'kcb' | 'ncba' | 'coop' | string;
    account_details: Record<string, any>;
    is_active?: boolean;
}

interface GroupedInstitutionsManagerProps {
    institutions: Institution[];
    users: User[];
    onRefreshData?: () => Promise<void>;
    onLoginAsAdmin?: (institutionId: string, initialRole?: any) => void;
}

export const GroupedInstitutionsManager: React.FC<GroupedInstitutionsManagerProps> = ({
    institutions = [],
    users = [],
    onRefreshData,
    onLoginAsAdmin
}) => {
    const { success, error: toastError, info } = useToast();

    const [branches, setBranches] = useState<Branch[]>([]);
    const [configs, setConfigs] = useState<BranchIntegrationConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'grouped' | 'single'>('all');
    const [expandedInstIds, setExpandedInstIds] = useState<Set<string>>(new Set());

    // Modals
    const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
    const [branchCreationMode, setBranchCreationMode] = useState<'new' | 'pick_existing'>('new');
    const [selectedInstForNewBranch, setSelectedInstForNewBranch] = useState<Institution | null>(null);
    const [selectedExistingInstForBranch, setSelectedExistingInstForBranch] = useState<Institution | null>(null);
    const [newBranchData, setNewBranchData] = useState({ name: '', location: '', customId: '' });
    const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);

    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    // Branch Gateway Integration Modal
    const [configuringBranch, setConfiguringBranch] = useState<Branch | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<'mpesa' | 'kcb' | 'ncba' | 'coop'>('mpesa');
    const [gatewayDetails, setGatewayDetails] = useState<Record<string, string>>({
        paybillNumber: '',
        accountNumber: '',
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        bankName: '',
        bankAccountNumber: '',
        branchCode: ''
    });
    const [isSavingGateway, setIsSavingGateway] = useState(false);

    // Assign Group Admin Modal
    const [assigningAdminForInst, setAssigningAdminForInst] = useState<Institution | null>(null);
    const [groupAdminForm, setGroupAdminForm] = useState({ name: '', email: '', phoneNumber: '' });
    const [isSavingGroupAdmin, setIsSavingGroupAdmin] = useState(false);

    // Helper to open Add Branch modal with reset state
    const handleOpenAddBranchModal = (inst?: Institution | null) => {
        setSelectedInstForNewBranch(inst || institutions[0] || null);
        setBranchCreationMode('new');
        setSelectedExistingInstForBranch(null);
        setNewBranchData({ name: '', location: '', customId: '' });
        setIsAddBranchModalOpen(true);
    };

    // Load branches & integration configs
    const loadBranchData = useCallback(async () => {
        setLoading(true);
        try {
            const [bList, cList] = await Promise.all([
                apiService.fetchModuleRecords<Branch>('branches').catch(() => []),
                apiService.fetchModuleRecords<BranchIntegrationConfig>('branch_integration_configs').catch(() => [])
            ]);
            setBranches(bList || []);
            setConfigs(cList || []);
        } catch (err) {
            console.error('Failed to load branches:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBranchData();
    }, [loadBranchData]);

    // Group branches by institution_id
    const branchMap = useMemo(() => {
        const map = new Map<string, Branch[]>();
        branches.forEach(b => {
            const instId = b.institution_id || b.institutionId;
            if (!instId) return;
            const existing = map.get(instId) || [];
            existing.push(b);
            map.set(instId, existing);
        });
        return map;
    }, [branches]);

    // Config map by branch_id
    const configMap = useMemo(() => {
        const map = new Map<string, BranchIntegrationConfig[]>();
        configs.forEach(c => {
            const bId = c.branch_id || c.branchId;
            if (!bId) return;
            const existing = map.get(bId) || [];
            existing.push(c);
            map.set(bId, existing);
        });
        return map;
    }, [configs]);

    // Stats
    const totalGroupedInstitutions = useMemo(() => {
        return institutions.filter(inst => (branchMap.get(inst.id) || []).length > 1).length;
    }, [institutions, branchMap]);

    const groupAdminUsers = useMemo(() => {
        return users.filter(u => u.role === 'group_admin');
    }, [users]);

    // Filtered institutions
    const filteredInstitutions = useMemo(() => {
        return institutions.filter(inst => {
            const instBranches = branchMap.get(inst.id) || [];
            const isGrouped = instBranches.length > 1;

            if (filterType === 'grouped' && !isGrouped) return false;
            if (filterType === 'single' && isGrouped) return false;

            if (!searchQuery.trim()) return true;

            const q = searchQuery.toLowerCase();
            const matchesInst = inst.name.toLowerCase().includes(q) || (inst.institutionCode || '').toLowerCase().includes(q);
            const matchesBranch = instBranches.some(b => b.name.toLowerCase().includes(q) || (b.location || '').toLowerCase().includes(q));

            return matchesInst || matchesBranch;
        });
    }, [institutions, branchMap, filterType, searchQuery]);

    const toggleAccordion = (instId: string) => {
        setExpandedInstIds(prev => {
            const next = new Set(prev);
            if (next.has(instId)) next.delete(instId);
            else next.add(instId);
            return next;
        });
    };

    // Create New or Link Existing Branch
    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInstForNewBranch) return;

        let branchName = newBranchData.name.trim();
        let branchLoc = newBranchData.location.trim() || 'Main Location';
        let linkedInstId: string | undefined = undefined;

        if (branchCreationMode === 'pick_existing') {
            if (!selectedExistingInstForBranch) {
                toastError('Please select an existing institution to attach as a branch');
                return;
            }
            branchName = selectedExistingInstForBranch.name;
            const locVal = selectedExistingInstForBranch.location;
            branchLoc = (typeof locVal === 'string' ? locVal : (locVal && typeof locVal === 'object' ? `${locVal.latitude}, ${locVal.longitude}` : (selectedExistingInstForBranch.countyId || 'Main Location'))).trim();
            linkedInstId = selectedExistingInstForBranch.id;
        } else {
            if (!branchName) {
                toastError('Branch name is required');
                return;
            }
        }

        setIsSubmittingBranch(true);
        try {
            if (branchCreationMode === 'new') {
                const newInstId = `inst_br_${Date.now()}`;
                const newInstRecord: any = {
                    id: newInstId,
                    name: `${selectedInstForNewBranch.name} (${branchName})`,
                    institutionCode: `${(selectedInstForNewBranch.institutionCode || 'INST').toUpperCase()}-${branchName.replace(/\s+/g, '').slice(0, 3).toUpperCase()}`,
                    institutionType: selectedInstForNewBranch.institutionType || 'Secondary',
                    address: branchLoc,
                    status: 'active',
                    parentInstitutionId: selectedInstForNewBranch.id,
                    isBranch: true,
                    countyId: selectedInstForNewBranch.countyId
                };

                await apiService.saveModuleRecord('institutions', newInstRecord).catch(err => console.warn('Failed to save institution for branch:', err));
                linkedInstId = newInstId;
            }

            const formatBranchId = (id: string) => id.startsWith('br_') ? id : `br_${id}`;
            const branchId = newBranchData.customId.trim() || (linkedInstId ? formatBranchId(linkedInstId) : formatBranchId(`${selectedInstForNewBranch.id}_${Date.now()}`));
            const record: Partial<Branch> = {
                id: branchId,
                institution_id: selectedInstForNewBranch.id,
                name: branchName,
                location: branchLoc,
                linked_institution_id: linkedInstId
            };

            await apiService.saveModuleRecord('branches', record);
            
            success(branchCreationMode === 'pick_existing'
                ? `Linked existing institution "${branchName}" as a branch location!`
                : `Branch "${branchName}" created and registered under institutions!`
            );

            setIsAddBranchModalOpen(false);
            setNewBranchData({ name: '', location: '', customId: '' });
            setSelectedInstForNewBranch(null);
            setSelectedExistingInstForBranch(null);
            setBranchCreationMode('new');
            await loadBranchData();
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            console.error(err);
            toastError(err.message || 'Failed to create/link branch');
        } finally {
            setIsSubmittingBranch(false);
        }
    };

    // Edit Branch
    const handleUpdateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBranch) return;
        setIsSubmittingBranch(true);
        try {
            await apiService.saveModuleRecord('branches', editingBranch);
            success(`Branch updated successfully`);
            setEditingBranch(null);
            await loadBranchData();
        } catch (err: any) {
            toastError(err.message || 'Failed to update branch');
        } finally {
            setIsSubmittingBranch(false);
        }
    };

    // Delete Branch
    const handleDeleteBranch = async (branch: Branch) => {
        if (!window.confirm(`Are you sure you want to delete branch "${branch.name}"? This action cannot be undone.`)) return;
        try {
            await apiService.deleteModuleRecord('branches', branch.id);
            success(`Branch "${branch.name}" deleted`);
            await loadBranchData();
        } catch (err: any) {
            toastError(err.message || 'Failed to delete branch');
        }
    };

    // Open Config Gateway Modal for Branch
    const handleOpenGatewayModal = (branch: Branch) => {
        setConfiguringBranch(branch);
        setSelectedProvider('mpesa');
        const bConfigs = configMap.get(branch.id) || [];
        const existingMpesa = bConfigs.find(c => c.provider === 'mpesa');
        if (existingMpesa?.account_details) {
            setGatewayDetails(existingMpesa.account_details);
        } else {
            setGatewayDetails({
                paybillNumber: '',
                accountNumber: '',
                consumerKey: '',
                consumerSecret: '',
                passkey: '',
                bankName: '',
                bankAccountNumber: '',
                branchCode: ''
            });
        }
    };

    const handleSaveBranchGateway = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!configuringBranch) return;
        setIsSavingGateway(true);
        try {
            const configId = `bcfg_${configuringBranch.id}_${selectedProvider}`;
            const record: Partial<BranchIntegrationConfig> = {
                id: configId,
                branch_id: configuringBranch.id,
                provider: selectedProvider,
                account_details: gatewayDetails,
                is_active: true
            };
            await apiService.saveModuleRecord('branch_integration_configs', record);
            success(`Branch payment integration (${selectedProvider.toUpperCase()}) saved!`);
            setConfiguringBranch(null);
            await loadBranchData();
        } catch (err: any) {
            toastError(err.message || 'Failed to save integration config');
        } finally {
            setIsSavingGateway(false);
        }
    };

    // Assign Group Admin
    const handleAssignGroupAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assigningAdminForInst) return;
        if (!groupAdminForm.email.trim() || !groupAdminForm.name.trim()) {
            toastError('Name and Email are required');
            return;
        }

        setIsSavingGroupAdmin(true);
        try {
            const newAdminUser: Partial<User> = {
                id: `usr_grp_admin_${Date.now()}`,
                name: groupAdminForm.name.trim(),
                email: groupAdminForm.email.trim(),
                phoneNumber: groupAdminForm.phoneNumber.trim(),
                role: 'group_admin',
                institutionId: assigningAdminForInst.id
            };

            await apiService.saveModuleRecord('users', newAdminUser);
            success(`Group Admin "${groupAdminForm.name}" created and assigned to ${assigningAdminForInst.name}`);
            setAssigningAdminForInst(null);
            setGroupAdminForm({ name: '', email: '', phoneNumber: '' });
            if (onRefreshData) await onRefreshData();
        } catch (err: any) {
            toastError(err.message || 'Failed to assign Group Admin');
        } finally {
            setIsSavingGroupAdmin(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                            <GitBranch className="w-3.5 h-3.5" />
                            Multi-Branch Tenant Hub
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
                            Grouped Institutions <span className="text-indigo-400 italic">& Branches</span>
                        </h2>
                        <p className="text-slate-300 text-sm max-w-2xl font-medium">
                            Manage institution networks, multi-campus structures, satellite branches, isolated bank/MPESA gateways per location, and assign Group Admins.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={loadBranchData}
                            disabled={loading}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10"
                            title="Refresh Branches"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => handleOpenAddBranchModal()}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Add Branch Location
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl">
                        <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Grouped Networks</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{totalGroupedInstitutions}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-3xl">
                        <GitBranch className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Branches</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{branches.length}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-3xl">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Group Admins</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{groupAdminUsers.length}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm flex items-center gap-5">
                    <div className="p-4 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-3xl">
                        <CreditCard className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Branch Gateways</p>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{configs.length}</h3>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search & Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700/60 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search institution name, branch name, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 ml-2" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-none rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Institutions ({institutions.length})</option>
                        <option value="grouped">Multi-Branch Networks ({totalGroupedInstitutions})</option>
                        <option value="single">Single Unit ({institutions.length - totalGroupedInstitutions})</option>
                    </select>
                </div>
            </div>

            {/* Main Institutions & Branches Hierarchy List */}
            <div className="space-y-4">
                {filteredInstitutions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-12 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 text-center">
                        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h4 className="text-base font-black uppercase text-slate-700 dark:text-slate-200">No Institutions Found</h4>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filter selection.</p>
                    </div>
                ) : (
                    filteredInstitutions.map((inst) => {
                        const instBranches = branchMap.get(inst.id) || [];
                        const isExpanded = expandedInstIds.has(inst.id);
                        const isGrouped = instBranches.length > 1;
                        const instGroupAdmins = users.filter(u => u.institutionId === inst.id && u.role === 'group_admin');

                        return (
                            <div
                                key={inst.id}
                                className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm overflow-hidden transition-all hover:border-indigo-200 dark:hover:border-indigo-800"
                            >
                                {/* Institution Header Row */}
                                <div
                                    onClick={() => toggleAccordion(inst.id)}
                                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${isGrouped ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                            <Building className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-800 dark:text-white text-lg">{inst.name}</h3>
                                                {isGrouped ? (
                                                    <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded-full">
                                                        Multi-Branch ({instBranches.length})
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider rounded-full">
                                                        Single Branch
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium mt-1">
                                                <span>Code: <strong className="text-slate-600 dark:text-slate-300">{inst.institutionCode || 'INST-DEF'}</strong></span>
                                                <span>•</span>
                                                <span>Type: <strong className="text-slate-600 dark:text-slate-300">{inst.institutionType || 'Academic'}</strong></span>
                                                {instGroupAdmins.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                            {instGroupAdmins.length} Group Admin(s)
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                        {onLoginAsAdmin && (
                                            <button
                                                onClick={() => onLoginAsAdmin(inst.id)}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
                                                title="Login as Institution Admin"
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                Login as Admin
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleOpenAddBranchModal(inst)}
                                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add Branch
                                        </button>

                                        <button
                                            onClick={() => {
                                                setAssigningAdminForInst(inst);
                                            }}
                                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                        >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            Assign Group Admin
                                        </button>

                                        <div className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Branch List */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                                Branch Locations for {inst.name} ({instBranches.length})
                                            </h4>
                                        </div>

                                        {instBranches.length === 0 ? (
                                            <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl text-center border border-dashed border-slate-200 dark:border-slate-700">
                                                <p className="text-xs font-bold text-slate-500">No branches registered yet for this institution.</p>
                                                <button
                                                    onClick={() => handleOpenAddBranchModal(inst)}
                                                    className="mt-3 text-xs font-black text-indigo-600 hover:underline uppercase tracking-wider inline-flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> Create Default Branch
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {instBranches.map((branch) => {
                                                    const bConfigs = configMap.get(branch.id) || [];
                                                    const branchUsersCount = users.filter(u => (u as any).branch_id === branch.id || (u as any).branchId === branch.id).length;
                                                    const isLinkedInst = !!(branch.linked_institution_id || branch.linkedInstitutionId);
                                                    const targetBranchInstId = branch.linked_institution_id || branch.linkedInstitutionId || branch.id;

                                                    return (
                                                        <div
                                                            key={branch.id}
                                                            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-2">
                                                                        <GitBranch className="w-4 h-4 text-indigo-600" />
                                                                        <h5 className="font-bold text-slate-800 dark:text-white text-sm">{branch.name}</h5>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                                        {branch.id}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span>{branch.location || 'Main Location'}</span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                                                    {isLinkedInst && (
                                                                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-md border border-indigo-200 dark:border-indigo-800">
                                                                            🔗 Linked Institution
                                                                        </span>
                                                                    )}

                                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md">
                                                                        {branchUsersCount} Active Users
                                                                    </span>

                                                                    {bConfigs.length > 0 ? (
                                                                        bConfigs.map(c => (
                                                                            <span key={c.id} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase rounded-md flex items-center gap-1">
                                                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                                                {c.provider.toUpperCase()}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold rounded-md">
                                                                            Shared Gateway
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3 mt-4 gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleOpenGatewayModal(branch)}
                                                                        className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                                    >
                                                                        <Settings className="w-3.5 h-3.5" /> Gateways
                                                                    </button>

                                                                    {onLoginAsAdmin && (
                                                                        <button
                                                                            onClick={() => onLoginAsAdmin(targetBranchInstId)}
                                                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                                                            title="Login as Branch Admin"
                                                                        >
                                                                            <UserCheck className="w-3 h-3" /> Login Admin
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setEditingBranch(branch)}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                                                                        title="Edit Branch"
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleDeleteBranch(branch)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                                                        title="Delete Branch"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal: Add New / Link Existing Branch Location */}
            {isAddBranchModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 dark:border-slate-700 shadow-2xl space-y-6 animate-scale-up">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                    <GitBranch className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Add Branch Location</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">Create a new branch or convert an existing institution</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        {/* Mode Selector Tabs */}
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-1">
                            <button
                                type="button"
                                onClick={() => setBranchCreationMode('new')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    branchCreationMode === 'new'
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                ✨ New Location
                            </button>
                            <button
                                type="button"
                                onClick={() => setBranchCreationMode('pick_existing')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    branchCreationMode === 'pick_existing'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                🔗 Link Existing
                            </button>
                        </div>

                        <form onSubmit={handleCreateBranch} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Target Parent Institution</label>
                                <select
                                    value={selectedInstForNewBranch?.id || ''}
                                    onChange={(e) => setSelectedInstForNewBranch(institutions.find(i => i.id === e.target.value) || null)}
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                >
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.institutionCode || 'DEF'})</option>
                                    ))}
                                </select>
                            </div>

                            {branchCreationMode === 'pick_existing' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1.5">
                                            Select Existing Registered Institution to Attach as Branch
                                        </label>
                                        <select
                                            value={selectedExistingInstForBranch?.id || ''}
                                            onChange={(e) => {
                                                const inst = institutions.find(i => i.id === e.target.value) || null;
                                                setSelectedExistingInstForBranch(inst);
                                                if (inst) {
                                                    const locVal = inst.location;
                                                    const locStr = typeof locVal === 'string' ? locVal : (locVal && typeof locVal === 'object' ? `${locVal.latitude}, ${locVal.longitude}` : (inst.countyId || 'Main Campus'));
                                                    setNewBranchData({
                                                        name: inst.name,
                                                        location: locStr,
                                                        customId: `br_${inst.id}`
                                                    });
                                                }
                                            }}
                                            required
                                            className="w-full p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">-- Select Existing Institution --</option>
                                            {institutions
                                                .filter(inst => inst.id !== selectedInstForNewBranch?.id)
                                                .map(inst => (
                                                    <option key={inst.id} value={inst.id}>
                                                        {inst.name} — ({inst.institutionCode || inst.id}) [{inst.institutionType || 'Academic'}]
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {selectedExistingInstForBranch && (
                                        <div className="p-4 bg-indigo-50/80 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs space-y-1">
                                            <p className="font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-[10px]">🔗 Institution Link Summary</p>
                                            <p className="text-slate-800 dark:text-white font-bold">{selectedExistingInstForBranch.name}</p>
                                            <p className="text-slate-500 text-[11px]">
                                                Will be linked as a satellite branch under parent: <strong className="text-indigo-600 dark:text-indigo-400">{selectedInstForNewBranch?.name}</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Branch Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Mombasa West Campus"
                                            value={newBranchData.name}
                                            onChange={(e) => setNewBranchData(prev => ({ ...prev, name: e.target.value }))}
                                            required
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Location / Address</label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Nyali Plaza, Mombasa"
                                            value={newBranchData.location}
                                            onChange={(e) => setNewBranchData(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Branch Code / Custom ID (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., br_mombasa_01"
                                    value={newBranchData.customId}
                                    onChange={(e) => setNewBranchData(prev => ({ ...prev, customId: e.target.value }))}
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddBranchModalOpen(false)}
                                    className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingBranch}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30"
                                >
                                    {isSubmittingBranch ? 'Saving...' : (branchCreationMode === 'pick_existing' ? 'Link Institution as Branch' : 'Create Branch')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Branch */}
            {editingBranch && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 dark:border-slate-700 shadow-2xl space-y-6 animate-scale-up">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Edit Branch</h3>
                            <button onClick={() => setEditingBranch(null)} className="text-slate-400">✕</button>
                        </div>

                        <form onSubmit={handleUpdateBranch} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Branch Name</label>
                                <input
                                    type="text"
                                    value={editingBranch.name}
                                    onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                                    required
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Location</label>
                                <input
                                    type="text"
                                    value={editingBranch.location || ''}
                                    onChange={(e) => setEditingBranch({ ...editingBranch, location: e.target.value })}
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingBranch(null)} className="px-5 py-3 text-xs font-bold text-slate-500">Cancel</button>
                                <button type="submit" disabled={isSubmittingBranch} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">
                                    {isSubmittingBranch ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Branch Payment Gateways & Bank Integration */}
            {configuringBranch && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-lg w-full border border-slate-100 dark:border-slate-700 shadow-2xl space-y-6 animate-scale-up">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Branch Integration Config</h3>
                                <p className="text-xs text-slate-400 font-bold">Branch: {configuringBranch.name}</p>
                            </div>
                            <button onClick={() => setConfiguringBranch(null)} className="text-slate-400">✕</button>
                        </div>

                        {/* Provider Selector Tabs */}
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                            {(['mpesa', 'kcb', 'ncba', 'coop'] as const).map(provider => (
                                <button
                                    key={provider}
                                    type="button"
                                    onClick={() => setSelectedProvider(provider)}
                                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${selectedProvider === provider ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    {provider.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSaveBranchGateway} className="space-y-4">
                            {selectedProvider === 'mpesa' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Paybill / Till Number</label>
                                        <input
                                            type="text"
                                            value={gatewayDetails.paybillNumber || ''}
                                            onChange={(e) => setGatewayDetails(prev => ({ ...prev, paybillNumber: e.target.value }))}
                                            placeholder="e.g. 247247"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Passkey</label>
                                        <input
                                            type="password"
                                            value={gatewayDetails.passkey || ''}
                                            onChange={(e) => setGatewayDetails(prev => ({ ...prev, passkey: e.target.value }))}
                                            placeholder="Safaricom Daraja Passkey"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </>
                            )}

                            {(selectedProvider === 'kcb' || selectedProvider === 'ncba' || selectedProvider === 'coop') && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Bank Name</label>
                                        <input
                                            type="text"
                                            value={selectedProvider.toUpperCase() + ' Bank'}
                                            disabled
                                            className="w-full p-3 bg-slate-100 dark:bg-slate-700/50 border-none rounded-xl text-xs font-bold text-slate-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Bank Account Number</label>
                                        <input
                                            type="text"
                                            value={gatewayDetails.bankAccountNumber || ''}
                                            onChange={(e) => setGatewayDetails(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                                            placeholder="e.g. 1102938475"
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setConfiguringBranch(null)} className="px-5 py-3 text-xs font-bold text-slate-500">Cancel</button>
                                <button type="submit" disabled={isSavingGateway} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">
                                    {isSavingGateway ? 'Saving...' : 'Save Integration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Assign Group Admin */}
            {assigningAdminForInst && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full border border-slate-100 dark:border-slate-700 shadow-2xl space-y-6 animate-scale-up">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Assign Group Admin</h3>
                                <p className="text-xs text-slate-400 font-bold">Institution: {assigningAdminForInst.name}</p>
                            </div>
                            <button onClick={() => setAssigningAdminForInst(null)} className="text-slate-400">✕</button>
                        </div>

                        <form onSubmit={handleAssignGroupAdmin} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Dr. John Mark"
                                    value={groupAdminForm.name}
                                    onChange={(e) => setGroupAdminForm(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="e.g., admin@moiedu.ac.ke"
                                    value={groupAdminForm.email}
                                    onChange={(e) => setGroupAdminForm(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="e.g., 0712345678"
                                    value={groupAdminForm.phoneNumber}
                                    onChange={(e) => setGroupAdminForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setAssigningAdminForInst(null)} className="px-5 py-3 text-xs font-bold text-slate-500">Cancel</button>
                                <button type="submit" disabled={isSavingGroupAdmin} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase">
                                    {isSavingGroupAdmin ? 'Saving...' : 'Assign Group Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
