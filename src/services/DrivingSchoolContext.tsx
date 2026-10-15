import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment, MpesaTransaction, BankTransaction, DSLead, DSExpenditure, Branch } from '../types';
import { apiService } from './apiService';
import { useToast } from './ToastContext';
import { generateDSPDF } from '../utils/dsPdfGenerator';

export const recalculateDSInvoicePayments = (
    invoice: DSInvoice, 
    invoicePayments: DSPayment[]
): DSInvoice => {
    let rawItems: any[] = [];
    if (Array.isArray(invoice.items)) {
        rawItems = invoice.items;
    } else if (typeof invoice.items === 'string') {
        try {
            rawItems = JSON.parse(invoice.items);
        } catch {
            rawItems = [];
        }
    }
    if (!Array.isArray(rawItems)) rawItems = [];

    const updatedItems = rawItems.map(item => ({
        ...item,
        amount: Number(item.amount || 0),
        priority: Number(item.priority || 99),
        paidAmount: 0
    }));

    const validPayments = [...invoicePayments]
        .filter(p => p && p.status !== 'Pending Deletion' && p.status !== 'Cancelled' && p.status !== 'Rejected')
        .sort((a, b) => new Date(a.paymentDate || (a as any).createdAt || 0).getTime() - new Date(b.paymentDate || (b as any).createdAt || 0).getTime());

    let totalPaidFromPayments = 0;

    validPayments.forEach(payRecord => {
        let remainingAmount = Number(payRecord.amount || 0);
        totalPaidFromPayments += remainingAmount;

        // Sort items by priority for distribution
        const itemsWithIndices = updatedItems.map((item, idx) => ({ item, idx }));
        itemsWithIndices.sort((a, b) => a.item.priority - b.item.priority);

        itemsWithIndices.forEach(({ item }) => {
            if (remainingAmount <= 0) return;
            const itemBal = Math.max(0, item.amount - (item.paidAmount || 0));
            const distribution = Math.min(remainingAmount, itemBal);
            item.paidAmount = (item.paidAmount || 0) + distribution;
            remainingAmount -= distribution;
        });
    });

    const totalInvoiced = Number(invoice.totalAmount || 0);
    const totalDiscount = Number((invoice as any).discountAmount || (invoice as any).discount_amount || 0);
    const totalSponsor = Number((invoice as any).sponsorAmount || (invoice as any).sponsor_amount || 0);
    const netTotal = Math.max(0, totalInvoiced - totalDiscount - totalSponsor);
    const updatedBalance = Math.max(0, netTotal - totalPaidFromPayments);
    const newStatus = updatedBalance <= 0 && netTotal > 0 ? 'Fully Paid' : (totalPaidFromPayments > 0 ? 'Partially Paid' : 'Pending');

    const copy: any = {
        ...invoice,
        items: updatedItems,
        paidAmount: totalPaidFromPayments,
        balance: updatedBalance,
        status: newStatus,
        updatedAt: new Date().toISOString()
    };
    delete copy.message;
    delete copy.isOpeningBalance;
    return copy;
};

interface DrivingSchoolContextType {
    instructors: DSInstructor[];
    vehicles: DSVehicle[];
    students: DSStudent[];
    lessons: DSLesson[];
    mastery: DSSkillMastery[];
    settings: DSSettings | null;
    invoices: DSInvoice[];
    payments: DSPayment[];
    mpesaTransactions: MpesaTransaction[];
    bankTransactions: BankTransaction[];
    leads: DSLead[];
    expenditures: DSExpenditure[];
    
    // Branch Multi-Tenancy & Scoping
    branches: Branch[];
    activeBranchId: string;
    setActiveBranchId: (branchId: string) => void;
    isUserBranchLocked: boolean;
    userAssignedBranchId: string | null;
    addBranch: (data: Partial<Branch>) => Promise<Branch | void>;
    updateBranch: (data: Partial<Branch>) => Promise<void>;
    deleteBranch: (id: string) => Promise<void>;
    rawStudents: DSStudent[];
    rawInstructors: DSInstructor[];
    rawVehicles: DSVehicle[];
    rawLessons: DSLesson[];
    rawInvoices: DSInvoice[];
    rawPayments: DSPayment[];
    rawLeads: DSLead[];
    rawExpenditures: DSExpenditure[];
    
    // Setters (used for hydration from main loadData)
    setInstructors: React.Dispatch<React.SetStateAction<DSInstructor[]>>;
    setVehicles: React.Dispatch<React.SetStateAction<DSVehicle[]>>;
    setStudents: React.Dispatch<React.SetStateAction<DSStudent[]>>;
    setLessons: React.Dispatch<React.SetStateAction<DSLesson[]>>;
    setMastery: React.Dispatch<React.SetStateAction<DSSkillMastery[]>>;
    setSettings: React.Dispatch<React.SetStateAction<DSSettings | null>>;
    setInvoices: React.Dispatch<React.SetStateAction<DSInvoice[]>>;
    setPayments: React.Dispatch<React.SetStateAction<DSPayment[]>>;
    setLeads: React.Dispatch<React.SetStateAction<DSLead[]>>;
    setExpenditures: React.Dispatch<React.SetStateAction<DSExpenditure[]>>;

