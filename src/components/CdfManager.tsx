import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { generateBursaryKitPdf } from '../services/pdfService';
import type {
    User, NGCdfBursary, NGCdfFund, Invoice, Receipt,
    Assessment, AssessmentMark, Subject, Constituency, Role
} from '../types';

// Icons
import { ChartPieIcon } from './icons/ChartPieIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { EyeIcon } from './icons/EyeIcon';

interface CdfManagerProps {
    currentUser: User;
    currentInstitution: any;
    users: User[];
    invoices: Invoice[];
    receipts: Receipt[];
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    subjects: Subject[];
    onLogAction?: (message: string) => Promise<void>;
    onRefreshData?: () => Promise<void>;
}

interface SchoolGrant {
    id: string;
    institutionId: string;
    constituencyName: string;
    chequeNumber: string;
    amount: number;
    receivedDate: string;
    financialYear: string;
    purpose?: string;
    notes?: string;
    createdAt?: string;
}

export const CdfManager: React.FC<CdfManagerProps> = ({
    currentUser,
    currentInstitution,
    users = [],
    invoices = [],
    receipts = [],
    assessments = [],
    assessmentMarks = [],
    subjects = [],
    onLogAction,
    onRefreshData
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'bursaries' | 'grants'>('dashboard');
    const [bursaries, setBursaries] = useState<NGCdfBursary[]>([]);
    const [grants, setGrants] = useState<SchoolGrant[]>([]);
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'vetted' | 'approved' | 'disbursed' | 'rejected'>('all');
    const [constituencyFilter, setConstituencyFilter] = useState('all');
    
    // Modal states
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showGrantModal, setShowGrantModal] = useState(false);
    const [selectedBursary, setSelectedBursary] = useState<NGCdfBursary | null>(null);

    // Form inputs
    const [formStudentId, setFormStudentId] = useState('');
    const [formConstituency, setFormConstituency] = useState('');
    const [formAmountRequested, setFormAmountRequested] = useState('');
    const [formPurpose, setFormPurpose] = useState('Academic Fees');
    const [formNotes, setFormNotes] = useState('');

    const [formUpdateStatus, setFormUpdateStatus] = useState<'pending' | 'vetted' | 'approved' | 'disbursed' | 'rejected'>('pending');
    const [formUpdateAmountApproved, setFormUpdateAmountApproved] = useState('');
    const [formUpdateChequeNumber, setFormUpdateChequeNumber] = useState('');
    const [formUpdateNotes, setFormUpdateNotes] = useState('');

    const [formGrantConstituency, setFormGrantConstituency] = useState('');
    const [formGrantChequeNumber, setFormGrantChequeNumber] = useState('');
    const [formGrantAmount, setFormGrantAmount] = useState('');
    const [formGrantFY, setFormGrantFY] = useState('2025/2026');
    const [formGrantPurpose, setFormGrantPurpose] = useState('Infrastructure Development');
    const [formGrantNotes, setFormGrantNotes] = useState('');

    const [pdfPreviewData, setPdfPreviewData] = useState<{ uri: string; title: string } | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Filtered lists
    const schoolStudents = useMemo(() => {
        return users.filter(u => u.role === 'student' && u.institutionId === currentInstitution?.id);
    }, [users, currentInstitution]);

    useEffect(() => {
        // Auto-run schema migration for ng_cdf_school_grants (Safe execution)
        const migrationSql = `
            CREATE TABLE IF NOT EXISTS public.ng_cdf_school_grants (
                id TEXT PRIMARY KEY,
                institution_id TEXT NOT NULL,
                constituency_name TEXT NOT NULL,
                cheque_number TEXT NOT NULL,
                amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                financial_year TEXT NOT NULL,
                purpose TEXT,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            ALTER TABLE public.ng_cdf_school_grants ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ng_cdf_school_grants;
            CREATE POLICY "Enable all access for authenticated users" ON public.ng_cdf_school_grants FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
            GRANT ALL ON public.ng_cdf_school_grants TO anon, authenticated, service_role;
        `;
        apiService.runMigration(migrationSql).catch(() => {});
        loadCdfData();
    }, [currentInstitution]);

    const loadCdfData = async () => {
        if (!currentInstitution) return;
        setIsLoading(true);
        try {
            const [bursaryRecords, grantRecords, constituencyRecords] = await Promise.all([
                apiService.fetchModuleRecords<NGCdfBursary>('ng_cdf_bursaries', undefined, undefined, {
                    filter: { institutionId: currentInstitution.id }
                }).catch(() => []),
                apiService.fetchModuleRecords<SchoolGrant>('ng_cdf_school_grants', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Constituency>('constituencies').catch(() => [])
            ]);

            setBursaries(bursaryRecords);
            setGrants(grantRecords);
            setConstituencies(constituencyRecords);
        } catch (e) {
            console.error("Failed to load CDF module records", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculations
    const stats = useMemo(() => {
        const totalGrants = grants.reduce((sum, g) => sum + (g.amount || 0), 0);
        const totalRequested = bursaries.reduce((sum, b) => sum + (b.amountRequested || 0), 0);
        
        const disbursedBursaries = bursaries.filter(b => b.status === 'disbursed');
        const approvedBursaries = bursaries.filter(b => b.status === 'approved');
        
        const totalDisbursedAmt = disbursedBursaries.reduce((sum, b) => sum + (b.amountApproved || 0), 0);
        const totalApprovedAmt = approvedBursaries.reduce((sum, b) => sum + (b.amountApproved || 0), 0);

        const pendingCount = bursaries.filter(b => b.status === 'pending' || b.status === 'vetted').length;
        const disbursedCount = disbursedBursaries.length;

        return {
            totalGrants,
            totalRequested,
            totalApprovedAndDisbursed: totalDisbursedAmt + totalApprovedAmt,
            pendingCount,
            disbursedCount
        };
    }, [bursaries, grants]);

    const handleApplyBursary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formStudentId || !formConstituency || !formAmountRequested) {
            alert("Please fill in all required fields.");
            return;
        }

        const student = users.find(u => u.id === formStudentId);
        if (!student) return;

        try {
            const payload: NGCdfBursary = {
                id: `bur_cdf_${Date.now()}`,
                studentId: student.id,
                studentName: student.name,
                institutionId: currentInstitution.id,
                institutionName: currentInstitution.name,
                constituencyName: formConstituency,
                amountRequested: Number(formAmountRequested),
                purpose: formPurpose,
                status: 'pending',
                notes: formNotes,
                appliedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ng_cdf_bursaries', payload);
            if (onLogAction) await onLogAction(`Submitted CDF bursary application of KES ${formAmountRequested} for student ${student.name}`);
            
            setShowApplyModal(false);
            setFormStudentId('');
            setFormConstituency('');
            setFormAmountRequested('');
            setFormPurpose('Academic Fees');
            setFormNotes('');
            loadCdfData();
            alert("Bursary application submitted successfully!");
        } catch (err: any) {
            alert(`Failed to save application: ${err.message || err}`);
        }
    };

    const handleUpdateBursary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBursary) return;

        try {
            const updated: NGCdfBursary = {
                ...selectedBursary,
                status: formUpdateStatus,
                amountApproved: formUpdateAmountApproved ? Number(formUpdateAmountApproved) : undefined,
                chequeNumber: formUpdateChequeNumber || undefined,
                notes: formUpdateNotes || undefined,
                vettedAt: formUpdateStatus !== 'pending' ? new Date().toISOString() : undefined,
                vettedBy: formUpdateStatus !== 'pending' ? currentUser.name : undefined,
                disbursedAt: formUpdateStatus === 'disbursed' ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ng_cdf_bursaries', updated);
            if (onLogAction) await onLogAction(`Updated CDF bursary application ID ${selectedBursary.id} status to ${formUpdateStatus}`);

            setShowUpdateModal(false);
            setSelectedBursary(null);
            loadCdfData();
            alert("Bursary status updated successfully!");
        } catch (err: any) {
            alert(`Failed to update application: ${err.message || err}`);
        }
    };

    const handleRecordGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formGrantConstituency || !formGrantChequeNumber || !formGrantAmount) {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            const payload: SchoolGrant = {
                id: `grant_cdf_${Date.now()}`,
                institutionId: currentInstitution.id,
                constituencyName: formGrantConstituency,
                chequeNumber: formGrantChequeNumber,
                amount: Number(formGrantAmount),
                receivedDate: new Date().toISOString(),
                financialYear: formGrantFY,
                purpose: formGrantPurpose,
                notes: formGrantNotes,
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('ng_cdf_school_grants', payload);
            if (onLogAction) await onLogAction(`Recorded school block grant of KES ${formGrantAmount} from constituency ${formGrantConstituency}`);

            setShowGrantModal(false);
            setFormGrantConstituency('');
            setFormGrantChequeNumber('');
            setFormGrantAmount('');
            setFormGrantFY('2025/2026');
            setFormGrantPurpose('Infrastructure Development');
            setFormGrantNotes('');
            loadCdfData();
            alert("School grant cheque recorded successfully!");
        } catch (err: any) {
            alert(`Failed to save grant: ${err.message || err}`);
        }
    };

    const handleGeneratePdfSupportKit = async (bursary: NGCdfBursary) => {
        const studentUser = users.find(u => u.id === bursary.studentId);
        if (!studentUser) {
            alert("Student record not found in faculty list.");
            return;
        }

        setIsGeneratingPdf(true);
        try {
            // Find course & level names for student
            const studentInvoices = invoices.filter(inv => inv.studentId === studentUser.id);
            const courseName = studentInvoices[0]?.className || 'Academic Program';
            const levelName = 'Current Academic Period';

            const pdfUri = await generateBursaryKitPdf(
                studentUser,
                currentInstitution,
                studentInvoices,
                receipts.filter(r => r.studentId === studentUser.id),
                assessments,
                assessmentMarks,
                subjects,
                currentInstitution?.letterheadConfig,
                currentInstitution?.logoUrl || null,
                null, // footer image url
                courseName,
                levelName
            );

            setPdfPreviewData({
                uri: pdfUri,
                title: `CDF Bursary Kit - ${studentUser.name}`
            });
        } catch (e: any) {
            console.error("PDF generation failed:", e);
            alert(`Failed to generate support kit PDF: ${e.message || e}`);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const filteredBursaries = useMemo(() => {
        return bursaries.filter(b => {
            const matchesSearch = b.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.chequeNumber && b.chequeNumber.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
            const matchesConstituency = constituencyFilter === 'all' || b.constituencyName === constituencyFilter;
            return matchesSearch && matchesStatus && matchesConstituency;
        });
    }, [bursaries, searchQuery, statusFilter, constituencyFilter]);

    const activeConstituencies = useMemo(() => {
        const names = new Set<string>();
        bursaries.forEach(b => names.add(b.constituencyName));
        grants.forEach(g => names.add(g.constituencyName));
        return Array.from(names);
    }, [bursaries, grants]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">NG-CDF Bursaries Manager</h2>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Independent Allocation & Student Bursary Ledger</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadCdfData}
                        className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
                        title="Reload module data"
                    >
                        <ArrowPathIcon className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {activeSubTab === 'bursaries' ? (
                        <button
                            onClick={() => setShowApplyModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center gap-2 active:scale-95"
                        >
                            <PlusIcon className="w-4 h-4" /> Apply Bursary
                        </button>
                    ) : activeSubTab === 'grants' ? (
                        <button
                            onClick={() => setShowGrantModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-100 dark:shadow-none flex items-center gap-2 active:scale-95"
                        >
                            <PlusIcon className="w-4 h-4" /> Record Grant Cheque
                        </button>
                    ) : null}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total CDF Grants</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">KES {stats.totalGrants.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                        <CurrencyIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bursaries Disbursed</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">KES {stats.totalApprovedAndDisbursed.toLocaleString()}</span>
                    </div>
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                        <CurrencyIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Disbursed Vouchers</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.disbursedCount} Students</span>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
                        <UserGroupIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Awaiting Vetting</span>
                        <span className={`text-2xl font-black ${stats.pendingCount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{stats.pendingCount} Entries</span>
                    </div>
                    <div className={`p-3 rounded-2xl ${stats.pendingCount > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 text-slate-450 dark:bg-slate-700'}`}>
                        <ChartPieIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800">
                <button
                    onClick={() => setActiveSubTab('dashboard')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'dashboard' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm font-black' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveSubTab('bursaries')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'bursaries' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm font-black' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    Student Bursaries ({bursaries.length})
                </button>
                <button
                    onClick={() => setActiveSubTab('grants')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'grants' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm font-black' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    School Block Grants ({grants.length})
                </button>
            </div>

            {/* Sub-Tab Contents */}
            <div className="animate-fade-in-up">
                {activeSubTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Summary & Intro */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 space-y-4">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">NG-CDF Integration</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                                    The National Government Constituencies Development Fund (NG-CDF) provides crucial school-level block grants and individual student bursaries. This module works independently of the school's finance system, enabling tracking of sponsor funds and student claims separately, even if the school uses a different internal billing method.
                                </p>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex gap-3 text-indigo-800 dark:text-indigo-400">
                                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs font-semibold leading-relaxed">
                                        Use the **Student Bursaries** tab to generate official **Bursary Application Support Kits**. Each kit automatically compiles the student's Registration Status Certificate, Fee Statement, and continuous academic assessment records for constituency vetting.
                                    </p>
                                </div>
                            </div>

                            {/* Active Constituencies */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 space-y-4">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">Sponsoring Constituencies</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {activeConstituencies.map(conName => {
                                        const totalApproved = bursaries
                                            .filter(b => b.constituencyName === conName)
                                            .reduce((sum, b) => sum + (b.amountApproved || 0), 0);
                                        const studentsCount = bursaries.filter(b => b.constituencyName === conName).length;
                                        return (
                                            <div key={conName} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800/80">
                                                <div>
                                                    <span className="font-black text-sm text-slate-800 dark:text-white">{conName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{studentsCount} Bursary Recipients</span>
                                                </div>
                                                <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">KES {totalApproved.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                    {activeConstituencies.length === 0 && (
                                        <div className="sm:col-span-2 text-center py-6 text-slate-400 text-xs italic font-medium">
                                            No constituency sponsorships registered yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 space-y-4">
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">Recent Disbursements</h3>
                            <div className="space-y-4">
                                {bursaries.filter(b => b.status === 'disbursed').slice(0, 5).map(b => (
                                    <div key={b.id} className="flex justify-between items-center p-3.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                                        <div className="space-y-0.5">
                                            <span className="font-black text-xs text-slate-800 dark:text-white block">{b.studentName}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{b.constituencyName} • Chq: {b.chequeNumber || '—'}</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-600">KES {b.amountApproved?.toLocaleString()}</span>
                                    </div>
                                ))}
                                {bursaries.filter(b => b.status === 'disbursed').length === 0 && (
                                    <div className="text-center py-10 text-slate-400 text-xs italic font-medium">
                                        No recent disbursements recorded.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'bursaries' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Search by student name or cheque number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-6 pr-6 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                <select
                                    value={statusFilter}
                                    onChange={(e: any) => setStatusFilter(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="vetted">Vetted</option>
                                    <option value="approved">Approved</option>
                                    <option value="disbursed">Disbursed</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <select
                                    value={constituencyFilter}
                                    onChange={(e) => setConstituencyFilter(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                                >
                                    <option value="all">All Constituencies</option>
                                    {activeConstituencies.map(con => (
                                        <option key={con} value={con}>{con}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700/80">
                            <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Student Details</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Constituency</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Requested (KES)</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Approved (KES)</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Cheque Number</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-40">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBursaries.map((bur) => {
                                        const studentUser = users.find(u => u.id === bur.studentId);
                                        const admNo = studentUser?.admissionNumber || studentUser?.admission_number || 'N/A';
                                        
                                        return (
                                            <tr key={bur.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                                <td className="px-5 py-4">
                                                    <span className="font-black text-xs text-slate-800 dark:text-white block">{bur.studentName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">Adm: {admNo}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="font-bold text-xs text-slate-650 dark:text-slate-300">{bur.constituencyName}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{bur.amountRequested.toLocaleString()}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="font-black text-xs text-slate-900 dark:text-white">{bur.amountApproved ? bur.amountApproved.toLocaleString() : '—'}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-block px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg ${
                                                        bur.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' :
                                                        bur.status === 'vetted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                                        bur.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                                        bur.status === 'disbursed' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                                        'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400'
                                                    }`}>
                                                        {bur.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{bur.chequeNumber || '—'}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleGeneratePdfSupportKit(bur)}
                                                            disabled={isGeneratingPdf}
                                                            className="p-2 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-950/40 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-lg transition-all"
                                                            title="Generate Application Kit PDF"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedBursary(bur);
                                                                setFormUpdateStatus(bur.status);
                                                                setFormUpdateAmountApproved(bur.amountApproved ? bur.amountApproved.toString() : '');
                                                                setFormUpdateChequeNumber(bur.chequeNumber || '');
                                                                setFormUpdateNotes(bur.notes || '');
                                                                setShowUpdateModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Update
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredBursaries.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">No Bursaries Found</h3>
                                                    <p className="text-slate-400 text-[10px] mt-1 font-medium">Try resetting your search filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeSubTab === 'grants' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
                        {/* Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700/80">
                            <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Constituency</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Cheque Number</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Financial Year</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Amount (KES)</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Received Date</th>
                                        <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Purpose / Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grants.map((grant) => (
                                        <tr key={grant.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className="font-black text-xs text-slate-800 dark:text-white">{grant.constituencyName}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{grant.chequeNumber}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="font-bold text-xs text-slate-650 dark:text-slate-300">{grant.financialYear}</span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className="font-black text-xs text-emerald-600">KES {grant.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(grant.receivedDate).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{grant.purpose || 'Infrastructure Development'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {grants.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">No Grants Recorded</h3>
                                                    <p className="text-slate-400 text-[10px] mt-1 font-medium">Record block cheques received from constituencies.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Apply Bursary Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowApplyModal(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">Apply for CDF Bursary</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Submit student sponsorship request</p>
                            </div>
                            <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleApplyBursary} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Registered Student</label>
                                <select
                                    value={formStudentId}
                                    onChange={(e) => setFormStudentId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                >
                                    <option value="" disabled>-- Select Student --</option>
                                    {schoolStudents.map(student => (
                                        <option key={student.id} value={student.id}>
                                            {student.name} ({student.admissionNumber || student.admission_number || 'No Adm'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Constituency</label>
                                <select
                                    value={formConstituency}
                                    onChange={(e) => setFormConstituency(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                >
                                    <option value="" disabled>-- Select Constituency --</option>
                                    {constituencies.map(con => (
                                        <option key={con.id} value={con.name}>{con.name}</option>
                                    ))}
                                    {constituencies.length === 0 && (
                                        <>
                                            <option value="Kigumo">Kigumo Constituency</option>
                                            <option value="Gatanga">Gatanga Constituency</option>
                                            <option value="Kiharu">Kiharu Constituency</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Requested Amount (KES)</label>
                                <input
                                    type="number"
                                    value={formAmountRequested}
                                    onChange={(e) => setFormAmountRequested(e.target.value)}
                                    placeholder="e.g. 15000"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Purpose</label>
                                <input
                                    type="text"
                                    value={formPurpose}
                                    onChange={(e) => setFormPurpose(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Additional Notes</label>
                                <textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="Add any student vetting information or constituency recommendations..."
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowApplyModal(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Bursary Status Modal */}
            {showUpdateModal && selectedBursary && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowUpdateModal(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">Update Bursary Status</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Edit status for {selectedBursary.studentName}</p>
                            </div>
                            <button onClick={() => setShowUpdateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleUpdateBursary} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Application Status</label>
                                <select
                                    value={formUpdateStatus}
                                    onChange={(e: any) => setFormUpdateStatus(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="vetted">Vetted (Recommended)</option>
                                    <option value="approved">Approved</option>
                                    <option value="disbursed">Disbursed (Cheque Received)</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>

                            {(formUpdateStatus === 'approved' || formUpdateStatus === 'disbursed') && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Amount Approved (KES)</label>
                                    <input
                                        type="number"
                                        value={formUpdateAmountApproved}
                                        onChange={(e) => setFormUpdateAmountApproved(e.target.value)}
                                        placeholder={`Requested: KES ${selectedBursary.amountRequested}`}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                            )}

                            {formUpdateStatus === 'disbursed' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cheque Number / Reference</label>
                                    <input
                                        type="text"
                                        value={formUpdateChequeNumber}
                                        onChange={(e) => setFormUpdateChequeNumber(e.target.value)}
                                        placeholder="e.g. CDF-CHK-10023"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Update Notes / Comments</label>
                                <textarea
                                    value={formUpdateNotes}
                                    onChange={(e) => setFormUpdateNotes(e.target.value)}
                                    placeholder="Add cheque receipt dates, bank names, or rejection reasons..."
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUpdateModal(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
                                >
                                    Update Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record School Grant Modal */}
            {showGrantModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowGrantModal(false)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">Record Block Grant Cheque</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Register constituency development funds</p>
                            </div>
                            <button onClick={() => setShowGrantModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleRecordGrant} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Constituency Name</label>
                                <select
                                    value={formGrantConstituency}
                                    onChange={(e) => setFormGrantConstituency(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                >
                                    <option value="" disabled>-- Select Constituency --</option>
                                    {constituencies.map(con => (
                                        <option key={con.id} value={con.name}>{con.name}</option>
                                    ))}
                                    {constituencies.length === 0 && (
                                        <>
                                            <option value="Kigumo">Kigumo Constituency</option>
                                            <option value="Gatanga">Gatanga Constituency</option>
                                            <option value="Kiharu">Kiharu Constituency</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cheque / Reference Number</label>
                                <input
                                    type="text"
                                    value={formGrantChequeNumber}
                                    onChange={(e) => setFormGrantChequeNumber(e.target.value)}
                                    placeholder="e.g. CHQ-880091"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Amount (KES)</label>
                                <input
                                    type="number"
                                    value={formGrantAmount}
                                    onChange={(e) => setFormGrantAmount(e.target.value)}
                                    placeholder="e.g. 500000"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Financial Year</label>
                                <select
                                    value={formGrantFY}
                                    onChange={(e) => setFormGrantFY(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                                >
                                    <option value="2024/2025">2024/2025</option>
                                    <option value="2025/2026">2025/2026</option>
                                    <option value="2026/2027">2026/2027</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Purpose</label>
                                <input
                                    type="text"
                                    value={formGrantPurpose}
                                    onChange={(e) => setFormGrantPurpose(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Notes / Details</label>
                                <textarea
                                    value={formGrantNotes}
                                    onChange={(e) => setFormGrantNotes(e.target.value)}
                                    placeholder="Enter details of the bank account credited, constituency staff who delivered the cheque, etc."
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowGrantModal(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
                                >
                                    Record Cheque
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PDF Support Kit Preview Modal */}
            {pdfPreviewData && (
                <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPdfPreviewData(null)}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-850 dark:text-white">{pdfPreviewData.title}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vetting Support Kit Document</p>
                            </div>
                            <button onClick={() => setPdfPreviewData(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center overflow-hidden">
                            <iframe
                                src={pdfPreviewData.uri}
                                title={pdfPreviewData.title}
                                className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
