import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, AllowanceCategory, DeductionCategory, User } from '../../types';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XIcon } from '../icons/XIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { apiService } from '../../services/apiService';

interface AllowanceDeductionManagerProps {
    institution: Institution;
    staff?: User[];
    onClose?: () => void;
    onCategoriesUpdated?: (allowances: AllowanceCategory[], deductions: DeductionCategory[]) => void;
}

export const DEFAULT_ALLOWANCE_CATEGORIES: Omit<AllowanceCategory, 'id' | 'institutionId' | 'createdAt'>[] = [
    {
        name: 'House Allowance',
        code: 'HOUSE_ALLOWANCE',
        type: 'taxable',
        calculationType: 'percentage',
        defaultPercentage: 15,
        defaultAmount: 0,
        description: 'Standard institutional housing stipend (15% of basic salary)',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Commuter / Transport Allowance',
        code: 'COMMUTER_ALLOWANCE',
        type: 'taxable',
        calculationType: 'fixed',
        defaultAmount: 5000,
        defaultPercentage: 0,
        description: 'Daily / monthly commuting and transport facilitation',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Responsibility / HOD Allowance',
        code: 'RESPONSIBILITY_ALLOWANCE',
        type: 'taxable',
        calculationType: 'fixed',
        defaultAmount: 8000,
        defaultPercentage: 0,
        description: 'Special duty allowance for Heads of Department, Deans, Supervisors',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Medical / Health Allowance',
        code: 'MEDICAL_ALLOWANCE',
        type: 'taxable',
        calculationType: 'fixed',
        defaultAmount: 4000,
        defaultPercentage: 0,
        description: 'Outpatient medical and healthcare support subsidy',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Hardship / Remote Allowance',
        code: 'HARDSHIP_ALLOWANCE',
        type: 'taxable',
        calculationType: 'fixed',
        defaultAmount: 6000,
        defaultPercentage: 0,
        description: 'Designated hardship location or special operational zone allowance',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Airtime / Communication Allowance',
        code: 'AIRTIME_ALLOWANCE',
        type: 'non_taxable',
        calculationType: 'fixed',
        defaultAmount: 2000,
        defaultPercentage: 0,
        description: 'Official mobile, airtime, and data communication subsidy',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Special Duty / Overtime Allowance',
        code: 'OVERTIME_ALLOWANCE',
        type: 'taxable',
        calculationType: 'fixed',
        defaultAmount: 3500,
        defaultPercentage: 0,
        description: 'Weekend duty, exam invigilation, or special project compensation',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Meal / Subsistence Allowance',
        code: 'MEAL_ALLOWANCE',
        type: 'non_taxable',
        calculationType: 'fixed',
        defaultAmount: 3000,
        defaultPercentage: 0,
        description: 'Official meal and daily catering facilitation',
        isStatutory: false,
        isActive: true
    }
];

