import React, { useState, useMemo, useEffect } from 'react';
import type { Institution, User, Course, CompanyDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PayNowModal } from '../PayNowModal';
import { billingService } from '../../services/billingService';

export interface StudentSubscriptionPlan {
    id: string;
    name: string;
    description: string;
    billingCycle: 'per_term' | 'per_year' | 'monthly';
    amount: number; // Rate per student
    smsAllocatedPerStudent: number;
    smsUsageType: 'academic_results_only' | 'finance_receipts_only' | 'all';
    features: string[];
    applicableClasses: string[];
    isActive: boolean;
    institutionId?: string;
}

export interface StudentSubscriptionRecord {
    id: string;
    studentId: string;
    studentName: string;
    className: string;
    planId: string;
    planName: string;
    billingCycle: 'per_term' | 'per_year' | 'monthly';
    amount: number;
    status: 'active' | 'due' | 'expired';
    startDate: string;
    expiryDate: string;
    institutionId?: string;
}

interface StudentSubscriptionPlanManagerProps {
    currentInstitution?: Institution | null;
    currentUser?: User | null;
    users?: User[];
    courses?: Course[];
    companyDetails?: CompanyDetails;
    moduleContext?: 'academics' | 'finance' | 'superadmin';
    isSuperAdmin?: boolean;
}

const GLOBAL_DEFAULT_PLANS: StudentSubscriptionPlan[] = [
    {
        id: 'plan_basic_academic_term',
        name: 'CBC Academic & Report Cards Plan (Per Term)',
        description: 'Covers termly CBC/8-4-4 academic records, report cards, exam marks, and student attendance tracking.',
        billingCycle: 'per_term',
        amount: 150,
        smsAllocatedPerStudent: 10,
        smsUsageType: 'academic_results_only',
        features: ['CBC & 8-4-4 Report Cards & Transcripts', 'Daily Student Attendance Tracking', 'Basic Subject Mark Entry', '10 Academic Results SMS / Student'],
        applicableClasses: ['All Classes'],
        isActive: true,
        institutionId: 'SYSTEM'
    },
    {
        id: 'plan_pro_academic_term',
        name: 'Pro Exam, Timetable & Broadsheet Suite (Per Term)',
        description: 'Includes automated conflict-free timetable wizard, exam broadsheets, SpeechBuddy AI revision, and parent exam alerts.',
        billingCycle: 'per_term',
        amount: 250,
        smsAllocatedPerStudent: 20,
        smsUsageType: 'academic_results_only',
        features: ['All Academic Features', 'Automated Conflict-Free Timetable', 'Exam Units & Broadsheets', 'SpeechBuddy AI Access', '20 Academic Results SMS / Student'],
        applicableClasses: ['All Classes'],
        isActive: true,
        institutionId: 'SYSTEM'
    },
    {
        id: 'plan_basic_finance_term',
        name: 'Finance Ledger & Fee Receipts Plan (Per Term)',
        description: 'Includes automated student fee invoicing, real-time M-Pesa/Bank reconciliation, EPOS receipts, and parent fee balance alerts.',
        billingCycle: 'per_term',
        amount: 200,
        smsAllocatedPerStudent: 15,
        smsUsageType: 'finance_receipts_only',
        features: ['Automated Student Fee Invoicing', 'M-Pesa & Bank Fee Reconciliation', 'EPOS & A4 Thermal Receipts', 'Promise to Pay (PTP) Tracker', '15 Finance Receipts SMS / Student'],
        applicableClasses: ['All Classes'],
        isActive: true,
        institutionId: 'SYSTEM'
    },
    {
        id: 'plan_pro_finance_year',
        name: 'Corporate Fee Collection & Audit Suite (Per Year)',
        description: 'Full-year complete financial ledger, digital exam permits, bursary disbursement manager, and automated parent fee balance SMS broadcasts.',
        billingCycle: 'per_year',
        amount: 500,
        smsAllocatedPerStudent: 50,
        smsUsageType: 'finance_receipts_only',
        features: ['Full Year Financial Governance', 'Digital Exam Permits & QR Verification', 'Bulk NG-CDF Bursary Disbursal', 'Votehead Spreadsheets & Inter-Bank Transfers', '50 Finance Receipts & Balance SMS / Student'],
        applicableClasses: ['All Classes'],
        isActive: true,
        institutionId: 'SYSTEM'
    },
    {
        id: 'plan_enterprise_year',
        name: 'Annual All-Access Student Pass (Per Year)',
        description: 'Full-year unlimited access across Academics, Exams, SpeechBuddy AI, automated fee invoicing, and all parent SMS alerts.',
        billingCycle: 'per_year',
        amount: 1000,
        smsAllocatedPerStudent: 60,
        smsUsageType: 'all',
        features: ['Full Year Unlimited Platform Access', 'All Academic & Broadsheet Tools', 'Complete Financial Ledger & Receipts', 'SpeechBuddy AI Revision Marketplace', '60 Results & Finance SMS / Student'],
        applicableClasses: ['All Classes'],
        isActive: true,
        institutionId: 'SYSTEM'
    }
];