    // Operations
    addInstructor: (data: any) => Promise<void>;
    addVehicle: (data: any) => Promise<void>;
    updateVehicle: (data: any) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
    addStudent: (data: any) => Promise<void>;
    verifyStudentPayment: (studentId: string) => Promise<void>;
    updateStudent: (data: any) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    deleteStudents: (ids: string[], skipConfirmation?: boolean) => Promise<void>;
    addLesson: (data: any) => Promise<void>;
    addMastery: (data: any) => Promise<void>;
    updateSettings: (data: any) => Promise<void>;
    addInvoice: (data: any) => Promise<void>;
    updateInvoice: (data: any) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    addPayment: (data: any) => Promise<void>;
    updatePayment: (data: any) => Promise<void>;
    deletePayment: (id: string) => Promise<void>;
    updateLesson: (data: any) => Promise<void>;
    deleteLesson: (id: string) => Promise<void>;
    addLead: (data: Partial<DSLead>) => Promise<void>;
    updateLead: (data: Partial<DSLead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    deleteLeads: (ids: string[]) => Promise<void>;
    addExpenditure: (data: Partial<DSExpenditure>) => Promise<void>;
    updateExpenditure: (data: Partial<DSExpenditure>) => Promise<void>;
    deleteExpenditure: (id: string) => Promise<void>;
    sendLessonNotification?: (lesson: DSLesson, isReminder?: boolean) => Promise<void>;
    refreshData: () => Promise<void>;
    stats: {
        totalStudents: number;
        activeInstructors: number;
        operationalVehicles: number;
        pendingLessons: number;
    };
}

const defaultDrivingSchoolContext: DrivingSchoolContextType = {
    instructors: [],
    vehicles: [],
    students: [],
    lessons: [],
    mastery: [],
    settings: null,
    invoices: [],
    payments: [],
    mpesaTransactions: [],
    bankTransactions: [],
    leads: [],
    expenditures: [],
    branches: [],
    activeBranchId: 'ALL',
    setActiveBranchId: () => {},
    isUserBranchLocked: false,
    userAssignedBranchId: null,
    addBranch: async () => {},
    updateBranch: async () => {},
    deleteBranch: async () => {},
    rawStudents: [],
    rawInstructors: [],
    rawVehicles: [],
    rawLessons: [],
    rawInvoices: [],
    rawPayments: [],
    rawLeads: [],
    rawExpenditures: [],
    setInstructors: () => {},
    setVehicles: () => {},
    setStudents: () => {},
    setLessons: () => {},
    setMastery: () => {},
    setSettings: () => {},
    setInvoices: () => {},
    setPayments: () => {},
    setLeads: () => {},
    setExpenditures: () => {},
    addInstructor: async () => {},
    addVehicle: async () => {},
    updateVehicle: async () => {},
    deleteVehicle: async () => {},
    addStudent: async () => {},
    verifyStudentPayment: async () => {},
    updateStudent: async () => {},
    deleteStudent: async () => {},
    deleteStudents: async () => {},
    addLesson: async () => {},
    addMastery: async () => {},
    updateSettings: async () => {},
    addInvoice: async () => {},
    updateInvoice: async () => {},
    deleteInvoice: async () => {},
    addPayment: async () => {},
    updatePayment: async () => {},
    deletePayment: async () => {},
    updateLesson: async () => {},
    deleteLesson: async () => {},
    addLead: async () => {},
    updateLead: async () => {},
    deleteLead: async () => {},
    deleteLeads: async () => {},
    addExpenditure: async () => {},
    updateExpenditure: async () => {},
    deleteExpenditure: async () => {},
    refreshData: async () => {},
    stats: {
        totalStudents: 0,
        activeInstructors: 0,
        operationalVehicles: 0,
        pendingLessons: 0,
    }
};

export const DrivingSchoolContext = createContext<DrivingSchoolContextType | undefined>(undefined);

export function useDrivingSchool() {
    const context = useContext(DrivingSchoolContext);
    if (!context) {
        console.warn('[DrivingSchoolContext] useDrivingSchool called outside of DrivingSchoolProvider, returning safe fallback context.');
        return defaultDrivingSchoolContext;
    }
    return context;
}

export const DrivingSchoolProvider: React.FC<{ children: ReactNode, institutionId: string | undefined, currentUser?: any }> = ({ children, institutionId, currentUser }) => {
    const { success, error, info } = useToast();
    
    const [rawInstructors, setInstructors] = useState<DSInstructor[]>([]);
    const [rawVehicles, setVehicles] = useState<DSVehicle[]>([]);
    const [rawStudents, setStudents] = useState<DSStudent[]>([]);
    const [rawLessons, setLessons] = useState<DSLesson[]>([]);
    const [mastery, setMastery] = useState<DSSkillMastery[]>([]);
    const [settings, setSettings] = useState<DSSettings | null>(null);
    const [rawInvoices, setInvoices] = useState<DSInvoice[]>([]);
    const [rawPayments, setPayments] = useState<DSPayment[]>([]);
    const [mpesaTransactions, setMpesaTransactions] = useState<MpesaTransaction[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [rawLeads, setLeads] = useState<DSLead[]>([]);
    const [rawExpenditures, setExpenditures] = useState<DSExpenditure[]>([]);
    
    // Branches & Multi-Tenancy Scoping
    const [branches, setBranches] = useState<Branch[]>([]);
    const [activeBranchId, setActiveBranchIdState] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);

    const userAssignedBranchId = useMemo(() => {
        return currentUser?.branchId || currentUser?.branch_id || null;
    }, [currentUser]);

    const isUserBranchLocked = useMemo(() => {
        if (!userAssignedBranchId) return false;
        const role = (currentUser?.role || '').toLowerCase();
        const isSuperOrDev = role.includes('developer') || 
                             role.includes('super_admin') || 
                             role.includes('super admin') || 
                             Boolean(currentUser?.isImpersonated) || 
                             Boolean(localStorage.getItem('eduai_super_admin_session'));
        return !isSuperOrDev;
    }, [userAssignedBranchId, currentUser]);

    useEffect(() => {
        if (!institutionId) return;
        const isSuperAdminContext = Boolean(
            (currentUser?.role || '').toLowerCase().includes('super') ||
            currentUser?.isImpersonated ||
            localStorage.getItem('eduai_super_admin_session')
        );

        if (isUserBranchLocked && userAssignedBranchId && !isSuperAdminContext) {
            setActiveBranchIdState(userAssignedBranchId);
            return;
        }
        const saved = localStorage.getItem(`ds_active_branch_${institutionId}`);
        if (saved && !isSuperAdminContext) {
            setActiveBranchIdState(saved);
        } else {
            setActiveBranchIdState('ALL');
        }
    }, [institutionId, isUserBranchLocked, userAssignedBranchId, currentUser]);

    const setActiveBranchId = useCallback((branchId: string) => {
        if (isUserBranchLocked && userAssignedBranchId) {
            setActiveBranchIdState(userAssignedBranchId);
            return;
        }
        setActiveBranchIdState(branchId);
        if (institutionId) {
            try {
                localStorage.setItem(`ds_active_branch_${institutionId}`, branchId);
            } catch (e) {}
        }
    }, [institutionId, isUserBranchLocked, userAssignedBranchId]);

    const defaultBranchId = useMemo(() => branches[0]?.id || `br_main_${institutionId}`, [branches, institutionId]);

    const matchesBranch = useCallback((itemBranchId?: string) => {
        if (activeBranchId === 'ALL') return true;
        if (branches.length <= 1) return true;
        const effectiveBranchId = itemBranchId || defaultBranchId;
        return effectiveBranchId === activeBranchId;
    }, [activeBranchId, defaultBranchId, branches.length]);

    const students = useMemo(() => {
        return rawStudents.filter(s => matchesBranch(s.branchId || s.branch_id));
    }, [rawStudents, matchesBranch]);

    const instructors = useMemo(() => {
        return rawInstructors.filter(i => matchesBranch(i.branchId || i.branch_id));
    }, [rawInstructors, matchesBranch]);

    const vehicles = useMemo(() => {
        return rawVehicles.filter(v => matchesBranch(v.branchId || v.branch_id));
    }, [rawVehicles, matchesBranch]);

    const lessons = useMemo(() => {
        return rawLessons.filter(l => matchesBranch(l.branchId || l.branch_id));
    }, [rawLessons, matchesBranch]);

    const invoices = useMemo(() => {
        return rawInvoices.filter(inv => matchesBranch(inv.branchId || inv.branch_id));
    }, [rawInvoices, matchesBranch]);

    const payments = useMemo(() => {
        return rawPayments.filter(p => matchesBranch(p.branchId || p.branch_id));
    }, [rawPayments, matchesBranch]);

    const leads = useMemo(() => {
        return rawLeads.filter(ld => matchesBranch(ld.branchId || ld.branch_id));
    }, [rawLeads, matchesBranch]);

    const expenditures = useMemo(() => {
        return rawExpenditures.filter(e => matchesBranch(e.branchId || e.branch_id));
    }, [rawExpenditures, matchesBranch]);

    const resolveBranchIdToUse = useCallback((explicitBranchId?: string) => {
        if (explicitBranchId) return explicitBranchId;
        if (activeBranchId !== 'ALL') return activeBranchId;
        if (userAssignedBranchId) return userAssignedBranchId;
        return defaultBranchId;
    }, [activeBranchId, userAssignedBranchId, defaultBranchId]);

    const addBranch = useCallback(async (data: Partial<Branch>) => {
        if (!institutionId) return;
        try {
            const id = data.id || `br_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const newBranch: Branch = {
                id,
                institutionId,
                institution_id: institutionId,
                name: data.name || 'New Branch',
                location: data.location || '',
                code: data.code || '',
                phone: data.phone || '',
                email: data.email || '',
                managerUserId: data.managerUserId || data.manager_user_id,
                manager_user_id: data.managerUserId || data.manager_user_id,
                isActive: data.isActive ?? data.is_active ?? true,
                is_active: data.isActive ?? data.is_active ?? true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            await apiService.saveModuleRecord('branches', newBranch);
            setBranches(prev => {
                const exists = prev.some(b => b.id === newBranch.id);
                return exists ? prev.map(b => b.id === newBranch.id ? newBranch : b) : [...prev, newBranch];
            });
            success('Branch created successfully');
            return newBranch;
        } catch (err) {
            error('Failed to create branch');
            throw err;
        }
    }, [institutionId, success, error]);

    const updateBranch = useCallback(async (data: Partial<Branch>) => {
        if (!institutionId || !data.id) return;
        try {
            const updated = {
                ...data,
                updated_at: new Date().toISOString()
            };
            await apiService.saveModuleRecord('branches', updated);
            setBranches(prev => prev.map(b => b.id === data.id ? { ...b, ...updated } : b));
            success('Branch updated successfully');
        } catch (err) {
            error('Failed to update branch');
            throw err;
        }
    }, [institutionId, success, error]);

    const deleteBranch = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (id.startsWith('br_main_') || branches.length <= 1) {
            error('Cannot delete the primary/default branch.');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this branch? Associated records will become unassigned.')) return;
        try {
            await apiService.deleteModuleRecord('branches', id);
            setBranches(prev => prev.filter(b => b.id !== id));
            if (activeBranchId === id) {
                setActiveBranchId('ALL');
            }
            success('Branch removed successfully');
        } catch (err) {
            error('Failed to delete branch');
            throw err;
        }
    }, [institutionId, branches.length, activeBranchId, setActiveBranchId, success, error]);

    const loadDSData = useCallback(async () => {
        if (!institutionId) {
            console.log("[DSContext] loadDSData: No institutionId provided, skipping fetch.");
            return;
        }
        setIsLoading(true);
        console.log(`[DSContext] loadDSData: Starting fetch for institutionId=${institutionId}`);
        try {
            const [dsInst, dsVeh, dsStud, dsLess, dsMast, dsSet, dsInvs, dsPay, dsMpe, dsBnk, dsVotesStandalone, dsCatsStandalone, dsLeadsStandalone, dsExpendituresStandalone, dsBranches] = await Promise.all([
                apiService.fetchModuleRecords<DSInstructor>('ds_instructors', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSVehicle>('ds_vehicles', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSStudent>('ds_students', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<DSLesson>('ds_lessons', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<DSSkillMastery>('ds_skill_mastery', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<DSSettings>('ds_settings', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<DSPayment>('ds_payments', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<MpesaTransaction>('mpesa_transactions', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<BankTransaction>('bank_transactions', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<any>('ds_votes', institutionId).catch(() => []),
                apiService.fetchModuleRecords<any>('ds_license_categories', institutionId).catch(() => []),
                apiService.fetchModuleRecords<DSLead>('ds_leads', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<DSExpenditure>('ds_expenditures', institutionId, undefined, { limit: 5000 }).catch(() => []),
                apiService.fetchModuleRecords<Branch>('branches', institutionId).catch(() => []),
            ]);

            console.log(`[DSContext] loadDSData: Fetched ${dsInst.length} instructors, ${dsVeh.length} vehicles, ${dsStud.length} students, ${dsLess.length} lessons, ${dsLeadsStandalone.length} leads`);

            setInstructors(dsInst || []);
            setVehicles(dsVeh || []);
            setStudents(dsStud || []);
            setLessons(dsLess || []);
            setMastery(dsMast || []);

            const cleanId = (id?: string) => id ? String(id).replace(/^(inst_|br_)/i, '').toLowerCase() : '';
            const normInstId = cleanId(institutionId);
            let loadedBranches = (dsBranches || []).filter((b: any) => {
                const bInst = b.institutionId || (b as any).institution_id;
                return bInst === institutionId || (normInstId && cleanId(bInst) === normInstId);
            });
            if (loadedBranches.length === 0) {
                const defaultBranch: Branch = {
                    id: `br_main_${institutionId}`,
                    institutionId,
                    institution_id: institutionId,
                    name: 'Main Campus / HQ',
                    location: 'Main Location',
                    code: 'MAIN',
                    isActive: true,
                    is_active: true
                };
                loadedBranches = [defaultBranch];
                apiService.saveModuleRecord('branches', defaultBranch).catch(() => {});
            }
            setBranches(loadedBranches);

            // Safely consolidate embedded cache columns with standalone DB rows and preserve local state if backend strips newly added columns
            setSettings(prev => {
                let baseSettings: any = dsSet && dsSet.length > 0 ? dsSet[0] : null;

                // Smart consolidation of standalone SQL rows and embedded blob arrays for Fee Votes
                const votesMap = new Map();
                const addVoteToMap = (v: any) => {
                    const vName = v?.voteName || v?.vote_name;
                    if (vName) {
                        votesMap.set(vName.toLowerCase().trim(), {
                            ...v,
                            voteName: vName,
                            defaultAmount: v?.defaultAmount ?? v?.default_amount ?? 0,
                            isMandatory: v?.isMandatory ?? v?.is_mandatory ?? false
                        });
                    }
                };
                let backupVotes: any[] = [];
                let backupCats: any[] = [];
                let backupGroups: string[] = [];
                try {
                    const bv = localStorage.getItem(`ds_votes_backup_${institutionId}`);
                    if (bv) backupVotes = JSON.parse(bv);
                    const bc = localStorage.getItem(`ds_cats_backup_${institutionId}`);
                    if (bc) backupCats = JSON.parse(bc);
                    const bg = localStorage.getItem(`ds_groups_backup_${institutionId}`);
                    if (bg) backupGroups = JSON.parse(bg);
                } catch (storageErr) {}

                if (prev?.votes && Array.isArray(prev.votes)) prev.votes.forEach(addVoteToMap);
                if (backupVotes && Array.isArray(backupVotes)) backupVotes.forEach(addVoteToMap);
                if (baseSettings?.votes && Array.isArray(baseSettings.votes)) baseSettings.votes.forEach(addVoteToMap);
                if (dsVotesStandalone && Array.isArray(dsVotesStandalone)) dsVotesStandalone.forEach(addVoteToMap);
                const finalVotes = Array.from(votesMap.values());

                // Smart consolidation for License Categories
                // NOTE: merge order matters — standalone table rows first, then JSONB blob wins last
                // so that parentCategory (which may be missing from older standalone rows) is preserved
                const catsMap = new Map();
                const addCatToMap = (c: any) => {
                    const cCode = c?.code;
                    if (cCode) {
                        const existing = catsMap.get(cCode.toLowerCase().trim()) || {};
                        catsMap.set(cCode.toLowerCase().trim(), {
                            ...existing,
                            ...c,
                            code: cCode,
                            name: c?.name || existing?.name || '',
                            description: c?.description ?? existing?.description ?? '',
                            baseFee: c?.baseFee ?? c?.base_fee ?? existing?.baseFee ?? 0,
                            isActive: c?.isActive ?? c?.is_active ?? existing?.isActive ?? true,
                            parentCategory: c?.parentCategory ?? c?.parent_category ?? existing?.parentCategory ?? 'Driving'
                        });
                    }
                };
                // Apply in ascending priority: standalone rows first, JSONB blob last (wins)
                if (dsCatsStandalone && Array.isArray(dsCatsStandalone)) dsCatsStandalone.forEach(addCatToMap);
                if (prev?.licenseCategories && Array.isArray(prev.licenseCategories)) prev.licenseCategories.forEach(addCatToMap);
                if (backupCats && Array.isArray(backupCats)) backupCats.forEach(addCatToMap);
                if (baseSettings?.licenseCategories && Array.isArray(baseSettings.licenseCategories)) baseSettings.licenseCategories.forEach(addCatToMap);
                const finalCats = Array.from(catsMap.values());

                // Consolidate groups
                const groupsSet = new Set<string>();
                const addGroup = (g: string) => {
                    if (g && typeof g === 'string' && g.trim()) {
                        groupsSet.add(g.trim());
                    }
                };
                ['Driving', 'Computer Classes', 'IELTS'].forEach(addGroup);
                if (prev?.licenseGroups && Array.isArray(prev.licenseGroups)) prev.licenseGroups.forEach(addGroup);
                if (backupGroups && Array.isArray(backupGroups)) backupGroups.forEach(addGroup);
                if (baseSettings?.licenseGroups && Array.isArray(baseSettings.licenseGroups)) baseSettings.licenseGroups.forEach(addGroup);
                const finalGroups = Array.from(groupsSet);

                if (baseSettings) {
                    return {
                        ...baseSettings,
                        votes: finalVotes,
                        licenseCategories: finalCats,
                        licenseGroups: finalGroups
                    };
                } else {
                    return {
                        id: `ds_settings_${institutionId}`,
                        institutionId,
                        ...prev,
                        votes: finalVotes,
                        licenseCategories: finalCats,
                        licenseGroups: finalGroups
                    };
                }
            });
            // Auto-heal and reconcile invoice paid amount, balances, and distributed items against actual payments
            const healedInvoices = (dsInvs || []).map(inv => {
                const linkedPayments = (dsPay || []).filter(p => {
                    if (!p || p.status === 'Pending Deletion' || p.status === 'Cancelled' || p.status === 'Rejected') return false;
                    if (p.invoiceId && (p.invoiceId === inv.id || p.invoiceId === inv.invoiceNumber)) return true;
                    if (!p.invoiceId) {
                        if (p.studentId && (p.studentId === inv.studentId || (inv as any).admissionNumber === p.studentId)) return true;
                        if (p.studentName && inv.studentName && p.studentName.trim().toLowerCase() === inv.studentName.trim().toLowerCase()) return true;
                    }
                    return false;
                });

                if (linkedPayments.length > 0) {
                    const recalculated = recalculateDSInvoicePayments(inv, linkedPayments);
                    const diffPaid = Math.abs(Number(inv.paidAmount || 0) - recalculated.paidAmount);
                    const diffBal = Math.abs(Number(inv.balance || 0) - recalculated.balance);
                    if (diffPaid > 0.05 || diffBal > 0.05) {
                        console.log(`[DSContext] Auto-healing invoice ${inv.invoiceNumber || inv.id}: paid ${inv.paidAmount} -> ${recalculated.paidAmount}, bal ${inv.balance} -> ${recalculated.balance}`);
                        apiService.saveModuleRecord('ds_invoices', recalculated).catch(err => {
                            console.warn('[DSContext] Failed to persist auto-healed invoice:', err);
                        });
                        return recalculated;
                    }
                }
                return inv;
            });

            // Auto-heal payments that have missing or generic studentName ('Student')
            const healedPayments = (dsPay || []).map(p => {
                const rawName = (p.studentName || (p as any).student_name || '').trim();
                const isGenericOrMissing = !rawName || rawName.toLowerCase() === 'student' || rawName.toLowerCase() === 'learner';

                const targetId = p.studentId || (p as any).student_id;
                const payAdm = (p.admissionNumber || (p as any).admission_number || '').trim().toLowerCase();

                const matchedStud = (dsStud || []).find(s => 
                    (targetId && (s.id === targetId || (s as any)._id === targetId)) ||
                    (targetId && ((s.admissionNumber || '').trim().toLowerCase() === String(targetId).trim().toLowerCase() || ((s as any).admission_number || '').trim().toLowerCase() === String(targetId).trim().toLowerCase())) ||
                    (payAdm && ((s.admissionNumber || '').trim().toLowerCase() === payAdm || ((s as any).admission_number || '').trim().toLowerCase() === payAdm))
                );

                const invId = p.invoiceId || (p as any).invoice_id;
                const matchedInv = (healedInvoices || dsInvs || []).find(inv => 
                    (invId && (inv.id === invId || inv.invoiceNumber === invId)) ||
                    (targetId && (inv.studentId === targetId || (inv as any).admissionNumber === targetId))
                );

                let realName = '';
                if (matchedStud?.fullName && matchedStud.fullName.trim().toLowerCase() !== 'student') {
                    realName = matchedStud.fullName;
                } else if (matchedInv?.studentName && matchedInv.studentName.trim().toLowerCase() !== 'student') {
                    realName = matchedInv.studentName;
                }

                const realAdm = matchedStud?.admissionNumber || (matchedStud as any)?.admission_number || (matchedInv as any)?.admissionNumber || p.admissionNumber;
                const realStudentId = matchedStud?.id || p.studentId;

                if (isGenericOrMissing && realName) {
                    console.log(`[DSContext] Auto-healing payment ${p.receiptNumber || p.id} studentName: "${rawName}" -> "${realName}"`);
                    const updatedPayment = {
                        ...p,
                        studentName: realName,
                        studentId: realStudentId || p.studentId,
                        ...(realAdm ? { admissionNumber: realAdm } : {})
                    };
                    apiService.saveModuleRecord('ds_payments', updatedPayment).catch(err => {
                        console.warn('[DSContext] Failed to persist auto-healed payment:', err);
                    });
                    return updatedPayment;
                }

                return p;
            });

            setInvoices(healedInvoices);
            setPayments(healedPayments);
            setMpesaTransactions(dsMpe || []);
            setBankTransactions(dsBnk || []);
            setLeads(prev => {
                const fetchedIds = new Set((dsLeadsStandalone || []).map(l => l.id));
                const localOnly = prev.filter(l => !fetchedIds.has(l.id));
                return [...(dsLeadsStandalone || []), ...localOnly];
            });
            setExpenditures([...(dsExpendituresStandalone || [])]);
        } catch (err) {
            console.error("[DSContext] loadDSData: Failed to load DS data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadDSData();
    }, [loadDSData]);

    const refreshData = loadDSData;
    const onRefresh = refreshData;

    const resolveInstitutionConfig = useCallback(async (instId?: string) => {
        let matchedInst: any = null;
        try {
            if (instId) {
                const insts = await apiService.fetchModuleRecords('institutions', instId);
                if (Array.isArray(insts) && insts.length > 0) {
                    matchedInst = insts.find((i: any) => 
                        i && (
                            i.id === instId || 
                            i.id === `inst_${instId}` || 
                            instId === `inst_${i.id}` || 
                            String(i.id).toLowerCase() === String(instId).toLowerCase()
                        )
                    );
                    if (!matchedInst && insts.length === 1) {
                        matchedInst = insts[0];
                    }
                }
            }
        } catch (e) {
            console.warn("[DS Automation] Failed to fetch institution config:", e);
        }

        // Secondary fallback to current_institution in local storage
        if (!matchedInst) {
            try {
                const stored = localStorage.getItem('current_institution');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed && (parsed.id === instId || !instId || parsed.id === `inst_${instId}` || instId === `inst_${parsed.id}`)) {
                        matchedInst = parsed;
                    }
                }
            } catch (_) {}
        }

        let resolvedName = matchedInst?.name || settings?.schoolName || 'Driving School';
        // Strictly sanitize: ensure a driving school welcome message never leaks a "Law Firm" tenant name
        if (!resolvedName || resolvedName.toLowerCase().includes('law firm')) {
            resolvedName = settings?.schoolName || 'Driving School';
        }

        return {
            ...(matchedInst || {}),
            name: resolvedName,
            smsConfig: matchedInst?.smsConfig || (matchedInst as any)?.sms_config
        };
    }, [settings?.schoolName]);

    const addInstructor = useCallback(async (data: any) => {
        try {
            const inst = await resolveInstitutionConfig(institutionId);
            const portalTitle = inst.name || settings?.schoolName || 'Driving School';
            const userId = `u_${Date.now()}`;
            const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
            const userEmail = data.email || `${userId}@ds.local`;
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id);

            // 1. Register central user account for portal login
            try {
                await apiService.registerUser({
                    id: userId,
                    name: data.name,
                    email: userEmail,
                    password: generatedPassword,
                    role: 'driving_instructor',
                    institutionId,
                    branchId: branchIdToUse,
                    branch_id: branchIdToUse,
                    status: 'active'
                } as any, portalTitle);

                // Persist phone number directly to bypass generic SMS dispatchers
                await apiService.saveUser({
                    id: userId,
                    name: data.name,
                    email: userEmail,
                    phoneNumber: data.phone,
                    password: generatedPassword,
                    role: 'driving_instructor',
                    institutionId,
                    branchId: branchIdToUse,
                    branch_id: branchIdToUse,
                    status: 'active'
                } as any);
            } catch (e) {
                console.warn("Platform instructor registration warning:", e);
            }

            const instId = `inst_${Date.now()}`;
            await apiService.saveModuleRecord('ds_instructors', { ...data, id: instId, userId, institutionId, branchId: branchIdToUse, branch_id: branchIdToUse });
            success("Instructor added successfully");

            // Automated Welcome Credentials via SMS
            if (data.phone && data.phone.trim().length >= 9) {
                try {
                    const companySettings = await apiService.fetchCompanySettings().catch(() => null);
                    const activeSmsConfig = inst.smsConfig || companySettings?.smsConfig;

                    const portalUrl = window.location.origin;
                    const smsMsg = `Welcome to ${portalTitle}! Your Driving Instructor account is ready.\nPortal: ${portalUrl}\nUser ID: ${data.phone}\nTemp Password: ${generatedPassword}`;
                    
                    await apiService.sendSms(data.phone, smsMsg, activeSmsConfig, 1, institutionId);
                    console.log("[DS Automation] Welcome credentials SMS dispatched to instructor:", data.phone);
                } catch (smsErr) {
                    console.error("[DS Automation] Failed to dispatch instructor welcome SMS:", smsErr);
                }
            }

            await onRefresh();
        } catch (err) {
            error("Failed to add instructor");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, onRefresh, success, error, resolveInstitutionConfig, settings?.schoolName]);

    const addVehicle = useCallback(async (data: any) => {
        try {
            const isUpdate = !!data.id;
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id);
            await apiService.saveModuleRecord('ds_vehicles', { 
                ...data, 
                id: data.id || `vh_${Date.now()}`, 
                institutionId,
                branchId: branchIdToUse,
                branch_id: branchIdToUse
            });
            success(isUpdate ? "Vehicle updated successfully" : "Vehicle registered successfully");
            await onRefresh();
        } catch (err) {
            error(data.id ? "Failed to update vehicle" : "Failed to register vehicle");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, onRefresh, success, error]);

    const updateVehicle = addVehicle;

    const deleteVehicle = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to remove this vehicle from the fleet?")) return;
        try {
            await apiService.deleteModuleRecord('ds_vehicles', id);
            success("Vehicle removed from fleet");
            await onRefresh();
        } catch (err) {
            error("Failed to remove vehicle");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addStudent = useCallback(async (data: any) => {
        if (!institutionId) return;

        // Fetch institution configuration safely
        let inst: any = { name: settings?.schoolName || 'Driving School' };
        try {
            inst = await resolveInstitutionConfig(institutionId);
        } catch (e) {
            console.warn("Failed to fetch institution config in addStudent:", e);
        }

        const billingModel = inst.billing_model || inst.billingModel || 'fixed';
        const isSuspended = inst.is_suspended_for_billing || inst.isSuspendedForBilling || false;

        if (billingModel === 'postpaid_student' && isSuspended) {
            error("Access Suspended: Your school has an overdue monthly bill. Please settle it to enroll new students.");
            throw new Error("Institution billing suspension");
        }
        
        let admNumber = data.admissionNumber || data.admission_number;
        if (!admNumber) {
            const prefixStr = (settings?.studentIdPrefix || 'ADM-').trim();
            const asNum = Number(prefixStr);
            if (!isNaN(asNum) && prefixStr !== '') {
                let maxVal = asNum;
                students.forEach(s => {
                    if (s.admissionNumber) {
                        const sNum = Number(s.admissionNumber.trim());
                        if (!isNaN(sNum) && sNum >= asNum && sNum > maxVal) {
                            maxVal = sNum;
                        }
                    }
                });
                admNumber = String(maxVal + 1);
            } else {
                let maxNum = 0;
                students.forEach(s => {
                    if (s.admissionNumber && s.admissionNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                        const remainder = s.admissionNumber.slice(prefixStr.length).trim();
                        const match = remainder.match(/\d+/);
                        if (match) {
                            const num = parseInt(match[0], 10);
                            if (!isNaN(num) && num > maxNum) {
                                maxNum = num;
                            }
                        }
                    }
                });
                admNumber = `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
            }
        } else {
            // 0. Validate Admission Number Uniqueness
            const isDuplicate = students.some(s => 
                s.admissionNumber?.toLowerCase().trim() === admNumber.toLowerCase().trim()
            );
            if (isDuplicate) {
                error(`Admission number "${admNumber}" is already assigned to another student.`);
                throw new Error("Duplicate admission number");
            }
        }

        try {
            const userId = data.userId || `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            // Generate 6-digit numeric temporary password for full compatibility with kiosk touchscreens and portal logins
            const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
            const userEmail = data.email || `${userId}@ds.local`;
            
            const isPrepaid = billingModel === 'prepaid_student';
            const userStatus = isPrepaid ? 'inactive' : 'active';

            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id);
            const portalTitle = inst.name || settings?.schoolName || 'Driving School';

            // 1. Create platform user account so they appear in global student views
            try {
                await apiService.registerUser({
                    id: userId,
                    name: data.fullName,
                    email: userEmail,
                    password: generatedPassword,
                    role: 'student',
                    institutionId,
                    branchId: branchIdToUse,
                    branch_id: branchIdToUse,
                    status: userStatus
                } as any, portalTitle);

                // Ensure the phone number is correctly persisted on the user record directly
                await apiService.saveUser({
                    id: userId,
                    name: data.fullName,
                    email: userEmail,
                    phoneNumber: data.phone,
                    password: generatedPassword,
                    role: 'student',
                    institutionId,
                    branchId: branchIdToUse,
                    branch_id: branchIdToUse,
                    status: userStatus
                } as any);
            } catch (e) {
                console.warn("Platform user registration skipped or failed:", e);
            }

            // 2. Create Driving School specific record
            const newId = data.id || `dss_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const duration = data.courseDurationDays || settings?.schedulingRules?.requiredDaysToComplete || settings?.defaultCourseDuration || 0;
            const newStudent = { 
                ...data, 
                admissionNumber: admNumber,
                id: newId, 
                userId,
                institutionId,
                branchId: branchIdToUse,
                branch_id: branchIdToUse,
                status: isPrepaid ? 'Pending Payment' : 'Enrolled',
                courseDurationDays: duration,
                remainingDays: duration,
                paymentStatus: isPrepaid ? 'unpaid' : 'paid',
                createdAt: new Date().toISOString()
            };
            delete (newStudent as any).skipWelcomeSms;
            delete (newStudent as any).skip_welcome_sms;
            
            await apiService.saveModuleRecord('ds_students', newStudent);

            if (isPrepaid) {
                const amount = Number(inst.rate_per_student || inst.ratePerStudent || 0);
                if (amount > 0) {
                    try {
                        const response = await apiService.initiateNcbaPayment(amount, data.phone || '', {
                            type: 'student_admission',
                            student_id: newId,
                            institution_id: institutionId
                        });
                        const reqId = response?.checkoutRequestId || response?.requestId;
                        if (response && (response.success || reqId)) {
                            (newStudent as any).checkoutRequestId = reqId;
                            await apiService.saveModuleRecord('ds_students', {
                                ...newStudent,
                                checkoutRequestId: reqId
                            });
                            success(`NCBA payment prompt sent to student's phone.`);
                        } else {
                            error(`Payment prompt initiation failed for student ${data.fullName}.`);
                        }
                    } catch (err) {
                        console.error("[DS Billing] NCBA STK push exception:", err);
                        error("NCBA STK payment prompt offline.");
                    }
                } else {
                    // Free or 0 price prepaid student
                    await apiService.saveModuleRecord('ds_students', { ...newStudent, status: 'Enrolled', paymentStatus: 'paid' });
                    await apiService.saveUser({ id: userId, status: 'active' } as any);
                    success("Student enrolled successfully (free registration)");
                }
            } else {
                success("Student enrolled successfully");

                // Automated Welcome Credentials via SMS (can be suppressed for bulk imports)
                if (!data.skipWelcomeSms && data.phone && data.phone.trim().length >= 9) {
                    try {
                        const companySettings = await apiService.fetchCompanySettings().catch(() => null);
                        const activeSmsConfig = inst.smsConfig || companySettings?.smsConfig;

                        const portalUrl = window.location.origin;
                        const smsMsg = `Welcome to ${portalTitle}! Your Driving School account is ready.\nPortal: ${portalUrl}\nUser ID: ${data.phone}\nTemp Password: ${generatedPassword}`;
                        
                        await apiService.sendSms(data.phone, smsMsg, activeSmsConfig, 1, institutionId);
                        console.log("[DS Automation] Welcome credentials SMS dispatched to student:", data.phone);
                    } catch (smsErr) {
                        console.error("[DS Automation] Failed to dispatch student welcome SMS:", smsErr);
                    }
                }
            }

            await onRefresh();
            return newStudent;
        } catch (err) {
            error("Failed to enroll student");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, onRefresh, success, error, info, students, settings, resolveInstitutionConfig]);

    const verifyStudentPayment = useCallback(async (studentId: string) => {
        if (!institutionId) return;
        const student = students.find(s => s.id === studentId);
        if (!student) {
            error("Student not found.");
            return;
        }

        let requestId = (student as any).checkoutRequestId || (student as any).checkout_request_id;
        
        if (!requestId) {
            // Fallback: Fetch latest pending transaction from database
            try {
                const txns = await apiService.fetchModuleRecords('ncba_transactions', undefined, undefined, {
                    limit: 1,
                    order: 'created_at.desc'
                });
                const match = txns.find((t: any) => t.metadata?.student_id === studentId && t.status === 'pending');
                if (match) {
                    requestId = match.transaction_id || match.checkout_request_id;
                }
            } catch (e) {
                console.warn("Failed to lookup transactions:", e);
            }
        }

        if (!requestId) {
            error("No pending NCBA payment transaction found for this student.");
            return;
        }

        try {
            info("Querying NCBA payment status...");
            const statusCheck = await apiService.checkNcbaStatus(requestId);
            if (statusCheck && (statusCheck.status === 'completed' || statusCheck.status === 'SUCCESS' || statusCheck.status === 'paid')) {
                success("Payment confirmed successfully! Student has been enrolled.");
                await onRefresh();
            } else {
                error(`Payment status is currently: ${statusCheck.status || 'pending'}. Please retry once PIN is entered.`);
            }
        } catch (err: any) {
            error(err.message || "Failed to query NCBA payment status.");
        }
    }, [institutionId, students, onRefresh, success, error, info]);

    const updateStudent = useCallback(async (data: any) => {
        if (!institutionId) return;

        // 0. Validate Admission Number Uniqueness (if changed)
        if (data.admissionNumber) {
            const isDuplicate = students.some(s => 
                s.id !== data.id && 
                s.admissionNumber?.toLowerCase().trim() === data.admissionNumber.toLowerCase().trim()
            );
            if (isDuplicate) {
                error(`Admission number "${data.admissionNumber}" is already assigned to another student.`);
                throw new Error("Duplicate admission number");
            }
        }

        try {
            await apiService.saveModuleRecord('ds_students', { 
                ...data, 
                institutionId,
                updatedAt: new Date().toISOString()
            });
            success("Student updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update student");
            throw err;
        }
    }, [institutionId, students, onRefresh, success, error]);

    const deleteStudent = useCallback(async (id: string) => {
        if (!institutionId) return;
        const student = students.find(s => s.id === id);
        if (!student) return;

        if (!window.confirm("Are you sure you want to remove this student? This action cannot be undone.")) return;
        
        try {
            // 1. Delete student record
            await apiService.deleteModuleRecord('ds_students', id);
            
            // 2. Delete linked user account if exists
            const userId = student.userId || (student as any).user_id;
            if (userId) {
                await apiService.deleteModuleRecord('users', userId).catch(err => {
                    console.warn("[DS] Failed to delete student user account:", err);
                });
            }

            // 3. Update local state immediately for instant feedback
            setStudents(prev => prev.filter(s => s.id !== id));
            
            success("Student removed successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to remove student");
            throw err;
        }
    }, [institutionId, students, onRefresh, success, error]);

    const deleteStudents = useCallback(async (ids: string[], skipConfirmation = false) => {
        if (!institutionId || !ids || ids.length === 0) return;
        
        if (!skipConfirmation) {
            const count = ids.length;
            if (!window.confirm(`Are you sure you want to permanently delete ${count === 1 ? 'this student' : `these ${count} students`}? This will remove their student profiles, progress records, and linked portal accounts. This action cannot be undone.`)) {
                return;
            }
        }
        
        try {
            const idsSet = new Set(ids);
            const targetStudents = students.filter(s => idsSet.has(s.id));
            
            // 1. Delete student records from ds_students in bulk
            await apiService.deleteModuleRecord('ds_students', ids.join(','));
            
            // 2. Collect and delete all linked user accounts in bulk
            const userIdsToDelete = targetStudents
                .map(s => s.userId || (s as any).user_id)
                .filter(Boolean) as string[];
                
            if (userIdsToDelete.length > 0) {
                await apiService.deleteModuleRecord('users', userIdsToDelete.join(',')).catch(err => {
                    console.warn("[DS] Failed to delete linked student user accounts:", err);
                });
            }

            // 3. Clean up associated lessons if any
            const lessonIdsToDelete = (lessons || [])
                .filter(l => l && idsSet.has(l.studentId))
                .map(l => l.id)
                .filter(Boolean);
            if (lessonIdsToDelete.length > 0) {
                await apiService.deleteModuleRecord('ds_lessons', lessonIdsToDelete.join(',')).catch(err => {
                    console.warn("[DS] Failed to delete associated lessons:", err);
                });
                setLessons(prev => prev.filter(l => !idsSet.has(l.studentId)));
            }

            // 4. Update local students state immediately
            setStudents(prev => prev.filter(s => !idsSet.has(s.id)));
            
            success(`${ids.length} student${ids.length === 1 ? '' : 's'} removed successfully`);
            await onRefresh();
        } catch (err: any) {
            console.error("[DSContext] Failed to bulk delete students:", err);
            error("Failed to delete students: " + (err.message || "Unknown error"));
            throw err;
        }
    }, [institutionId, students, lessons, onRefresh, success, error]);

    const sendLessonNotification = useCallback(async (lesson: DSLesson, isReminder = false) => {
        const student = students.find(s => s.id === lesson.studentId);
        const instructor = instructors.find(i => i.id === lesson.instructorId);
        const vehicle = vehicles.find(v => v.id === lesson.vehicleId);

        if (!student || !instructor) {
            console.warn("[DS Automation] Missing student or instructor for lesson notification", lesson.id);
            return;
        }

        try {
            const inst = await resolveInstitutionConfig(institutionId);
            const companySettings = await apiService.fetchCompanySettings().catch(() => null);
            const portalTitle = inst.name || settings?.schoolName || 'Driving School';
            const activeSmsConfig = companySettings?.smsConfig || inst.smsConfig;

            // 1. Notification for Student
            const actionLink = `${window.location.origin}/ds/lesson/${lesson.id}/manage`;
            
            if (student.email) {
                const subject = isReminder ? `Reminder: Lesson Starting Soon - ${lesson.startTime}` : `New Lesson Scheduled: ${lesson.lessonDate || (lesson as any).date}`;
                const body = `Dear ${student.fullName},\n\n` +
                             (isReminder ? `This is a reminder for your upcoming lesson starting at ${lesson.startTime}.\n\n` : `A new driving lesson has been scheduled for you.\n\n`) +
                             `Details:\n` +
                             `- Date: ${lesson.lessonDate || (lesson as any).date}\n` +
                             `- Time: ${lesson.startTime} - ${lesson.endTime || (lesson as any).endTime}\n` +
                             `- Instructor: ${instructor.name}\n` +
                             `- Vehicle: ${vehicle?.plateNumber || 'N/A'}\n\n` +
                             `Please confirm your attendance or request a reschedule here: ${actionLink}\n\n` +
                             `Please ensure you are at the designated training area at least 5 minutes early.\n\n` +
                             `Happy Learning,\n${portalTitle}`;
                
                await apiService.sendEmail(student.email, subject, body).catch(e => console.error("Email to student failed", e));
            }
 
            const isDirectorPhone = inst.phoneNumber && student.phone && (student.phone.trim().replace(/\D/g, '') === inst.phoneNumber.trim().replace(/\D/g, ''));
            if (student.phone && !isDirectorPhone) {
                let sms = '';
                if (isReminder) {
                    const customTemplate = settings?.schedulingRules?.smsReminderTemplate;
                    if (settings?.schedulingRules?.enableSmsReminders && customTemplate) {
                        sms = customTemplate
                            .replace(/{student}/g, student.fullName)
                            .replace(/{school}/g, portalTitle)
                            .replace(/{instructor}/g, instructor.name)
                            .replace(/{time}/g, lesson.startTime)
                            .replace(/{date}/g, lesson.lessonDate || (lesson as any).date || '');
                    } else {
                        sms = `Reminder: Your ${portalTitle} lesson with ${instructor.name} starts at ${lesson.startTime}. Be ready!`;
                    }
                } else {
                    sms = `Hello ${student.fullName}, your ${portalTitle} lesson is scheduled for ${lesson.lessonDate || (lesson as any).date} at ${lesson.startTime}. Manage here: ${actionLink}`;
                }
                
                await apiService.sendSms(student.phone, sms, activeSmsConfig, 1, institutionId, undefined, true).catch(e => console.error("SMS to student failed", e));
            }

            // 2. Notification for Instructor
            if (instructor.email) {
                const subject = isReminder ? `Reminder: Lesson Starting Soon - ${lesson.startTime}` : `New Lesson Assigned: ${lesson.lessonDate || (lesson as any).date}`;
                const body = `Dear ${instructor.name},\n\n` +
                             (isReminder ? `Your lesson with ${student.fullName} is starting at ${lesson.startTime}.\n\n` : `You have been assigned a new lesson.\n\n`) +
                             `Details:\n` +
                             `- Student: ${student.fullName}\n` +
                             `- Date: ${lesson.lessonDate || (lesson as any).date}\n` +
                             `- Time: ${lesson.startTime} - ${lesson.endTime || (lesson as any).endTime}\n` +
                             `- Vehicle: ${vehicle?.plateNumber || 'N/A'}\n\n` +
                             `Safe driving,\n${portalTitle}`;
                
                await apiService.sendEmail(instructor.email, subject, body).catch(e => console.error("Email to instructor failed", e));
            }

            if (instructor.phone) {
                const sms = isReminder
                    ? `Reminder: Your lesson with ${student.fullName} starts at ${lesson.startTime}. Vehicle: ${vehicle?.plateNumber || 'N/A'}.`
                    : `Hello ${instructor.name}, a new lesson with ${student.fullName} has been scheduled for ${lesson.lessonDate || (lesson as any).date} at ${lesson.startTime}.`;
                
                await apiService.sendSms(instructor.phone, sms, activeSmsConfig, 1, institutionId, undefined, true).catch(e => console.error("SMS to instructor failed", e));
            }

            console.log(`[DS Automation] ${isReminder ? 'Reminder' : 'Initial'} notifications sent for lesson ${lesson.id}`);
        } catch (err) {
            console.error("[DS Automation] Lesson notification critical failure:", err);
        }
    }, [institutionId, students, instructors, vehicles, settings, resolveInstitutionConfig]);

    const checkUpcomingLessons = useCallback(async () => {
        if (!lessons.length) return;
        if (!settings?.schedulingRules?.enableSmsReminders) return; // Only send reminders if enableSmsReminders setting is on
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Find lessons for today that are starting within the next 60 minutes
        const upcoming = lessons.filter(l => {
            if (l.status !== 'Scheduled' || (l as any).reminderSent) return false;
            
            const lessonDate = l.lessonDate;
            if (lessonDate !== today) return false;
            if (!l.startTime || typeof l.startTime !== 'string' || !l.startTime.includes(':')) return false;
            
            try {
                const [hours, minutes] = l.startTime.split(':').map(Number);
                const lessonTime = new Date(now);
                lessonTime.setHours(hours, minutes, 0, 0);
                
                const diffMinutes = (lessonTime.getTime() - now.getTime()) / (1000 * 60);
                return diffMinutes > 0 && diffMinutes <= 60;
            } catch (e) {
                return false;
            }
        });

        if (upcoming.length > 0) {
            console.log(`[DS Automation] Found ${upcoming.length} lessons starting soon. Sending reminders...`);
            for (const lesson of upcoming) {
                await sendLessonNotification(lesson, true);
                // Mark as reminder sent in local state and DB if possible
                // For simplicity here, we'll just track it in a local set for this session to avoid spam
                (lesson as any).reminderSent = true;
                await apiService.saveModuleRecord('ds_lessons', { ...lesson, reminderSent: true } as any);
            }
        }
    }, [lessons, sendLessonNotification]);

    // Periodical background check for upcoming lessons
    useEffect(() => {
        const interval = setInterval(checkUpcomingLessons, 5 * 60 * 1000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, [checkUpcomingLessons]);

    const addLesson = useCallback(async (data: any) => {
        try {
            const studentBranch = data.studentId ? rawStudents.find(s => s.id === data.studentId)?.branchId : undefined;
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id || studentBranch);
            const lesson = { ...data, id: `less_${Date.now()}`, institutionId, branchId: branchIdToUse, branch_id: branchIdToUse, status: 'Scheduled' };
            await apiService.saveModuleRecord('ds_lessons', lesson);
            success("Lesson scheduled successfully");
            
            // Trigger Instant Notification
            sendLessonNotification(lesson, false);
            
            await onRefresh();
        } catch (err) {
            error("Failed to schedule lesson");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, rawStudents, onRefresh, success, error, sendLessonNotification]);

    const updateLesson = useCallback(async (data: any) => {
        try {
            const oldLesson = lessons.find(l => l.id === data.id);
            await apiService.saveModuleRecord('ds_lessons', { ...data, institutionId });
            
            if (data.status === 'Completed' && oldLesson?.status !== 'Completed') {
                const student = students.find(s => s.id === data.studentId);
                if (student) {
                    const currentRemaining = student.remainingDays ?? student.courseDurationDays ?? 0;
                    const durationDays = student.courseDurationDays || 21;
                    const increment = Math.max(5, Math.round(100 / durationDays));
                    const isTheory = data.lessonType === 'Theory';
                    
                    const nextTheory = isTheory ? Math.min(100, (student.theoryProgressPercent || 0) + increment) : (student.theoryProgressPercent || 0);
                    const nextPractical = !isTheory ? Math.min(100, (student.practicalProgressPercent || 0) + increment) : (student.practicalProgressPercent || 0);

                    await apiService.saveModuleRecord('ds_students', {
                        ...student,
                        remainingDays: Math.max(0, currentRemaining - 1),
                        theoryProgressPercent: nextTheory,
                        practicalProgressPercent: nextPractical
                    });
                }
            }
            
            success("Lesson updated");
            await onRefresh();
        } catch (err) {
            error("Failed to update lesson");
            throw err;
        }
    }, [institutionId, lessons, students, onRefresh, success, error]);

    const deleteLesson = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to delete this lesson?")) return;
        try {
            await apiService.deleteModuleRecord('ds_lessons', id);
            success("Lesson deleted successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to delete lesson");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const addMastery = useCallback(async (data: any) => {
        try {
            await apiService.saveModuleRecord('ds_skill_mastery', { ...data, id: `mast_${Date.now()}`, institutionId });
            await onRefresh();
        } catch (err) {
            error("Failed to save mastery progress");
            throw err;
        }
    }, [institutionId, onRefresh, error]);

    const addLead = useCallback(async (data: Partial<DSLead>) => {
        if (!institutionId) return;
        try {
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id);
            const payload: DSLead = {
                id: `lead_${Date.now()}`,
                institutionId,
                branchId: branchIdToUse,
                branch_id: branchIdToUse,
                fullName: data.fullName || 'Walk-in Client',
                phone: data.phone || '',
                email: data.email || '',
                licenseTypeInterested: data.licenseTypeInterested || '',
                licenseCategory: data.licenseCategory || '',
                broadcastId: data.broadcastId || undefined,
                source: data.source || 'Walk-in',
                status: data.status || 'New Enquiry',
                quotedAmount: data.quotedAmount || 0,
                feeStructureId: data.feeStructureId || undefined,
                notes: data.notes || '',
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ds_leads', payload);
            setLeads(prev => [...prev, payload]);
            success("Enquiry lead recorded successfully.");
            await onRefresh();
        } catch (err) {
            console.error("[DSContext] Failed to add lead:", err);
            error("Failed to record walk-in enquiry lead.");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, onRefresh, success, error]);

    const updateLead = useCallback(async (data: Partial<DSLead>) => {
        if (!institutionId || !data.id) return;
        try {
            const payload = {
                ...data,
                institutionId,
                updatedAt: new Date().toISOString(),
                // Ensure FK fields are null (not empty string) to avoid FK constraint violations
                broadcastId: data.broadcastId || undefined,
                feeStructureId: data.feeStructureId || undefined,
            };
            await apiService.saveModuleRecord('ds_leads', payload);
            setLeads(prev => prev.map(l => l.id === data.id ? { ...l, ...payload } as DSLead : l));
            success("Enquiry lead updated successfully.");
            await onRefresh();
        } catch (err) {
            console.error("[DSContext] Failed to update lead:", err);
            error("Failed to update walk-in enquiry lead.");
            throw err;
        }
    }, [institutionId, onRefresh, success, error]);

    const deleteLead = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm("Are you sure you want to remove this enquiry lead?")) return;
        try {
            await apiService.deleteModuleRecord('ds_leads', id);
            setLeads(prev => prev.filter(l => l.id !== id));
            success("Enquiry lead removed successfully.");
        } catch (err) {
            console.error("[DSContext] Failed to delete lead:", err);
            error("Failed to delete walk-in enquiry lead.");
            throw err;
        }
    }, [institutionId, success, error]);

    const deleteLeads = useCallback(async (ids: string[]) => {
        if (!institutionId || ids.length === 0) return;
        if (!window.confirm(`Are you sure you want to remove these ${ids.length} enquiry leads?`)) return;
        try {
            await apiService.deleteModuleRecord('ds_leads', ids.join(','));
            const idsSet = new Set(ids);
            setLeads(prev => prev.filter(l => !idsSet.has(l.id)));
            success(`${ids.length} enquiry leads removed successfully.`);
        } catch (err) {
            console.error("[DSContext] Failed to delete leads:", err);
            error("Failed to delete enquiry leads.");
            throw err;
        }
    }, [institutionId, success, error]);


    const updateSettings = useCallback(async (data: any) => {
        if (!institutionId) return;
        try {
            // Hardened ID resolution to prevent UNIQUE constraint violations on institution_id
            let finalId = data.id || settings?.id;
            
            if (!finalId) {
                const existing = await apiService.fetchModuleRecords('ds_settings', institutionId);
                if (existing && existing.length > 0) {
                    finalId = (existing[0] as any).id;
                }
            }

            const payload = {
                ...data,
                id: finalId || `ds_settings_${institutionId}`,
                institutionId,
                updatedAt: new Date().toISOString()
            };
            
            console.log("[DS Context] updateSettings persistence flow triggered. Payload structure:", payload);
            const result = await apiService.saveModuleRecord('ds_settings', payload);
            console.log("[DS Context] Primary ds_settings blob saved successfully. Response:", result);
            
            // Instantly update local React state to guarantee stability even if backend schema caches lag behind
            const finalVotesArray = payload.votes || settings?.votes || [];
            const finalCatsArray = payload.licenseCategories || settings?.licenseCategories || [];
            const finalGroupsArray = payload.licenseGroups || settings?.licenseGroups || [];
            
            try {
                localStorage.setItem(`ds_votes_backup_${institutionId}`, JSON.stringify(finalVotesArray));
                localStorage.setItem(`ds_cats_backup_${institutionId}`, JSON.stringify(finalCatsArray));
                localStorage.setItem(`ds_groups_backup_${institutionId}`, JSON.stringify(finalGroupsArray));
            } catch (storageErr) {
                console.warn("[DS Context] Local backup cache unavailable:", storageErr);
            }

            setSettings(prev => ({
                ...prev,
                ...payload,
                votes: finalVotesArray,
                licenseCategories: finalCatsArray,
                licenseGroups: finalGroupsArray
            }));
            
            // Helper for smart upsert mirroring to bypass duplicate key conflicts gracefully
            const mirrorSubCollection = async (moduleName: string, items: any[]) => {
                if (!items || !Array.isArray(items)) return;
                console.log(`[DS Context] Mirroring ${items.length} records to ${moduleName} table...`);
                for (const item of items) {
                    if (!item || !item.id) continue;
                    const payload = { ...item, institutionId };
                    try {
                        await apiService.saveModuleRecord(moduleName, payload);
                    } catch (err: any) {
                        const errMsg = err?.message || '';
                        // If duplicate key conflict occurs, automatically attempt graceful PATCH update
                        if (errMsg.includes('23505') || errMsg.toLowerCase().includes('conflict') || errMsg.toLowerCase().includes('already registered')) {
                            try {
                                await apiService.updateModuleRecord(moduleName, item.id, payload);
                            } catch (patchErr) {
                                console.warn(`[DS Context] Graceful PATCH update for pre-existing ${moduleName} record ${item.id} skipped/failed.`);
                            }
                        } else {
                            console.error(`[DS Context] Failed to sync ${moduleName} record:`, item.id, err);
                        }
                    }
                }
            };

            await mirrorSubCollection('ds_fee_structures', data.feeStructures);
            await mirrorSubCollection('ds_votes', data.votes);
            await mirrorSubCollection('ds_license_categories', data.licenseCategories);

            success(`Driving School settings and sub-collections synchronized successfully.`);
            await onRefresh();
        } catch (err) {
            console.error("[DS Context] Save Error during settings persistence flow:", err);
            error("Persistence Failure: Settings could not be saved to database.");
            throw err;
        }
    }, [institutionId, settings, onRefresh, success, error]);

    const sendDocumentNotification = useCallback(async (type: 'invoice' | 'receipt', data: any, studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) {
            console.warn(`[DS Automation] Student not found for ID: ${studentId}`);
            return;
        }

        try {
            console.log(`[DS Automation] Preparing notifications for ${type} #${data.invoiceNumber || data.receiptNumber}`);
            
            // Fetch institution details
            const inst = await resolveInstitutionConfig(institutionId);
            const companySettings = await apiService.fetchCompanySettings().catch(() => null);
            const activeSmsConfig = inst.smsConfig || companySettings?.smsConfig;

            const docTypeName = type === 'invoice' ? 'Invoice' : 'Payment Receipt';
            const docNumber = type === 'invoice' ? data.invoiceNumber : data.receiptNumber;
            const amountStr = `KES ${(data.totalAmount || (data.amount || 0))?.toLocaleString()}`;

            // Attempt PDF generation & Storage Upload gracefully
            let publicUrl = '';
            let pdfBase64 = '';
            const fileName = `${docNumber}.pdf`;

            try {
                const doc = await generateDSPDF(type, data, student as any, settings, inst, invoices, (data as any)?.receivedBy, payments);
                const pdfBlob = doc.output('blob');
                pdfBase64 = doc.output('datauristring').split(',')[1];
                const storagePath = `driving_school/${type}s/${fileName}`;
                publicUrl = await apiService.uploadBlob(storagePath, pdfBlob, 'application/pdf');
            } catch (pdfErr) {
                console.warn("[DS Automation] PDF Generation/Upload warning (continuing with plain notification):", pdfErr);
            }

            // 1. Send Email Notification
            if (student.email) {
                try {
                    const subject = `${inst.name} - ${docTypeName} #${docNumber}`;
                    const balanceLine = type === 'invoice' ? `Balance Due: KES ${(data.balance || 0)?.toLocaleString()}\n` : '';
                    const body = `Dear ${student.fullName},\n\n` +
                                 `Your ${docTypeName} from ${inst.name} has been processed successfully.\n\n` +
                                 `Document Number: #${docNumber}\n` +
                                 `Amount: ${amountStr}\n` +
                                 balanceLine +
                                 `Date: ${new Date().toLocaleDateString()}\n\n` +
                                 (publicUrl ? `Download Link: ${publicUrl}\n\n` : '') +
                                 `Thank you for choosing ${inst.name}. We are dedicated to your excellence!`;
                    
                    const attachments = pdfBase64 ? [{ filename: fileName, content: pdfBase64, encoding: 'base64' }] : undefined;
                    await apiService.sendEmail(student.email, subject, body, undefined, undefined, attachments);
                } catch (emailErr) {
                    console.warn(`[DS Automation] Email delivery warning:`, emailErr);
                }
            }

            if (student.phone) {
                try {
                    const appDocUrl = `${window.location.origin}/?view=ds-invoice&id=${type === 'invoice' ? data.id : data.invoiceId || data.id}`;
                    const finalUrl = await apiService.shortenUrl(appDocUrl);
                    const shortUrl = finalUrl ? `\nView/Pay: ${finalUrl}` : '';
                    const smsMessage = `Hello ${student.fullName}, your ${inst.name} ${docTypeName} #${docNumber} of ${amountStr} is ready.${shortUrl}`;
                    
                    await apiService.sendSms(student.phone, smsMessage, activeSmsConfig, 1, institutionId);
                    console.log(`[DS Automation] Automated SMS successfully dispatched for ${docTypeName} #${docNumber} to ${student.phone}`);
                } catch (smsErr) {
                    console.warn(`[DS Automation] SMS delivery warning:`, smsErr);
                }
            }

            console.log(`[DS Automation] Notification dispatch sequence finalized for ${docTypeName} #${docNumber}`);
        } catch (err) {
            console.error(`[DS Automation] Critical failure in notification workflow:`, err);
        }
    }, [institutionId, students, settings, invoices, resolveInstitutionConfig]);

    const addInvoice = useCallback(async (data: any) => {
        try {
            const prefixStr = (settings?.invoicePrefix || 'INV-').trim();
            let invNumber = data.invoiceNumber;
            
            const asNum = Number(prefixStr);
            const isNumericPrefix = !isNaN(asNum) && prefixStr !== '';
            
            let adheresToPrefix = false;
            if (data.isOpeningBalance) {
                adheresToPrefix = true;
            } else if (invNumber) {
                if (isNumericPrefix) {
                    adheresToPrefix = !isNaN(Number(invNumber)) && Number(invNumber) >= asNum;
                } else {
                    adheresToPrefix = invNumber.toUpperCase().startsWith(prefixStr.toUpperCase());
                }
            }

            if (!adheresToPrefix) {
                if (isNumericPrefix) {
                    let maxVal = asNum;
                    invoices.forEach(inv => {
                        if (inv.invoiceNumber) {
                            const num = Number(inv.invoiceNumber.trim());
                            if (!isNaN(num) && num >= asNum && num > maxVal) {
                                maxVal = num;
                            }
                        }
                    });
                    invNumber = String(maxVal + 1);
                } else {
                    let maxNum = 0;
                    invoices.forEach(inv => {
                        if (inv.invoiceNumber && inv.invoiceNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                            const remainder = inv.invoiceNumber.slice(prefixStr.length).trim();
                            const match = remainder.match(/\d+/);
                            if (match) {
                                const num = parseInt(match[0], 10);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        }
                    });
                    invNumber = `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
                }
            }

            const totalDiscount = Number(data.discountAmount || 0);
            const totalSponsor = Number(data.sponsorAmount || 0);
            const initialBalance = Math.max(0, (data.totalAmount || 0) - totalDiscount - totalSponsor);
            const isOpeningBalance = Boolean(data.isOpeningBalance);
            const studentBranch = data.studentId ? rawStudents.find(s => s.id === data.studentId)?.branchId : undefined;
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id || studentBranch);
            const inv: any = {
                ...data,
                id: data.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                institutionId,
                branchId: branchIdToUse,
                branch_id: branchIdToUse,
                invoiceNumber: invNumber,
                items: (data.items || []).map((it: any) => ({ ...it, paidAmount: 0 })),
                status: initialBalance <= 0 ? 'Fully Paid' : 'Pending',
                paidAmount: 0,
                balance: initialBalance,
                createdAt: new Date().toISOString()
            };
            delete inv.isOpeningBalance;
            delete inv.message;

            await apiService.saveModuleRecord('ds_invoices', inv);
            success("Invoice generated successfully");
            
            // Trigger Automation
            if (!isOpeningBalance) {
                await sendDocumentNotification('invoice', inv, inv.studentId);
            }
            
            await onRefresh();
            return inv;
        } catch (err) {
            error("Failed to generate invoice");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, rawStudents, onRefresh, success, error, students, settings, invoices, sendDocumentNotification]);

    const recalculateInvoicePayments = useCallback((invoice: DSInvoice, invoicePayments: DSPayment[]) => {
        return recalculateDSInvoicePayments(invoice, invoicePayments);
    }, []);

    const updateInvoice = useCallback(async (data: any) => {
        if (!institutionId || !data.id) return;
        try {
            const oldInvoice = invoices.find(inv => inv.id === data.id);
            if (!oldInvoice) {
                error("Invoice to update not found");
                return;
            }

            // Find all payments linked to this invoice
            const invoicePayments = payments.filter(p => p.invoiceId === data.id);

            // Re-apply recalculateInvoicePayments with the updated items and invoice properties
            const recalculatedInvoice = recalculateDSInvoicePayments({
                ...oldInvoice,
                ...data,
                updatedAt: new Date().toISOString()
            }, invoicePayments);

            await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
            success("Invoice updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update invoice");
            throw err;
        }
    }, [institutionId, invoices, payments, onRefresh, success, error]);

    const addPayment = useCallback(async (data: any) => {
        try {
            let recNumber = data.receiptNumber;
            if (!recNumber) {
                const prefixStr = (settings?.receiptPrefix || 'REC-').trim();
                const asNum = Number(prefixStr);
                if (!isNaN(asNum) && prefixStr !== '') {
                    let maxVal = asNum;
                    payments.forEach(pay => {
                        if (pay.receiptNumber) {
                            const num = Number(pay.receiptNumber.trim());
                            if (!isNaN(num) && num >= asNum && num > maxVal) {
                                maxVal = num;
                            }
                        }
                    });
                    recNumber = String(maxVal + 1);
                } else {
                    let maxNum = 0;
                    payments.forEach(pay => {
                        if (pay.receiptNumber && pay.receiptNumber.toUpperCase().startsWith(prefixStr.toUpperCase())) {
                            const remainder = pay.receiptNumber.slice(prefixStr.length).trim();
                            const match = remainder.match(/\d+/);
                            if (match) {
                                const num = parseInt(match[0], 10);
                                if (!isNaN(num) && num > maxNum) {
                                    maxNum = num;
                                }
                            }
                        }
                    });
                    recNumber = `${prefixStr}${String(maxNum + 1).padStart(3, '0')}`;
                }
            }

            // Robust invoice lookup across ID, invoiceNumber, studentId, admissionNumber, or student name
            let invoice = rawInvoices.find(inv => inv.id === data.invoiceId || (data.invoiceId && inv.invoiceNumber === data.invoiceId));
            if (!invoice && data.studentId) {
                const matchedStudent = rawStudents.find(s => s.id === data.studentId || s.admissionNumber === data.studentId);
                const studentInvs = rawInvoices.filter(inv => 
                    inv.studentId === data.studentId || 
                    (matchedStudent?.admissionNumber && (inv.studentId === matchedStudent.admissionNumber || (inv as any).admissionNumber === matchedStudent.admissionNumber)) ||
                    (data.admissionNumber && (inv.studentId === data.admissionNumber || (inv as any).admissionNumber === data.admissionNumber)) ||
                    (matchedStudent?.fullName && inv.studentName?.trim().toLowerCase() === matchedStudent.fullName.trim().toLowerCase())
                );
                // Prefer invoice with pending balance or latest invoice
                invoice = studentInvs.find(inv => inv.status !== 'Fully Paid' && Number(inv.balance || 0) > 0) || studentInvs[0];
            }
            if (!invoice && institutionId) {
                const fetchedInvs = await apiService.fetchModuleRecords<DSInvoice>('ds_invoices', institutionId).catch(() => []);
                if (Array.isArray(fetchedInvs)) {
                    invoice = fetchedInvs.find(inv => inv.id === data.invoiceId || (data.invoiceId && inv.invoiceNumber === data.invoiceId)) ||
                              fetchedInvs.find(inv => inv.studentId === data.studentId || (data.admissionNumber && inv.studentId === data.admissionNumber));
                }
            }

            const invoiceBranch = invoice?.branchId || invoice?.branch_id;
            const studentBranch = data.studentId ? rawStudents.find(s => s.id === data.studentId)?.branchId : undefined;
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id || invoiceBranch || studentBranch);

            const pay = { 
                ...data, 
                id: `pay_${Date.now()}`, 
                institutionId,
                branchId: branchIdToUse,
                branch_id: branchIdToUse,
                invoiceId: invoice?.id || data.invoiceId,
                receiptNumber: recNumber,
                status: data.status || 'Completed',
                receivedBy: data.receivedBy || data.issuedBy || data.recordedBy || 'Accounts',
                paymentDate: data.paymentDate || new Date().toISOString()
            };

            let summary = '';
            
            // Ensure student details are fully resolved and never generic 'Student'
            const matchedStudent = rawStudents.find(s => 
                (pay.studentId && (s.id === pay.studentId || (s as any)._id === pay.studentId)) ||
                (pay.studentId && ((s.admissionNumber || '').trim().toLowerCase() === String(pay.studentId).trim().toLowerCase() || ((s as any).admission_number || '').trim().toLowerCase() === String(pay.studentId).trim().toLowerCase())) ||
                (data.admissionNumber && ((s.admissionNumber || '').trim().toLowerCase() === String(data.admissionNumber).trim().toLowerCase() || ((s as any).admission_number || '').trim().toLowerCase() === String(data.admissionNumber).trim().toLowerCase()))
            );

            if (!pay.studentId && (matchedStudent?.id || invoice?.studentId)) {
                pay.studentId = matchedStudent?.id || invoice?.studentId;
            }

            const rawName = (pay.studentName || (pay as any).student_name || '').trim();
            const isGenericOrMissing = !rawName || rawName.toLowerCase() === 'student' || rawName.toLowerCase() === 'learner';
            if (isGenericOrMissing) {
                const resolvedName = (matchedStudent?.fullName && matchedStudent.fullName.trim().toLowerCase() !== 'student')
                    ? matchedStudent.fullName
                    : (invoice?.studentName && invoice.studentName.trim().toLowerCase() !== 'student')
                        ? invoice.studentName
                        : rawName;
                if (resolvedName && resolvedName.toLowerCase() !== 'student') {
                    pay.studentName = resolvedName;
                }
            }

            if (matchedStudent?.admissionNumber && !pay.admissionNumber) {
                pay.admissionNumber = matchedStudent.admissionNumber;
            }

            if (invoice) {
                // Ensure student info is backfilled from invoice if missing
                if (!pay.studentId) {
                    pay.studentId = invoice.studentId;
                }
                if (!pay.studentName || pay.studentName === 'Student') {
                    pay.studentName = invoice.studentName || pay.studentName;
                }

                const allInvoicePayments = [
                    ...payments.filter(p => (p.invoiceId === invoice.id || (!p.invoiceId && p.studentId === invoice.studentId)) && p.id !== pay.id),
                    pay
                ];
                const recalculatedInvoice = recalculateDSInvoicePayments(invoice, allInvoicePayments);

                const distributions: string[] = [];
                (recalculatedInvoice.items || []).forEach((it: any) => {
                    if (Number(it.paidAmount || 0) > 0) {
                        distributions.push(`${it.name}: Kes ${Number(it.paidAmount).toLocaleString()}`);
                    }
                });

                summary = distributions.join(', ') + (recalculatedInvoice.balance > 0 ? ` | Balance: KES ${recalculatedInvoice.balance?.toLocaleString()}` : ' | Fully Paid');

                await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
            }

            await apiService.saveModuleRecord('ds_payments', pay);
            
            if (summary) {
                success(`Payment Recorded: ${summary}`);
            } else {
                success("Payment recorded and distributed successfully");
            }

            // Trigger Notification
            await sendDocumentNotification('receipt', pay, pay.studentId);
            
            await onRefresh();
        } catch (err) {
            error("Failed to record payment");
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, rawInvoices, rawStudents, onRefresh, success, error, settings, payments, sendDocumentNotification]);

    const updatePayment = useCallback(async (data: any) => {
        if (!institutionId || !data.id) return;
        try {
            const oldPayment = payments.find(p => p.id === data.id);
            if (!oldPayment) {
                error("Payment to update not found");
                return;
            }

            const existingMetadata = typeof oldPayment.metadata === 'object' && oldPayment.metadata ? oldPayment.metadata : {};
            const updatedMetadata = {
                ...existingMetadata,
                ...(data.metadata || {}),
                ...(data.editReason ? { editReason: data.editReason, editedAt: new Date().toISOString() } : {})
            };

            const updatedPayment: any = {
                ...data,
                institutionId,
                metadata: updatedMetadata,
                updatedAt: new Date().toISOString()
            };

            // Ensure studentName is resolved if missing or generic 'Student'
            const rawUpdateName = (updatedPayment.studentName || (updatedPayment as any).student_name || '').trim();
            if (!rawUpdateName || rawUpdateName.toLowerCase() === 'student' || rawUpdateName.toLowerCase() === 'learner') {
                const targetId = updatedPayment.studentId || oldPayment.studentId;
                const matchedStudent = rawStudents.find(s => 
                    (targetId && (s.id === targetId || (s as any)._id === targetId)) ||
                    (targetId && ((s.admissionNumber || '').trim().toLowerCase() === String(targetId).trim().toLowerCase() || ((s as any).admission_number || '').trim().toLowerCase() === String(targetId).trim().toLowerCase()))
                );
                const invId = updatedPayment.invoiceId || oldPayment.invoiceId;
                const matchedInv = rawInvoices.find(inv => inv.id === invId || inv.invoiceNumber === invId);
                const realName = (matchedStudent?.fullName && matchedStudent.fullName.trim().toLowerCase() !== 'student')
                    ? matchedStudent.fullName
                    : (matchedInv?.studentName && matchedInv.studentName.trim().toLowerCase() !== 'student')
                        ? matchedInv.studentName
                        : '';
                if (realName) {
                    updatedPayment.studentName = realName;
                }
                if (matchedStudent?.admissionNumber && !updatedPayment.admissionNumber) {
                    updatedPayment.admissionNumber = matchedStudent.admissionNumber;
                }
            }

            if (data.editReason && !updatedPayment.notes) {
                updatedPayment.notes = `Edit: ${data.editReason}`;
            }
            delete updatedPayment.editReason;
            delete updatedPayment.edit_reason;

            await apiService.saveModuleRecord('ds_payments', updatedPayment);

            const affectedInvoiceIds = new Set<string>();
            if (oldPayment.invoiceId) affectedInvoiceIds.add(oldPayment.invoiceId);
            if (data.invoiceId) affectedInvoiceIds.add(data.invoiceId);

            for (const invId of affectedInvoiceIds) {
                const invoice = invoices.find(inv => inv.id === invId);
                if (invoice) {
                    const invoicePayments = payments.map(p => p.id === data.id ? updatedPayment : p)
                                                   .filter(p => p.invoiceId === invId);
                    const recalculatedInvoice = recalculateInvoicePayments(invoice, invoicePayments);
                    await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
                }
            }

            success("Payment updated successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to update payment");
            throw err;
        }
    }, [institutionId, payments, invoices, onRefresh, success, error, recalculateInvoicePayments]);

    const deletePayment = useCallback(async (id: string) => {
        if (!institutionId) return;
        const paymentToDelete = payments.find(p => p.id === id);
        if (!paymentToDelete) {
            error("Payment not found");
            return;
        }

        try {
            await apiService.deleteModuleRecord('ds_payments', id);

            if (paymentToDelete.invoiceId) {
                const invoice = invoices.find(inv => inv.id === paymentToDelete.invoiceId);
                if (invoice) {
                    const invoicePayments = payments.filter(p => p.invoiceId === invoice.id && p.id !== id);
                    const recalculatedInvoice = recalculateInvoicePayments(invoice, invoicePayments);
                    await apiService.saveModuleRecord('ds_invoices', recalculatedInvoice);
                }
            }

            success("Payment deleted successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to delete payment");
            throw err;
        }
    }, [institutionId, invoices, payments, onRefresh, success, error]);

    const deleteInvoice = useCallback(async (id: string) => {
        if (!institutionId) return;
        const linkedPayments = payments.filter(p => p.invoiceId === id);
        const warnMsg = linkedPayments.length > 0
            ? `Warning: This invoice has ${linkedPayments.length} linked payments. Deleting this invoice will unlink/affect them. Are you sure you want to delete this invoice?`
            : "Are you sure you want to delete this invoice? This action cannot be undone.";

        if (!window.confirm(warnMsg)) return;

        try {
            await apiService.deleteModuleRecord('ds_invoices', id);
            success("Invoice deleted successfully");
            await onRefresh();
        } catch (err) {
            error("Failed to delete invoice");
            throw err;
        }
    }, [institutionId, payments, onRefresh, success, error]);

    const addExpenditure = useCallback(async (data: Partial<DSExpenditure>) => {
        if (!institutionId) return;
        try {
            const branchIdToUse = resolveBranchIdToUse(data.branchId || data.branch_id);
            const record: DSExpenditure = {
                id: `dsexp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                institutionId,
                branchId: branchIdToUse,
                branch_id: branchIdToUse,
                description: data.description || '',
                category: data.category || 'Other',
                amount: data.amount || 0,
                paymentMethod: data.paymentMethod || 'Cash',
                referenceNumber: data.referenceNumber,
                vehicleId: data.vehicleId,
                paidTo: data.paidTo,
                recordedBy: data.recordedBy,
                notes: data.notes,
                expenseDate: data.expenseDate || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
            };
            await apiService.saveModuleRecord('ds_expenditures', record);
            setExpenditures(prev => [record, ...prev]);
            success('Expenditure recorded successfully');
        } catch (err) {
            error('Failed to save expenditure');
            throw err;
        }
    }, [institutionId, resolveBranchIdToUse, success, error]);

    const updateExpenditure = useCallback(async (data: Partial<DSExpenditure>) => {
        if (!institutionId || !data.id) return;
        try {
            await apiService.saveModuleRecord('ds_expenditures', data);
            setExpenditures(prev => prev.map(e => e.id === data.id ? { ...e, ...data } : e));
            success('Expenditure updated successfully');
        } catch (err) {
            error('Failed to update expenditure');
            throw err;
        }
    }, [institutionId, success, error]);

    const deleteExpenditure = useCallback(async (id: string) => {
        if (!institutionId) return;
        if (!window.confirm('Delete this expenditure record? This cannot be undone.')) return;
        try {
            await apiService.deleteModuleRecord('ds_expenditures', id);
            setExpenditures(prev => prev.filter(e => e.id !== id));
            success('Expenditure deleted');
        } catch (err) {
            error('Failed to delete expenditure');
            throw err;
        }
    }, [institutionId, success, error]);

    const stats = useMemo(() => ({
        totalStudents: students.length,
        activeInstructors: instructors.filter(i => i.status === 'Active').length,
        operationalVehicles: vehicles.filter(v => v.status === 'Operational').length,
        pendingLessons: lessons.filter(l => l.status === 'Scheduled').length,
    }), [students, instructors, vehicles, lessons]);

    const value = {
        instructors, vehicles, students, lessons, mastery, settings, invoices, payments,
        mpesaTransactions, bankTransactions, leads, expenditures,
        branches, activeBranchId, setActiveBranchId, isUserBranchLocked, userAssignedBranchId,
        addBranch, updateBranch, deleteBranch,
        rawStudents, rawInstructors, rawVehicles, rawLessons, rawInvoices, rawPayments, rawLeads, rawExpenditures,
        setInstructors, setVehicles, setStudents, setLessons, setMastery, setSettings, setInvoices, setPayments, setLeads, setExpenditures,
        addInstructor, addVehicle, updateVehicle, deleteVehicle, addStudent, verifyStudentPayment, updateStudent, deleteStudent, deleteStudents, addLesson, updateLesson, deleteLesson, addMastery, updateSettings, addInvoice, updateInvoice, deleteInvoice, addPayment, updatePayment, deletePayment, addLead, updateLead, deleteLead, deleteLeads,
        addExpenditure, updateExpenditure, deleteExpenditure,
        sendLessonNotification,
        refreshData, stats
    };

    return (
        <DrivingSchoolContext.Provider value={value}>
            {children}
        </DrivingSchoolContext.Provider>
    );
};