export const DEFAULT_DEDUCTION_CATEGORIES: Omit<DeductionCategory, 'id' | 'institutionId' | 'createdAt'>[] = [
    {
        name: 'SACCO Monthly Deposit / Savings',
        code: 'SACCO_SAVINGS',
        type: 'post_tax',
        calculationType: 'fixed',
        defaultAmount: 3000,
        defaultPercentage: 0,
        description: 'Employee voluntary monthly SACCO share capital and savings',
        beneficiaryName: 'Institutional Staff SACCO Ltd',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'SACCO Development Loan Repayment',
        code: 'SACCO_LOAN',
        type: 'post_tax',
        calculationType: 'fixed',
        defaultAmount: 5000,
        defaultPercentage: 0,
        description: 'Monthly amortized SACCO emergency or development loan deduction',
        beneficiaryName: 'Institutional Staff SACCO Ltd',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'HELB / University Loan Recovery',
        code: 'HELB_LOAN',
        type: 'post_tax',
        calculationType: 'fixed',
        defaultAmount: 1500,
        defaultPercentage: 0,
        description: 'Higher Education Loans Board statutory check-off recovery',
        beneficiaryName: 'Higher Education Loans Board (HELB)',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Salary Advance Recovery',
        code: 'SALARY_ADVANCE',
        type: 'post_tax',
        calculationType: 'fixed',
        defaultAmount: 0,
        defaultPercentage: 0,
        description: 'Interim mid-month institutional advance recovery',
        beneficiaryName: 'Institution Finance / Bursar',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Staff Benevolent / Welfare Fund',
        code: 'STAFF_WELFARE',
        type: 'post_tax',
        calculationType: 'fixed',
        defaultAmount: 500,
        defaultPercentage: 0,
        description: 'Staff mutual benevolent welfare kitty and bereavement fund',
        beneficiaryName: 'Staff Welfare Committee',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Voluntary Pension Contribution (AVC)',
        code: 'VOLUNTARY_PENSION',
        type: 'pre_tax',
        calculationType: 'fixed',
        defaultAmount: 2500,
        defaultPercentage: 0,
        description: 'Additional voluntary pre-tax pension retirement contribution',
        beneficiaryName: 'Retirement Benefits Scheme',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Insurance / Group Life Cover',
        code: 'GROUP_LIFE_INSURANCE',
        type: 'post_tax',
        calculationType: 'fixed',
        defaultAmount: 1200,
        defaultPercentage: 0,
        description: 'Supplemental life insurance policy and family medical cover',
        beneficiaryName: 'Underwriter Insurance Scheme',
        isStatutory: false,
        isActive: true
    },
    {
        name: 'Union / KUPPET / KNUT Dues',
        code: 'UNION_DUES',
        type: 'post_tax',
        calculationType: 'percentage',
        defaultPercentage: 2,
        defaultAmount: 0,
        description: 'Trade union affiliation membership dues',
        beneficiaryName: 'National Teachers / Workers Union',
        isStatutory: false,
        isActive: true
    }
];

