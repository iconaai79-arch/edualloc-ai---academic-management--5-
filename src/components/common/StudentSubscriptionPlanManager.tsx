import React, { useState, useMemo, useEffect } from 'react';
import type { Institution, User, Course } from '../../types';
import { apiService } from '../../services/apiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';

export interface StudentSubscriptionPlan {
    id: string;
    name: string;
    description: string;
    billingCycle: 'per_term' | 'per_year' | 'monthly';
    amount: number;
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
    moduleContext?: 'academics' | 'finance';
}

export const StudentSubscriptionPlanManager: React.FC<StudentSubscriptionPlanManagerProps> = ({
    currentInstitution,
    currentUser,
    users = [],
    courses = [],
    moduleContext = 'academics'
}) => {
    const instId = currentInstitution?.id || 'default_inst';

    // Seed Subscription Plans
    const defaultPlans: StudentSubscriptionPlan[] = [
        {
            id: 'plan_basic_term',
            name: 'Basic Academic Plan (Per Term)',
            description: 'Covers termly CBC/8-4-4 academic records, report cards, and student attendance tracking.',
            billingCycle: 'per_term',
            amount: 150,
            smsAllocatedPerStudent: 10,
            smsUsageType: 'academic_results_only',
            features: ['Report Cards & Transcripts', 'Attendance Tracking', 'Basic Subject Mark Entry', '10 Academic Results SMS / Student'],
            applicableClasses: ['All Classes'],
            isActive: true,
            institutionId: instId
        },
        {
            id: 'plan_pro_term',
            name: 'Pro Exam & Broadsheet Suite (Per Term)',
            description: 'Includes automated conflict-free timetable, exam broadsheets, SpeechBuddy AI, and parent SMS alerts.',
            billingCycle: 'per_term',
            amount: 350,
            smsAllocatedPerStudent: 15,
            smsUsageType: 'all',
            features: ['All Basic Features', 'Exam Units & Broadsheets', 'SpeechBuddy AI Access', '15 Parent Results & Fee SMS / Student'],
            applicableClasses: ['All Classes'],
            isActive: true,
            institutionId: instId
        },
        {
            id: 'plan_enterprise_year',
            name: 'Annual All-Access Student Pass (Per Year)',
            description: 'Full-year unlimited access across Academics, Exams, SpeechBuddy AI, and M-Pesa automated fee receipts.',
            billingCycle: 'per_year',
            amount: 1000,
            smsAllocatedPerStudent: 30,
            smsUsageType: 'all',
            features: ['Full Year Unlimited Access', 'AI Revision Marketplace', 'Automated M-Pesa Receipts', '30 Results & Finance SMS / Student'],
            applicableClasses: ['All Classes'],
            isActive: true,
            institutionId: instId
        }
    ];

    const [plans, setPlans] = useState<StudentSubscriptionPlan[]>(() => {
        try {
            const saved = localStorage.getItem(`eduai_student_sub_plans_${instId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }
        return defaultPlans;
    });

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

    // Sync with DB
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<StudentSubscriptionPlan>('student_subscription_plans', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setPlans(records);
                    }
                }).catch(() => { });

            apiService.fetchModuleRecords<StudentSubscriptionRecord>('student_subscriptions', currentInstitution.id)
                .then(records => {
                    if (records && Array.isArray(records) && records.length > 0) {
                        setSubscriptions(records);
                    }
                }).catch(() => { });
        }
    }, [currentInstitution]);

    const [activeTab, setActiveTab] = useState<'plans' | 'roster'>('plans');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddPlanModalOpen, setIsAddPlanModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // New Plan Form State
    const [newPlanName, setNewPlanName] = useState('');
    const [newPlanDesc, setNewPlanDesc] = useState('');
    const [newPlanCycle, setNewPlanCycle] = useState<'per_term' | 'per_year' | 'monthly'>('per_term');
    const [newPlanAmount, setNewPlanAmount] = useState<number>(150);
    const [newPlanSms, setNewPlanSms] = useState<number>(10);
    const [newPlanSmsType, setNewPlanSmsType] = useState<'academic_results_only' | 'finance_receipts_only' | 'all'>('academic_results_only');

    // Assign Student State
    const [assignStudentId, setAssignStudentId] = useState('');
    const [assignPlanId, setAssignPlanId] = useState(plans[0]?.id || '');

    const studentsList = useMemo(() => {
        return users.filter(u => u.role === 'student');
    }, [users]);

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

    // Save New Plan
    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlanName.trim()) {
            alert('Please enter a plan name.');
            return;
        }

        const newPlan: StudentSubscriptionPlan = {
            id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: newPlanName.trim(),
            description: newPlanDesc.trim() || 'Standard student subscription plan.',
            billingCycle: newPlanCycle,
            amount: newPlanAmount,
            smsAllocatedPerStudent: newPlanSms,
            smsUsageType: newPlanSmsType,
            features: [
                'Report Cards & Academic Records',
                'Attendance Tracking',
                `${newPlanSms} ${newPlanSmsType === 'academic_results_only' ? 'Academic Results' : newPlanSmsType === 'finance_receipts_only' ? 'Finance Receipts' : 'Results & Billing'} SMS / Student`
            ],
            applicableClasses: ['All Classes'],
            isActive: true,
            institutionId: currentInstitution?.id
        };

        const updated = [...plans, newPlan];
        setPlans(updated);
        try {
            localStorage.setItem(`eduai_student_sub_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }

        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('student_subscription_plans', newPlan).catch(() => { });
        }

        setNewPlanName('');
        setNewPlanDesc('');
        setIsAddPlanModalOpen(false);
    };

    // Assign Plan to Student
    const handleAssignPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const studentObj = studentsList.find(s => s.id === assignStudentId);
        const planObj = plans.find(p => p.id === assignPlanId);

        if (!studentObj || !planObj) {
            alert('Please select both a student and a valid subscription plan.');
            return;
        }

        const now = new Date();
        const expiry = new Date();
        if (planObj.billingCycle === 'per_term') expiry.setMonth(now.getMonth() + 4);
        else if (planObj.billingCycle === 'per_year') expiry.setFullYear(now.getFullYear() + 1);
        else expiry.setMonth(now.getMonth() + 1);

        const newSub: StudentSubscriptionRecord = {
            id: `sub_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            studentId: studentObj.id,
            studentName: studentObj.name,
            className: (studentObj as any).studentClass || (studentObj as any).classLevel || 'Form 3',
            planId: planObj.id,
            planName: planObj.name,
            billingCycle: planObj.billingCycle,
            amount: planObj.amount,
            status: 'active',
            startDate: now.toISOString().split('T')[0],
            expiryDate: expiry.toISOString().split('T')[0],
            institutionId: currentInstitution?.id
        };

        const updated = [newSub, ...subscriptions.filter(s => s.studentId !== studentObj.id)];
        setSubscriptions(updated);
        try {
            localStorage.setItem(`eduai_student_subscriptions_${instId}`, JSON.stringify(updated));
        } catch (e) { }

        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('student_subscriptions', newSub).catch(() => { });
        }

        setIsAssignModalOpen(false);
    };

    const handleDeletePlan = async (planId: string) => {
        if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
        const updated = plans.filter(p => p.id !== planId);
        setPlans(updated);
        try {
            localStorage.setItem(`eduai_student_sub_plans_${instId}`, JSON.stringify(updated));
        } catch (e) { }
        if (currentInstitution?.id) {
            await apiService.deleteModuleRecord('student_subscription_plans', planId).catch(() => { });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 max-w-2xl">
                    <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5 w-fit">
                        <CreditCardIcon className="w-3.5 h-3.5" /> Student Subscription & Billing Engine ({moduleContext.toUpperCase()})
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                        Student Subscription Plans
                    </h2>
                    <p className="text-xs text-emerald-100/80 leading-relaxed">
                        Configure per-term or per-year student pricing tiers, assign plans to learners, and track automated subscription revenue.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsAddPlanModalOpen(true)}
                        className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center gap-1.5"
                    >
                        <PlusIcon className="w-4 h-4" /> Create New Plan
                    </button>
                    <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center gap-1.5"
                    >
                        <UserGroupIcon className="w-4 h-4" /> Assign Student Plan
                    </button>
                </div>
            </div>

            {/* Quick Financial & SMS Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Active Student Subscriptions</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                        {subscriptions.filter(s => s.status === 'active').length} Learners
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">Est. Termly Subscription Revenue</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                        KES {totalTermRevenue.toLocaleString()} / Term
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">Est. Annual Subscription Revenue</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                        KES {totalYearRevenue.toLocaleString()} / Year
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">Allocated School SMS Pool</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                        {totalAllocatedSms.toLocaleString()} SMS
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Academic Results & Receipts</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-6 text-xs font-black uppercase tracking-wider">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`pb-3 transition-colors ${activeTab === 'plans' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    📋 Subscription Tiers ({plans.length})
                </button>
                <button
                    onClick={() => setActiveTab('roster')}
                    className={`pb-3 transition-colors ${activeTab === 'roster' ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    🎓 Enrolled Student Roster ({subscriptions.length})
                </button>
            </div>

            {/* PLANS GRID */}
            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-xl transition-all flex flex-col justify-between space-y-4 relative"
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

                                    <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-rose-600">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="text-base font-black text-slate-900 dark:text-white">{plan.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{plan.description}</p>

                                <div className="py-2">
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        KES {plan.amount}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono ml-1">
                                        / {plan.billingCycle === 'per_term' ? 'term' : plan.billingCycle === 'per_year' ? 'year' : 'month'}
                                    </span>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Included Features:</span>
                                    {plan.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ROSTER TABLE */}
            {activeTab === 'roster' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    {subscriptions.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-2">
                            <UserGroupIcon className="w-12 h-12 mx-auto opacity-30" />
                            <p className="text-xs font-bold uppercase tracking-wider">No student subscriptions assigned yet.</p>
                            <button
                                onClick={() => setIsAssignModalOpen(true)}
                                className="px-4 py-2 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                            >
                                + Assign First Student
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Class</th>
                                        <th className="p-4">Plan Name</th>
                                        <th className="p-4">Cycle</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Expiry Date</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {subscriptions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                            <td className="p-4 font-black text-slate-900 dark:text-white">{sub.studentName}</td>
                                            <td className="p-4 font-mono">{sub.className}</td>
                                            <td className="p-4 font-bold">{sub.planName}</td>
                                            <td className="p-4 uppercase font-mono text-[10px]">{sub.billingCycle.replace('_', ' ')}</td>
                                            <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">KES {sub.amount}</td>
                                            <td className="p-4 font-mono">{sub.expiryDate}</td>
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

            {/* CREATE PLAN MODAL */}
            {isAddPlanModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md p-6 space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Create Student Subscription Plan
                            </h3>
                            <button onClick={() => setIsAddPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlan} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Plan Name *
                                </label>
                                <input
                                    type="text"
                                    value={newPlanName}
                                    onChange={e => setNewPlanName(e.target.value)}
                                    placeholder="e.g. Standard Academic Plan (Per Term)"
                                    className="form-input text-xs font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newPlanDesc}
                                    onChange={e => setNewPlanDesc(e.target.value)}
                                    placeholder="Summary of modules and features included..."
                                    className="form-input text-xs font-medium"
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
                                        className="form-select text-xs font-bold"
                                    >
                                        <option value="per_term">Per Term</option>
                                        <option value="per_year">Per Year</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        Amount (KES)
                                    </label>
                                    <input
                                        type="number"
                                        value={newPlanAmount}
                                        onChange={e => setNewPlanAmount(Number(e.target.value))}
                                        className="form-input text-xs font-black text-emerald-600"
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
                                        placeholder="e.g. 10"
                                        className="form-input text-xs font-black text-amber-600"
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
                                        className="form-select text-xs font-bold"
                                    >
                                        <option value="academic_results_only">Academic Results Only</option>
                                        <option value="finance_receipts_only">Finance Receipts Only</option>
                                        <option value="all">All SMS Alerts</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all"
                            >
                                Save Subscription Plan
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ASSIGN STUDENT MODAL */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md p-6 space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Assign Plan to Student
                            </h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignPlan} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Select Student *
                                </label>
                                <select
                                    value={assignStudentId}
                                    onChange={e => setAssignStudentId(e.target.value)}
                                    className="form-select text-xs font-bold"
                                    required
                                >
                                    <option value="">Choose learner...</option>
                                    {studentsList.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({(s as any).studentClass || (s as any).classLevel || 'Class'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Select Subscription Plan *
                                </label>
                                <select
                                    value={assignPlanId}
                                    onChange={e => setAssignPlanId(e.target.value)}
                                    className="form-select text-xs font-bold text-emerald-600"
                                    required
                                >
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} — KES {p.amount} ({p.billingCycle.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all"
                            >
                                Confirm Student Subscription
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