export const StudentSubscriptionPlanManager: React.FC<StudentSubscriptionPlanManagerProps> = ({
    currentInstitution,
    currentUser,
    users = [],
    companyDetails,
    moduleContext = 'academics',
    isSuperAdmin = false
}) => {
    const isSuperAdminMode = isSuperAdmin || currentUser?.role === 'super_admin';
    const instId = isSuperAdminMode ? 'SYSTEM' : (currentInstitution?.id || 'default_inst');

    // Global & Tenant Plans State
    const [plans, setPlans] = useState<StudentSubscriptionPlan[]>(() => {
        try {
            const savedGlobal = localStorage.getItem('eduai_global_student_sub_plans');
            if (savedGlobal) {
                const parsed = JSON.parse(savedGlobal);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
            const savedTenant = localStorage.getItem(`eduai_student_sub_plans_${instId}`);
            if (savedTenant) {
                const parsed = JSON.parse(savedTenant);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }
        return GLOBAL_DEFAULT_PLANS;
    });

    const [superAdminFilter, setSuperAdminFilter] = useState<'all' | 'academic' | 'finance' | 'combo'>('all');

    // Service-specific Plan Filtering:
    // - In Finance module: Only show packages with finance SMS or all-access
    // - In Academics module: Only show packages with academic results SMS or all-access
    // - In Super Admin mode: Allow tabbed filtering across All / Academic / Finance / Combo
    const filteredPlans = useMemo(() => {
        if (isSuperAdminMode || moduleContext === 'superadmin') {
            if (superAdminFilter === 'academic') return plans.filter(p => p.smsUsageType === 'academic_results_only');
            if (superAdminFilter === 'finance') return plans.filter(p => p.smsUsageType === 'finance_receipts_only');
            if (superAdminFilter === 'combo') return plans.filter(p => p.smsUsageType === 'all');
            return plans;
        }
        if (moduleContext === 'finance') {
            return plans.filter(p => p.isActive && (p.smsUsageType === 'finance_receipts_only' || p.smsUsageType === 'all'));
        }
        if (moduleContext === 'academics') {
            return plans.filter(p => p.isActive && (p.smsUsageType === 'academic_results_only' || p.smsUsageType === 'all'));
        }
        return plans.filter(p => p.isActive);
    }, [plans, moduleContext, isSuperAdminMode, superAdminFilter]);

    const [subscriptions, setSubscriptions] = useState<StudentSubscriptionRecord[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_student_subscriptions_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) { }
        return [];
    });

    // Load from DB
    useEffect(() => {
        // Fetch global plans
        apiService.fetchModuleRecords<StudentSubscriptionPlan>('student_subscription_plans', 'SYSTEM')
            .then(records => {
                if (records && Array.isArray(records) && records.length > 0) {
                    setPlans(records);
                    try { localStorage.setItem('eduai_global_student_sub_plans', JSON.stringify(records)); } catch (e) { }
                }
            }).catch(() => { });

        if (!isSuperAdminMode && currentInstitution?.id) {
            apiService.fetchModuleRecords<StudentSubscriptionRecord>('student_subscriptions', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setSubscriptions(records);
                    }
                }).catch(() => { });
        }
    }, [isSuperAdminMode, currentInstitution]);

    const [activeTab, setActiveTab] = useState<'plans' | 'roster'>('plans');
    const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<StudentSubscriptionPlan | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
    const [isPayNowModalOpen, setIsPayNowModalOpen] = useState(false);

    // Form State for Super Admin Plan Creation/Editing
    const [newPlanName, setNewPlanName] = useState('');
    const [newPlanDesc, setNewPlanDesc] = useState('');
    const [newPlanCycle, setNewPlanCycle] = useState<'per_term' | 'per_year' | 'monthly'>('per_term');
    const [newPlanAmount, setNewPlanAmount] = useState<number>(150);
    const [newPlanSms, setNewPlanSms] = useState<number>(10);
    const [newPlanSmsType, setNewPlanSmsType] = useState<'academic_results_only' | 'finance_receipts_only' | 'all'>(
        moduleContext === 'finance' ? 'finance_receipts_only' : 'academic_results_only'
    );
    const [newPlanFeatures, setNewPlanFeatures] = useState<string>('Report Cards & Transcripts\nAttendance Tracking\nBasic Subject Mark Entry');

    // Tenant Selection & Calculation State
    const studentsList = useMemo(() => {
        return users.filter(u => u.role === 'student');
    }, [users]);

    const [selectedPackageId, setSelectedPackageId] = useState<string>(() => filteredPlans[0]?.id || plans[0]?.id || 'plan_basic_academic_term');
    const [customStudentCount, setCustomStudentCount] = useState<number>(studentsList.length || 100);

    useEffect(() => {
        if (studentsList.length > 0) {
            setCustomStudentCount(studentsList.length);
        }
    }, [studentsList.length]);

    // Keep selectedPackageId synchronized when filteredPlans change
    useEffect(() => {
        if (filteredPlans.length > 0 && !filteredPlans.some(p => p.id === selectedPackageId)) {
            setSelectedPackageId(filteredPlans[0].id);
        }
    }, [filteredPlans, selectedPackageId]);

    const selectedPackage = useMemo(() => {
        return filteredPlans.find(p => p.id === selectedPackageId) || plans.find(p => p.id === selectedPackageId) || filteredPlans[0] || plans[0] || GLOBAL_DEFAULT_PLANS[0];
    }, [filteredPlans, plans, selectedPackageId]);

    // Live Auto-Calculation
    const autoCalculatedTotal = useMemo(() => {
        return (customStudentCount || 0) * (selectedPackage?.amount || 0);
    }, [customStudentCount, selectedPackage]);

    const autoAllocatedSmsPool = useMemo(() => {
        return (customStudentCount || 0) * (selectedPackage?.smsAllocatedPerStudent || 10);
    }, [customStudentCount, selectedPackage]);

    // Financial & SMS Metrics
    const totalTermRevenue = useMemo(() => {
        return subscriptions.reduce((sum, s) => sum + (s.billingCycle === 'per_term' ? s.amount : 0), 0);
    }, [subscriptions]);

    const totalYearRevenue = useMemo(() => {
        return subscriptions.reduce((sum, s) => sum + (s.billingCycle === 'per_year' ? s.amount : 0), 0);
    }, [subscriptions]);

    const totalAllocatedSms = useMemo(() => {
        return subscriptions.reduce((sum, sub) => {
            const matchedPlan = plans.find(p => p.id === sub.planId);
            const quota = matchedPlan?.smsAllocatedPerStudent ?? 10;
            return sum + quota;
        }, 0);
    }, [subscriptions, plans]);

    // Super Admin: Save / Edit Global Plan
    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlanName.trim()) {
            alert('Please enter a package name.');
            return;
        }

        const featureArray = newPlanFeatures
            .split('\n')
            .map(f => f.trim())
            .filter(Boolean);

        const planData: StudentSubscriptionPlan = {
            id: editingPlan?.id || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: newPlanName.trim(),
            description: newPlanDesc.trim() || 'Global student subscription package.',
            billingCycle: newPlanCycle,
            amount: Number(newPlanAmount) || 0,
            smsAllocatedPerStudent: Number(newPlanSms) || 0,
            smsUsageType: newPlanSmsType,
            features: featureArray.length > 0 ? featureArray : ['Academic Records Access', 'Student Attendance Tracking'],
            applicableClasses: ['All Classes'],
            isActive: true,
            institutionId: 'SYSTEM'
        };

        const updated = editingPlan
            ? plans.map(p => p.id === editingPlan.id ? planData : p)
            : [...plans, planData];

        setPlans(updated);
        try {
            localStorage.setItem('eduai_global_student_sub_plans', JSON.stringify(updated));
            localStorage.setItem(`eduai_student_sub_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }

        await apiService.saveModuleRecord('student_subscription_plans', planData).catch(() => { });

        setEditingPlan(null);
        setNewPlanName('');
        setNewPlanDesc('');
        setIsAddPlanModalOpen(false);
    };

    const handleEditPlan = (plan: StudentSubscriptionPlan) => {
        setEditingPlan(plan);
        setNewPlanName(plan.name);
        setNewPlanDesc(plan.description);
        setNewPlanCycle(plan.billingCycle);
        setNewPlanAmount(plan.amount);
        setNewPlanSms(plan.smsAllocatedPerStudent);
        setNewPlanSmsType(plan.smsUsageType);
        setNewPlanFeatures(plan.features.join('\n'));
        setIsAddPlanModalOpen(true);
    };

    const handleDeletePlan = async (planId: string) => {
        if (!window.confirm('Are you sure you want to delete this global subscription package?')) return;
        const updated = plans.filter(p => p.id !== planId);
        setPlans(updated);
        try {
            localStorage.setItem('eduai_global_student_sub_plans', JSON.stringify(updated));
            localStorage.setItem(`eduai_student_sub_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }
        await apiService.deleteModuleRecord('student_subscription_plans', planId).catch(() => { });
    };

    // Bulk Subscribe & Activate Package for Tenant Students
    const handleApplyPlanToAllStudents = async () => {
        if (!currentInstitution?.id) return;

        const now = new Date();
        const expiry = new Date();
        if (selectedPackage.billingCycle === 'per_term') expiry.setMonth(now.getMonth() + 4);
        else if (selectedPackage.billingCycle === 'per_year') expiry.setFullYear(now.getFullYear() + 1);
        else expiry.setMonth(now.getMonth() + 1);

        const newRecords: StudentSubscriptionRecord[] = studentsList.map(student => ({
            id: `sub_${student.id}_${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            className: (student as any).studentClass || (student as any).classLevel || 'Standard Class',
            planId: selectedPackage.id,
            planName: selectedPackage.name,
            billingCycle: selectedPackage.billingCycle,
            amount: selectedPackage.amount,
            status: 'active',
            startDate: now.toISOString().split('T')[0],
            expiryDate: expiry.toISOString().split('T')[0],
            institutionId: currentInstitution.id
        }));

        setSubscriptions(newRecords);
        try {
            localStorage.setItem(`eduai_student_subscriptions_${instId}`, JSON.stringify(newRecords));
        } catch (e) { }

        for (const record of newRecords) {
            await apiService.saveModuleRecord('student_subscriptions', record).catch(() => { });
        }

        setIsCalculatorModalOpen(false);
    };

    // Automated Post-Payment Execution: Invoice + Receipt + PDF Download + Auto Email
    const handlePaymentSuccess = async () => {
        if (!currentInstitution) return;

        // 1. Process Invoice, Receipt, PDF generation & Auto Emailing
        const result = await billingService.processSuccessfulPaymentAndAutoEmail({
            institution: currentInstitution,
            companyDetails,
            amount: autoCalculatedTotal,
            phoneNumber: (currentUser as any)?.phoneNumber || currentInstitution.phoneNumber || '',
            payerName: currentUser?.name || currentInstitution.name,
            payerEmail: currentUser?.email || currentInstitution.email,
            transactionId: `TXN_${Date.now()}`,
            provider: 'mpesa',
            items: [{
                description: `${selectedPackage.name} for ${customStudentCount} Students (${selectedPackage.billingCycle.replace('_', ' ')})`,
                quantity: customStudentCount,
                unitPrice: selectedPackage.amount,
                amount: autoCalculatedTotal
            }],
            packageName: selectedPackage.name,
            billingCycle: selectedPackage.billingCycle,
            studentCount: customStudentCount,
            smsAllocated: autoAllocatedSmsPool
        });

        // 2. Assign plan to all active students in roster
        await handleApplyPlanToAllStudents();

        // 3. Auto-download PDF Receipt for the client
        if (result.receiptPdfUri) {
            billingService.downloadPdfUri(result.receiptPdfUri, `Receipt_${result.receipt.receiptNumber}.pdf`);
        }

        setIsPayNowModalOpen(false);
        setIsCalculatorModalOpen(false);
        alert(`Payment successful! Official Receipt ${result.receipt.receiptNumber} and Invoice generated. PDF downloaded and confirmation emailed to ${currentUser?.email || currentInstitution.email || 'client'}.`);
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 max-w-2xl">
                    <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5 w-fit">
                        <CreditCardIcon className="w-3.5 h-3.5" />
                        {isSuperAdminMode ? 'SUPER ADMIN GLOBAL PACKAGES CONTROL' : `STUDENT SUBSCRIPTION & BILLING (${moduleContext.toUpperCase()})`}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                        {isSuperAdminMode ? 'Global Student Subscription Packages' : 'Student Subscription Plans & Billing'}
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        {isSuperAdminMode
                            ? 'Centrally configure pricing per student, termly/annual billing cycles, and SMS pool allocations for all tenant institutions.'
                            : 'Choose your institutional package. Total billing is automatically calculated based on your total enrolled student count.'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {isSuperAdminMode ? (
                        <button
                            onClick={() => {
                                setEditingPlan(null);
                                setNewPlanName('');
                                setNewPlanDesc('');
                                setNewPlanAmount(150);
                                setNewPlanSms(10);
                                setNewPlanFeatures('Report Cards & Transcripts\nAttendance Tracking\nBasic Subject Mark Entry');
                                setIsAddPlanModalOpen(true);
                            }}
                            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" /> Create Global Package
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsCalculatorModalOpen(true)}
                            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer scale-105"
                        >
                            <SparklesIcon className="w-4 h-4" /> Choose Package & Auto-Calculate Bill
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Enrolled Learners</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                        {studentsList.length} Learners
                    </span>
                    <span className="text-[9px] text-indigo-500 font-bold uppercase block mt-0.5">Active in System</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">Active Package Subscribers</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                        {subscriptions.filter(s => s.status === 'active').length} Learners
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Assigned Active Plans</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">Est. Termly Revenue</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                        KES {totalTermRevenue.toLocaleString()} / Term
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Per-Term Subscriptions</span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">School SMS Pool Quota</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                        {totalAllocatedSms.toLocaleString()} SMS
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Allocated Across Enrolled Learners</span>
                </div>
            </div>

            {/* Navigation Tabs & Super Admin Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex gap-6 text-xs font-black uppercase tracking-wider">
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`pb-3 transition-colors cursor-pointer ${activeTab === 'plans' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        📋 Subscription Packages ({filteredPlans.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`pb-3 transition-colors cursor-pointer ${activeTab === 'roster' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        🎓 Enrolled Learner Roster ({subscriptions.length})
                    </button>
                </div>

                {isSuperAdminMode ? (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                        {[
                            { id: 'all', label: 'All Packages' },
                            { id: 'academic', label: '📚 Academic SMS' },
                            { id: 'finance', label: '💼 Finance SMS' },
                            { id: 'combo', label: '🌟 All-Access' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setSuperAdminFilter(f.id as any)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    superAdminFilter === f.id
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {moduleContext === 'finance' 
                            ? '💼 Showing Packages with Finance & Fee Receipts SMS'
                            : '📚 Showing Packages with Academic CBC & Results SMS'}
                    </div>
                )}
            </div>

            {/* PACKAGES SHOWCASE */}
            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredPlans.map(plan => (
                        <div
                            key={plan.id}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-md hover:shadow-xl transition-all flex flex-col justify-between space-y-4 relative group"
                        >
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl ${
                                        plan.billingCycle === 'per_term'
                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                    }`}>
                                        {plan.billingCycle === 'per_term' ? 'Per Term' : plan.billingCycle === 'per_year' ? 'Per Year' : 'Monthly'}
                                    </span>

                                    {isSuperAdminMode && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditPlan(plan)} className="text-slate-400 hover:text-indigo-600 cursor-pointer">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">{plan.name}</h3>
                                    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                        plan.smsUsageType === 'finance_receipts_only'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                                            : plan.smsUsageType === 'academic_results_only'
                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
                                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                                    }`}>
                                        {plan.smsUsageType === 'finance_receipts_only' ? '💼 Finance Receipts SMS Only' : plan.smsUsageType === 'academic_results_only' ? '📚 Academic Results SMS Only' : '🌟 All-Access (Academic + Finance SMS)'}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{plan.description}</p>

                                <div className="py-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                            KES {plan.amount.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            / student / {plan.billingCycle === 'per_term' ? 'term' : plan.billingCycle === 'per_year' ? 'year' : 'month'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-1">
                                        ⚡ Includes {plan.smsAllocatedPerStudent} SMS / Student
                                    </span>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Included Perks:</span>
                                    {plan.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!isSuperAdminMode && (
                                <button
                                    onClick={() => {
                                        setSelectedPackageId(plan.id);
                                        setIsCalculatorModalOpen(true);
                                    }}
                                    className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                                >
                                    Select & Calculate Total
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ENROLLED ROSTER TABLE */}
            {activeTab === 'roster' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {subscriptions.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-3">
                            <UserGroupIcon className="w-12 h-12 mx-auto opacity-30" />
                            <p className="text-xs font-bold uppercase tracking-wider">No active student subscriptions found for this school.</p>
                            {!isSuperAdminMode && (
                                <button
                                    onClick={() => setIsCalculatorModalOpen(true)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                                >
                                    ⚡ Choose Package & Enroll Students
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4">Learner Name</th>
                                        <th className="p-4">Class</th>
                                        <th className="p-4">Package Assigned</th>
                                        <th className="p-4">Cycle</th>
                                        <th className="p-4">Rate / Student</th>
                                        <th className="p-4">Expiry Date</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {subscriptions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                            <td className="p-4 font-black text-slate-900 dark:text-white">{sub.studentName}</td>
                                            <td className="p-4 font-mono text-slate-500">{sub.className}</td>
                                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{sub.planName}</td>
                                            <td className="p-4 uppercase font-mono text-[10px]">{sub.billingCycle.replace('_', ' ')}</td>
                                            <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">KES {sub.amount}</td>
                                            <td className="p-4 font-mono text-slate-500">{sub.expiryDate}</td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                                                    {sub.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TENANT AUTO-CALCULATOR MODAL */}
            {isCalculatorModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 sm:p-8 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    Instant Billing Engine
                                </span>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Student Subscription Package Chooser
                                </h3>
                            </div>
                            <button onClick={() => setIsCalculatorModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step 1: Select Package */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                1. Select Subscription Tier
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {filteredPlans.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedPackageId(p.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                                            selectedPackageId === p.id
                                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md'
                                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                    >
                                        <div>
                                            <span className="text-xs font-black text-slate-900 dark:text-white block">{p.name}</span>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 block mt-0.5">
                                                {p.smsUsageType === 'finance_receipts_only' ? '💼 Finance SMS' : p.smsUsageType === 'academic_results_only' ? '📚 Academic SMS' : '🌟 All-Access SMS'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                                                {p.billingCycle.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                KES {p.amount}
                                            </span>
                                            <span className="text-[9px] text-slate-400 block font-medium">per student</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Enrolled Student Count Verification */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    2. Confirm Enrolled Student Count
                                </label>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                                    Auto-Detected: {studentsList.length} Learners
                                </span>
                            </div>
                            <input
                                type="number"
                                min={1}
                                value={customStudentCount}
                                onChange={e => setCustomStudentCount(Math.max(1, Number(e.target.value)))}
                                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-base font-black text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                            />
                        </div>

                        {/* Step 3: Live Auto-Calculation Breakdown Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl space-y-4 shadow-xl">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Selected Package</span>
                                    <h4 className="text-sm font-black text-white uppercase">{selectedPackage.name}</h4>
                                </div>
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-mono font-bold">
                                    KES {selectedPackage.amount} × {customStudentCount}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase block">Rate / Student</span>
                                    <span className="font-bold text-white">KES {selectedPackage.amount}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase block">Total Students</span>
                                    <span className="font-bold text-white">{customStudentCount} Learners</span>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-400 uppercase block">Allocated SMS Pool</span>
                                    <span className="font-bold text-amber-400">{autoAllocatedSmsPool.toLocaleString()} SMS</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total Auto-Calculated Amount</span>
                                    <span className="text-2xl font-black text-emerald-400">
                                        KES {autoCalculatedTotal.toLocaleString()}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                    {selectedPackage.billingCycle.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                onClick={() => setIsPayNowModalOpen(true)}
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <CreditCardIcon className="w-5 h-5" /> Pay KES {autoCalculatedTotal.toLocaleString()} Now (M-Pesa / Bank)
                            </button>

                            <button
                                onClick={handleApplyPlanToAllStudents}
                                className="px-5 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
                            >
                                Assign To Learners Only
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUPER ADMIN CREATE / EDIT GLOBAL PLAN MODAL */}
            {isAddPlanModalOpen && isSuperAdminMode && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-lg p-6 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {editingPlan ? 'Edit Global Subscription Package' : 'Create Global Subscription Package'}
                            </h3>
                            <button onClick={() => setIsAddPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Package Name *
                                </label>
                                <input
                                    type="text"
                                    value={newPlanName}
                                    onChange={e => setNewPlanName(e.target.value)}
                                    placeholder="e.g. Pro Exam & Broadsheet Suite (Per Term)"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Package Description
                                </label>
                                <textarea
                                    value={newPlanDesc}
                                    onChange={e => setNewPlanDesc(e.target.value)}
                                    placeholder="Summary of modules, AI capabilities, and features included..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        Billing Cycle
                                    </label>
                                    <select
                                        value={newPlanCycle}
                                        onChange={e => setNewPlanCycle(e.target.value as any)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="per_term">Per Term</option>
                                        <option value="per_year">Per Year</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        Rate Per Student (KES) *
                                    </label>
                                    <input
                                        type="number"
                                        value={newPlanAmount}
                                        onChange={e => setNewPlanAmount(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-black text-emerald-600 focus:border-emerald-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        SMS Allocated / Student *
                                    </label>
                                    <input
                                        type="number"
                                        value={newPlanSms}
                                        onChange={e => setNewPlanSms(Number(e.target.value))}
                                        placeholder="e.g. 15"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-black text-amber-600 focus:border-amber-500 outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        SMS Usage Scope
                                    </label>
                                    <select
                                        value={newPlanSmsType}
                                        onChange={e => setNewPlanSmsType(e.target.value as any)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="academic_results_only">Academic Results Only</option>
                                        <option value="finance_receipts_only">Finance Receipts Only</option>
                                        <option value="all">All SMS Alerts</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Included Features (One per line)
                                </label>
                                <textarea
                                    value={newPlanFeatures}
                                    onChange={e => setNewPlanFeatures(e.target.value)}
                                    placeholder="Enter features, one per line..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                    rows={3}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer"
                            >
                                {editingPlan ? 'Update Global Package' : 'Save Global Package'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DIRECT CHECKOUT MODAL */}
            {isPayNowModalOpen && currentInstitution && (
                <PayNowModal
                    isOpen={isPayNowModalOpen}
                    onClose={() => setIsPayNowModalOpen(false)}
                    institutionId={currentInstitution.id}
                    institutionName={currentInstitution.name}
                    forceAmount={autoCalculatedTotal}
                    forcedItems={[{
                        description: `${selectedPackage.name} for ${customStudentCount} Students (${selectedPackage.billingCycle.replace('_', ' ')})`,
                        quantity: customStudentCount,
                        unitPrice: selectedPackage.amount,
                        amount: autoCalculatedTotal
                    }]}
                    mpesaConfig={currentInstitution.mpesaConfig || companyDetails?.mpesaConfig!}
                    airtelMoneyConfig={currentInstitution.airtelMoneyConfig || (companyDetails as any)?.airtelMoneyConfig}
                    intasendConfig={currentInstitution.intasendConfig || (companyDetails as any)?.intasendConfig}
                    ncbaConfig={currentInstitution.ncbaConfig || companyDetails?.ncbaConfig}
                    onSuccess={() => {
                        handlePaymentSuccess();
                    }}
                />
            )}
        </div>
    );
};