export const AllowanceDeductionManager: React.FC<AllowanceDeductionManagerProps> = ({
    institution,
    staff = [],
    onClose,
    onCategoriesUpdated
}) => {
    const instId = institution.id || 'default_inst';
    const [currentSubTab, setCurrentSubTab] = useState<'allowances' | 'deductions' | 'staff_summary'>('allowances');
    const [searchQuery, setSearchQuery] = useState('');

    // Categories State
    const [allowanceCategories, setAllowanceCategories] = useState<AllowanceCategory[]>([]);
    const [deductionCategories, setDeductionCategories] = useState<DeductionCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal Form States
    const [showAllowanceModal, setShowAllowanceModal] = useState(false);
    const [editingAllowance, setEditingAllowance] = useState<AllowanceCategory | null>(null);
    const [allowanceForm, setAllowanceForm] = useState({
        name: '',
        code: '',
        type: 'taxable' as 'taxable' | 'non_taxable',
        calculationType: 'fixed' as 'fixed' | 'percentage',
        defaultAmount: 0,
        defaultPercentage: 0,
        description: '',
        isActive: true
    });

    const [showDeductionModal, setShowDeductionModal] = useState(false);
    const [editingDeduction, setEditingDeduction] = useState<DeductionCategory | null>(null);
    const [deductionForm, setDeductionForm] = useState({
        name: '',
        code: '',
        type: 'post_tax' as 'pre_tax' | 'post_tax' | 'statutory',
        calculationType: 'fixed' as 'fixed' | 'percentage',
        defaultAmount: 0,
        defaultPercentage: 0,
        description: '',
        beneficiaryName: '',
        accountNumber: '',
        isActive: true
    });

    // ─── 1. Load Initial Categories ───
    useEffect(() => {
        const loadCategories = async () => {
            setIsLoading(true);
            try {
                // Try LocalStorage first for instant rendering
                const localAllowancesKey = `eduai_hr_allowances_${instId}`;
                const localDeductionsKey = `eduai_hr_deductions_${instId}`;
                
                let savedAllowances: AllowanceCategory[] = [];
                let savedDeductions: DeductionCategory[] = [];

                try {
                    const rawA = localStorage.getItem(localAllowancesKey);
                    if (rawA) savedAllowances = JSON.parse(rawA);
                    const rawD = localStorage.getItem(localDeductionsKey);
                    if (rawD) savedDeductions = JSON.parse(rawD);
                } catch (e) {}

                // If empty locally, try remote backend
                if (savedAllowances.length === 0) {
                    const remoteA = await apiService.fetchModuleRecords<AllowanceCategory>('hr_allowance_categories', instId).catch(() => []);
                    if (remoteA && remoteA.length > 0) {
                        savedAllowances = remoteA;
                    }
                }
                if (savedDeductions.length === 0) {
                    const remoteD = await apiService.fetchModuleRecords<DeductionCategory>('hr_deduction_categories', instId).catch(() => []);
                    if (remoteD && remoteD.length > 0) {
                        savedDeductions = remoteD;
                    }
                }

                // If still empty, seed defaults
                if (savedAllowances.length === 0) {
                    savedAllowances = DEFAULT_ALLOWANCE_CATEGORIES.map((def, idx) => ({
                        ...def,
                        id: `allow_cat_${Date.now()}_${idx}`,
                        institutionId: instId,
                        createdAt: new Date().toISOString()
                    }));
                    localStorage.setItem(localAllowancesKey, JSON.stringify(savedAllowances));
                }

                if (savedDeductions.length === 0) {
                    savedDeductions = DEFAULT_DEDUCTION_CATEGORIES.map((def, idx) => ({
                        ...def,
                        id: `ded_cat_${Date.now()}_${idx}`,
                        institutionId: instId,
                        createdAt: new Date().toISOString()
                    }));
                    localStorage.setItem(localDeductionsKey, JSON.stringify(savedDeductions));
                }

                setAllowanceCategories(savedAllowances);
                setDeductionCategories(savedDeductions);
                if (onCategoriesUpdated) {
                    onCategoriesUpdated(savedAllowances, savedDeductions);
                }
            } catch (err) {
                console.error('[AllowanceDeductionManager] Error initializing categories:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadCategories();
    }, [instId]);

    // ─── 2. Persist Helpers ───
    const persistAllowances = async (updated: AllowanceCategory[]) => {
        setAllowanceCategories(updated);
        localStorage.setItem(`eduai_hr_allowances_${instId}`, JSON.stringify(updated));
        if (onCategoriesUpdated) onCategoriesUpdated(updated, deductionCategories);
        try {
            await apiService.saveModuleRecord('hr_allowance_categories', {
                id: `allowances_bundle_${instId}`,
                institutionId: instId,
                categories: updated,
                updatedAt: new Date().toISOString()
            }).catch(() => null);
        } catch (e) {}
    };

    const persistDeductions = async (updated: DeductionCategory[]) => {
        setDeductionCategories(updated);
        localStorage.setItem(`eduai_hr_deductions_${instId}`, JSON.stringify(updated));
        if (onCategoriesUpdated) onCategoriesUpdated(allowanceCategories, updated);
        try {
            await apiService.saveModuleRecord('hr_deduction_categories', {
                id: `deductions_bundle_${instId}`,
                institutionId: instId,
                categories: updated,
                updatedAt: new Date().toISOString()
            }).catch(() => null);
        } catch (e) {}
    };

    // ─── 3. Allowance Category Actions ───
    const handleOpenAddAllowance = () => {
        setEditingAllowance(null);
        setAllowanceForm({
            name: '',
            code: '',
            type: 'taxable',
            calculationType: 'fixed',
            defaultAmount: 0,
            defaultPercentage: 0,
            description: '',
            isActive: true
        });
        setShowAllowanceModal(true);
    };

    const handleOpenEditAllowance = (cat: AllowanceCategory) => {
        setEditingAllowance(cat);
        setAllowanceForm({
            name: cat.name || '',
            code: cat.code || '',
            type: cat.type || 'taxable',
            calculationType: cat.calculationType || 'fixed',
            defaultAmount: cat.defaultAmount || 0,
            defaultPercentage: cat.defaultPercentage || 0,
            description: cat.description || '',
            isActive: cat.isActive !== false
        });
        setShowAllowanceModal(true);
    };

    const handleSaveAllowance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allowanceForm.name.trim()) {
            alert('Please enter an allowance category name.');
            return;
        }

        const autoCode = allowanceForm.code.trim() 
            ? allowanceForm.code.trim().toUpperCase().replace(/\s+/g, '_')
            : allowanceForm.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

        if (editingAllowance) {
            const updated = allowanceCategories.map(a => 
                a.id === editingAllowance.id
                    ? {
                        ...a,
                        ...allowanceForm,
                        code: autoCode,
                        updatedAt: new Date().toISOString()
                    }
                    : a
            );
            await persistAllowances(updated);
        } else {
            const newCat: AllowanceCategory = {
                id: `allow_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId: instId,
                ...allowanceForm,
                code: autoCode,
                createdAt: new Date().toISOString()
            };
            await persistAllowances([...allowanceCategories, newCat]);
        }
        setShowAllowanceModal(false);
    };

    const handleDeleteAllowance = async (cat: AllowanceCategory) => {
        if (!window.confirm(`Are you sure you want to delete the allowance category "${cat.name}"?`)) return;
        const updated = allowanceCategories.filter(a => a.id !== cat.id);
        await persistAllowances(updated);
    };

    const handleToggleAllowance = async (cat: AllowanceCategory) => {
        const updated = allowanceCategories.map(a => a.id === cat.id ? { ...a, isActive: !a.isActive } : a);
        await persistAllowances(updated);
    };

    // ─── 4. Deduction Category Actions ───
    const handleOpenAddDeduction = () => {
        setEditingDeduction(null);
        setDeductionForm({
            name: '',
            code: '',
            type: 'post_tax',
            calculationType: 'fixed',
            defaultAmount: 0,
            defaultPercentage: 0,
            description: '',
            beneficiaryName: '',
            accountNumber: '',
            isActive: true
        });
        setShowDeductionModal(true);
    };

    const handleOpenEditDeduction = (cat: DeductionCategory) => {
        setEditingDeduction(cat);
        setDeductionForm({
            name: cat.name || '',
            code: cat.code || '',
            type: cat.type || 'post_tax',
            calculationType: cat.calculationType || 'fixed',
            defaultAmount: cat.defaultAmount || 0,
            defaultPercentage: cat.defaultPercentage || 0,
            description: cat.description || '',
            beneficiaryName: cat.beneficiaryName || '',
            accountNumber: cat.accountNumber || '',
            isActive: cat.isActive !== false
        });
        setShowDeductionModal(true);
    };

    const handleSaveDeduction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deductionForm.name.trim()) {
            alert('Please enter a deduction category name.');
            return;
        }

        const autoCode = deductionForm.code.trim()
            ? deductionForm.code.trim().toUpperCase().replace(/\s+/g, '_')
            : deductionForm.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

        if (editingDeduction) {
            const updated = deductionCategories.map(d => 
                d.id === editingDeduction.id
                    ? {
                        ...d,
                        ...deductionForm,
                        code: autoCode,
                        updatedAt: new Date().toISOString()
                    }
                    : d
            );
            await persistDeductions(updated);
        } else {
            const newCat: DeductionCategory = {
                id: `ded_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId: instId,
                ...deductionForm,
                code: autoCode,
                createdAt: new Date().toISOString()
            };
            await persistDeductions([...deductionCategories, newCat]);
        }
        setShowDeductionModal(false);
    };

    const handleDeleteDeduction = async (cat: DeductionCategory) => {
        if (!window.confirm(`Are you sure you want to delete the deduction category "${cat.name}"?`)) return;
        const updated = deductionCategories.filter(d => d.id !== cat.id);
        await persistDeductions(updated);
    };

    const handleToggleDeduction = async (cat: DeductionCategory) => {
        const updated = deductionCategories.map(d => d.id === cat.id ? { ...d, isActive: !d.isActive } : d);
        await persistDeductions(updated);
    };

    // Filtered lists
    const filteredAllowances = useMemo(() => {
        return allowanceCategories.filter(a => {
            const q = searchQuery.toLowerCase().trim();
            return !q || a.name.toLowerCase().includes(q) || (a.code && a.code.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q));
        });
    }, [allowanceCategories, searchQuery]);

    const filteredDeductions = useMemo(() => {
        return deductionCategories.filter(d => {
            const q = searchQuery.toLowerCase().trim();
            return !q || d.name.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q)) || (d.beneficiaryName && d.beneficiaryName.toLowerCase().includes(q));
        });
    }, [deductionCategories, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Top Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-indigo-900/50">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/20 backdrop-blur-sm">
                            <BanknotesIcon className="w-7 h-7 text-indigo-300" />
                        </div>
                        <div>
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-400/20">
                                Institutional Compensation Architecture
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase mt-1">
                                Allowance & Deduction Category Registry
                            </h2>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl font-medium">
                        Configure institutional pay elements, non-statutory benefits, voluntary SACCO deductions, and customized payroll check-offs.
                    </p>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all self-end md:self-auto cursor-pointer"
                        title="Close Manager"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation Tabs & Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl">
                    <button
                        onClick={() => setCurrentSubTab('allowances')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            currentSubTab === 'allowances'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Allowances ({allowanceCategories.length})
                    </button>
                    <button
                        onClick={() => setCurrentSubTab('deductions')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            currentSubTab === 'deductions'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Deductions ({deductionCategories.length})
                    </button>
                    <button
                        onClick={() => setCurrentSubTab('staff_summary')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            currentSubTab === 'staff_summary'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Staff Allocation Matrix
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search bar */}
                    {currentSubTab !== 'staff_summary' && (
                        <div className="relative flex-1 sm:w-60">
                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {/* Add Category Button */}
                    {currentSubTab === 'allowances' && (
                        <button
                            onClick={handleOpenAddAllowance}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Allowance</span>
                        </button>
                    )}

                    {currentSubTab === 'deductions' && (
                        <button
                            onClick={handleOpenAddDeduction}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Deduction</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ─── TAB 1: ALLOWANCE CATEGORIES ─── */}
            {currentSubTab === 'allowances' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Allowance Categories Registry
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Pre-tax & post-tax staff benefit components
                            </p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black">
                            {filteredAllowances.length} Registered Categories
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAllowances.map((cat) => (
                            <div
                                key={cat.id}
                                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                                    cat.isActive
                                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400'
                                        : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200/40 opacity-60'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {cat.name}
                                            </h4>
                                            <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                                                {cat.code || 'CUSTOM_ALLOWANCE'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                                                cat.type === 'taxable'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                            }`}>
                                                {cat.type === 'taxable' ? 'Taxable' : 'Non-Taxable'}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                                                cat.isActive
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    : 'bg-slate-200 text-slate-500'
                                            }`}>
                                                {cat.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {cat.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {cat.description}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Default Computation</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                            {cat.calculationType === 'percentage'
                                                ? `${cat.defaultPercentage || 0}% of Basic Salary`
                                                : `KES ${(cat.defaultAmount || 0).toLocaleString()}`}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleToggleAllowance(cat)}
                                            className={`p-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                                cat.isActive
                                                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                            }`}
                                            title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                                        >
                                            {cat.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => handleOpenEditAllowance(cat)}
                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all cursor-pointer"
                                            title="Edit Category"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAllowance(cat)}
                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                            title="Delete Category"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── TAB 2: DEDUCTION CATEGORIES ─── */}
            {currentSubTab === 'deductions' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Deduction Categories Registry
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                SACCO contributions, loan repayments, and voluntary deductions
                            </p>
                        </div>
                        <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full text-xs font-black">
                            {filteredDeductions.length} Registered Categories
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDeductions.map((cat) => (
                            <div
                                key={cat.id}
                                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                                    cat.isActive
                                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/80 hover:border-rose-400'
                                        : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200/40 opacity-60'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {cat.name}
                                            </h4>
                                            <span className="text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                                                {cat.code || 'CUSTOM_DEDUCTION'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                                                cat.type === 'pre_tax'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                                            }`}>
                                                {cat.type === 'pre_tax' ? 'Pre-Tax' : 'Post-Tax'}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                                                cat.isActive
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    : 'bg-slate-200 text-slate-500'
                                            }`}>
                                                {cat.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {cat.beneficiaryName && (
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                            Beneficiary: <span className="text-slate-800 dark:text-slate-200">{cat.beneficiaryName}</span>
                                        </p>
                                    )}

                                    {cat.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {cat.description}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Default Rate</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                            {cat.calculationType === 'percentage'
                                                ? `${cat.defaultPercentage || 0}% of Basic Salary`
                                                : `KES ${(cat.defaultAmount || 0).toLocaleString()}`}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleToggleDeduction(cat)}
                                            className={`p-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                                cat.isActive
                                                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                            }`}
                                            title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                                        >
                                            {cat.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => handleOpenEditDeduction(cat)}
                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                            title="Edit Category"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDeduction(cat)}
                                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                            title="Delete Category"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── TAB 3: STAFF ALLOCATION MATRIX ─── */}
            {currentSubTab === 'staff_summary' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Staff Allowances & Deductions Allocation
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Matrix of custom benefits and check-offs assigned across active personnel
                            </p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black">
                            {staff.length} Active Personnel
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="px-6 py-4">Personnel</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Basic Pay</th>
                                    <th className="px-6 py-4">Assigned Custom Allowances</th>
                                    <th className="px-6 py-4">Assigned Custom Deductions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800 text-xs">
                                {staff.map((s) => {
                                    let m = s.metadata || {};
                                    if (typeof m === 'string') {
                                        try { m = JSON.parse(m); } catch (e) { m = {}; }
                                    }
                                    const basic = Number(m.basicSalary || m.basic_salary || (s as any).basicSalary || 0);
                                    const allowances: Array<{ name: string; amount: number }> = Array.isArray(m.assignedAllowances) ? m.assignedAllowances : [];
                                    const deductions: Array<{ name: string; amount: number }> = Array.isArray(m.assignedDeductions) ? m.assignedDeductions : [];

                                    const totalCustomAllow = allowances.reduce((acc, a) => acc + (a.amount || 0), 0);
                                    const totalCustomDed = deductions.reduce((acc, d) => acc + (d.amount || 0), 0);

                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase">
                                                {s.name}
                                                <span className="block text-[9px] font-mono text-slate-400 font-normal">
                                                    {s.email}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 uppercase font-bold text-slate-600 dark:text-slate-300">
                                                {s.role}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                                                KES {basic.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {allowances.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {allowances.map((a, idx) => (
                                                            <div key={idx} className="flex justify-between gap-2 text-[10px]">
                                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{a.name}:</span>
                                                                <span className="font-mono font-bold">KES {(a.amount || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                                                            Total: KES {totalCustomAllow.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">Standard 15% House Allowance only</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {deductions.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {deductions.map((d, idx) => (
                                                            <div key={idx} className="flex justify-between gap-2 text-[10px]">
                                                                <span className="font-bold text-rose-600 dark:text-rose-400">{d.name}:</span>
                                                                <span className="font-mono font-bold">KES {(d.amount || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px] font-black text-rose-700 dark:text-rose-300">
                                                            Total: KES {totalCustomDed.toLocaleString()}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">Statutory deductions only (PAYE, SHIF, NSSF, AHL)</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── MODAL: ADD/EDIT ALLOWANCE CATEGORY ─── */}
            {showAllowanceModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {editingAllowance ? 'Edit Allowance Category' : 'Register Allowance Category'}
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    Define institutional allowance specifications
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAllowanceModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAllowance} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Category Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Commuter Allowance, Responsibility Allowance"
                                    value={allowanceForm.name}
                                    onChange={(e) => setAllowanceForm({ ...allowanceForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Taxability Status
                                    </label>
                                    <select
                                        value={allowanceForm.type}
                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, type: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="taxable">Taxable (Subject to PAYE)</option>
                                        <option value="non_taxable">Non-Taxable (Exempt)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Computation Mode
                                    </label>
                                    <select
                                        value={allowanceForm.calculationType}
                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, calculationType: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="fixed">Fixed Monthly Amount (KES)</option>
                                        <option value="percentage">% of Basic Salary</option>
                                    </select>
                                </div>
                            </div>

                            {allowanceForm.calculationType === 'fixed' ? (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Default Monthly Amount (KES)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={allowanceForm.defaultAmount}
                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, defaultAmount: Number(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Default Percentage (%) of Basic Pay
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={allowanceForm.defaultPercentage}
                                        onChange={(e) => setAllowanceForm({ ...allowanceForm, defaultPercentage: Number(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Description & Policy Notes
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Granted to senior faculty and administration heads"
                                    value={allowanceForm.description}
                                    onChange={(e) => setAllowanceForm({ ...allowanceForm, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="allowanceIsActive"
                                    checked={allowanceForm.isActive}
                                    onChange={(e) => setAllowanceForm({ ...allowanceForm, isActive: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="allowanceIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Enable category for payroll allocation
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowAllowanceModal(false)}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20"
                                >
                                    {editingAllowance ? 'Update Allowance' : 'Register Allowance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: ADD/EDIT DEDUCTION CATEGORY ─── */}
            {showDeductionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {editingDeduction ? 'Edit Deduction Category' : 'Register Deduction Category'}
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    Define non-statutory payroll deductions & remittances
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDeductionModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDeduction} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Category Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. SACCO Loan Repayment, Welfare Fund, HELB"
                                    value={deductionForm.name}
                                    onChange={(e) => setDeductionForm({ ...deductionForm, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Deduction Tax Timing
                                    </label>
                                    <select
                                        value={deductionForm.type}
                                        onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                    >
                                        <option value="post_tax">Post-Tax (Net Salary Check-off)</option>
                                        <option value="pre_tax">Pre-Tax (Reduces Taxable Pay)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Computation Mode
                                    </label>
                                    <select
                                        value={deductionForm.calculationType}
                                        onChange={(e) => setDeductionForm({ ...deductionForm, calculationType: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                    >
                                        <option value="fixed">Fixed Monthly Amount (KES)</option>
                                        <option value="percentage">% of Basic Salary</option>
                                    </select>
                                </div>
                            </div>

                            {deductionForm.calculationType === 'fixed' ? (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Default Monthly Amount (KES)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={deductionForm.defaultAmount}
                                        onChange={(e) => setDeductionForm({ ...deductionForm, defaultAmount: Number(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                        Default Percentage (%) of Basic Pay
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={deductionForm.defaultPercentage}
                                        onChange={(e) => setDeductionForm({ ...deductionForm, defaultPercentage: Number(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Beneficiary Institution / Organization Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mwalimu National SACCO, HELB, Staff Welfare"
                                    value={deductionForm.beneficiaryName}
                                    onChange={(e) => setDeductionForm({ ...deductionForm, beneficiaryName: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                                    Description & Remittance Notes
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Remitted monthly via electronic EFT by the 5th of each month"
                                    value={deductionForm.description}
                                    onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="deductionIsActive"
                                    checked={deductionForm.isActive}
                                    onChange={(e) => setDeductionForm({ ...deductionForm, isActive: e.target.checked })}
                                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                />
                                <label htmlFor="deductionIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Enable category for payroll deduction check-off
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowDeductionModal(false)}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-rose-600/20"
                                >
                                    {editingDeduction ? 'Update Deduction' : 'Register Deduction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
