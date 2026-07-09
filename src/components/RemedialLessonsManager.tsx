import React, { useState, useEffect, useMemo } from 'react';
import type { User, Course, Subject, RemedialSession, RemedialRateSetting, RemedialPayout, Invoice } from '../types';
import { apiService } from '../services/apiService';
import { 
    Clock, Plus, Check, CheckCircle2, CreditCard, Printer, QrCode, Search, 
    DollarSign, AlertCircle, Trash2, Shield, Eye, Award, BookOpen, Layers, UserCheck
} from 'lucide-react';

interface RemedialLessonsManagerProps {
    currentUser: User;
    users: User[];
    courses: Course[];
    subjects: Subject[];
    currentInstitution: any;
    onLogAction?: (msg: string) => void;
}

export const RemedialLessonsManager: React.FC<RemedialLessonsManagerProps> = ({
    currentUser,
    users = [],
    courses = [],
    subjects = [],
    currentInstitution,
    onLogAction
}) => {
    const institutionId = currentInstitution?.id || currentUser?.institutionId;

    // States
    const [sessions, setSessions] = useState<RemedialSession[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [rateSetting, setRateSetting] = useState<RemedialRateSetting | null>(null);
    const [payouts, setPayouts] = useState<RemedialPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sessions' | 'rates' | 'payouts' | 'billing'>('sessions');
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'In Progress' | 'Prefect Confirmed' | 'Approved' | 'Paid'>('all');
    
    // Rates Form State
    const [hourlyRate, setHourlyRate] = useState<number>(1000);
    const [feePerStudent, setFeePerStudent] = useState<number>(200);
    const [termFee, setTermFee] = useState<number>(3000);

    // QR Print State
    const [printingPrefect, setPrintingPrefect] = useState<User | null>(null);

    // Manual Log Session Modal State
    const [showLogModal, setShowLogModal] = useState(false);
    const [manualTeacherId, setManualTeacherId] = useState('');
    const [manualSubjectId, setManualSubjectId] = useState('');
    const [manualCourseId, setManualCourseId] = useState('');
    const [manualPrefectId, setManualPrefectId] = useState('');
    const [manualHours, setManualHours] = useState<number>(2);
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

    // Load Data
    const loadData = async () => {
        setLoading(true);
        try {
            const [sessList, rates, payList, invList] = await Promise.all([
                apiService.fetchRemedialSessions(institutionId),
                apiService.fetchRemedialRateSettings(institutionId),
                apiService.fetchRemedialPayouts(institutionId),
                apiService.fetchInvoices(institutionId)
            ]);

            setSessions(sessList || []);
            setInvoices(invList || []);
            setPayouts(payList || []);

            if (rates && rates.length > 0) {
                setRateSetting(rates[0]);
                setHourlyRate(rates[0].hourlyRate);
                setFeePerStudent(rates[0].feePerStudent);
                setTermFee(rates[0].termFee || 3000);
            }
        } catch (e) {
            console.error('Failed to load remedial data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [institutionId]);

    // Filtered Sessions
    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            const teacher = users.find(u => u.id === s.teacherId);
            const subject = subjects.find(sub => sub.id === s.subjectId);
            const course = courses.find(c => c.id === s.courseId);

            const matchQuery = 
                (teacher?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (subject?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (course?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchStatus = statusFilter === 'all' || s.status === statusFilter;

            return matchQuery && matchStatus;
        });
    }, [sessions, users, subjects, courses, searchQuery, statusFilter]);

    // List of Prefects (students with role 'prefect' or 'student')
    const prefectsList = useMemo(() => {
        return users.filter(u => u.role === 'student' && u.institutionId === institutionId);
    }, [users, institutionId]);

    // List of Teachers/Lecturers
    const teachersList = useMemo(() => {
        return users.filter(u => (u.role === 'teacher' || u.role === 'lecturer' || u.role === 'staff') && u.institutionId === institutionId);
    }, [users, institutionId]);

    // Save Rate Settings
    const handleSaveRates = async () => {
        try {
            const data: Partial<RemedialRateSetting> = {
                id: rateSetting?.id || `rate_${Date.now()}`,
                hourlyRate,
                feePerStudent,
                termFee,
                institutionId
            };
            await apiService.saveRemedialRateSetting(data);
            onLogAction?.(`Updated Remedial Rates: hourly pay KES ${hourlyRate}, fee per student KES ${feePerStudent}, term fee KES ${termFee}`);
            alert('Remedial rates updated successfully!');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to update rates');
        }
    };

    // Manual Log Submit
    const handleManualLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualTeacherId || !manualSubjectId || !manualCourseId || !manualPrefectId) {
            return alert('Please fill in all fields');
        }

        try {
            const teacher = users.find(u => u.id === manualTeacherId);
            const subject = subjects.find(s => s.id === manualSubjectId);
            const course = courses.find(c => c.id === manualCourseId);
            const prefect = users.find(u => u.id === manualPrefectId);

            const startTime = new Date(`${manualDate}T16:00:00`).toISOString();
            const endTime = new Date(new Date(startTime).getTime() + manualHours * 60 * 60 * 1000).toISOString();

            const newSession: RemedialSession = {
                id: `rem_${Date.now()}`,
                teacherId: manualTeacherId,
                teacherName: teacher?.name || 'Unknown',
                subjectId: manualSubjectId,
                subjectName: subject?.name || 'Unknown',
                courseId: manualCourseId,
                className: course?.name || 'Unknown',
                prefectId: manualPrefectId,
                prefectName: prefect?.name || 'Unknown',
                prefectToken: `prefect_remedial_token_class_${manualCourseId}`,
                startTime,
                endTime,
                hours: manualHours,
                status: 'Approved', // Manually logged by Admin defaults to Approved
                createdAt: new Date().toISOString(),
                institutionId
            };

            await apiService.saveRemedialSession(newSession);
            onLogAction?.(`Manually logged approved remedial session for ${teacher?.name} (${manualHours} hrs)`);
            alert('Remedial session logged and approved successfully!');
            setShowLogModal(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to log session');
        }
    };

    // Approve Prefect Confirmed Session
    const handleApproveSession = async (session: RemedialSession) => {
        try {
            const updated = {
                ...session,
                status: 'Approved' as const
            };
            await apiService.saveRemedialSession(updated);
            onLogAction?.(`Approved remedial session for ${session.teacherName} (${session.hours} hrs)`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to approve session');
        }
    };

    // Calculate accrued unpaid earnings per teacher
    const accruedPayouts = useMemo(() => {
        const unpaidApproved = sessions.filter(s => s.status === 'Approved');
        const grouped: Record<string, { teacherName: string, totalHours: number, sessionIds: string[] }> = {};

        unpaidApproved.forEach(s => {
            if (!grouped[s.teacherId]) {
                grouped[s.teacherId] = {
                    teacherName: s.teacherName || 'Unknown Teacher',
                    totalHours: 0,
                    sessionIds: []
                };
            }
            grouped[s.teacherId].totalHours += s.hours || 0;
            grouped[s.teacherId].sessionIds.push(s.id);
        });

        return Object.entries(grouped).map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacherName,
            totalHours: data.totalHours,
            sessionIds: data.sessionIds,
            rate: hourlyRate,
            totalAmount: data.totalHours * hourlyRate
        }));
    }, [sessions, hourlyRate]);

    // Issue Payout Voucher
    const handleIssuePayout = async (accrued: any) => {
        if (!window.confirm(`Issue payout voucher for ${accrued.teacherName} of KES ${accrued.totalAmount.toLocaleString()}?`)) return;

        try {
            const payoutId = `pay_${Date.now()}`;
            const payoutData: RemedialPayout = {
                id: payoutId,
                teacherId: accrued.teacherId,
                teacherName: accrued.teacherName,
                totalHours: accrued.totalHours,
                hourlyRate: accrued.rate,
                totalAmount: accrued.totalAmount,
                payoutDate: new Date().toISOString().split('T')[0],
                status: 'Pending',
                institutionId
            };

            // Save payout
            await apiService.saveRemedialPayout(payoutData);

            // Mark sessions as Paid / linked to payout
            for (const sessId of accrued.sessionIds) {
                const sess = sessions.find(s => s.id === sessId);
                if (sess) {
                    await apiService.saveRemedialSession({
                        ...sess,
                        status: 'Paid',
                        payoutId: payoutId
                    });
                }
            }

            onLogAction?.(`Generated pending payout voucher ${payoutId} for ${accrued.teacherName}`);
            alert(`Payout voucher generated! Tell the teacher to sign the voucher anonymously using their portal.`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to issue payout');
        }
    };

    // Print Prefect Card
    const printPrefectCard = (prefect: User) => {
        setPrintingPrefect(prefect);
        setTimeout(() => {
            window.print();
        }, 300);
    };
    
    // Parent Billing Calculations (Term Fee billing)
    const billingSummary = useMemo(() => {
        const students = users.filter(u => u.role === 'student' && u.institutionId === institutionId);
        return students.map(student => {
            const course = courses.find(c => c.id === student.courseId);
            const studentInvoices = invoices.filter(inv => inv.studentId === student.id);
            const isInvoiced = studentInvoices.some(inv => 
                inv.items.some(item => item.description.includes('Term Remedial Fee'))
            );
            
            return {
                studentId: student.id,
                studentName: student.name,
                className: course?.name || 'Stream',
                isInvoiced,
                amount: termFee
            };
        });
    }, [users, courses, invoices, termFee, institutionId]);

    // Generate Term Fee Invoice for single Student
    const handleBillParent = async (studentId: string, studentName: string, className: string) => {
        try {
            const invoiceId = `inv_${Date.now()}`;
            const newInvoice: any = {
                id: invoiceId,
                invoiceNumber: `REMEDIAL-${Date.now().toString().slice(-6)}`,
                institutionId,
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days due
                items: [{
                    description: `Term Remedial Fee (Flat fee billed at start of term)`,
                    quantity: 1,
                    unitPrice: termFee,
                    amount: termFee
                }],
                totalAmount: termFee,
                status: 'pending',
                studentId,
                className
            };

            await apiService.saveModuleRecord('invoices', newInvoice);
            onLogAction?.(`Generated term remedial fee invoice of KES ${termFee} for ${studentName}`);
            loadData();
        } catch (err: any) {
            console.error('Failed to generate invoice for ' + studentName, err);
            throw err;
        }
    };

    // Bulk bill all students not yet billed
    const handleBulkBillParents = async () => {
        const unbilled = billingSummary.filter(b => !b.isInvoiced);
        if (unbilled.length === 0) {
            alert('All students have already been invoiced for the term.');
            return;
        }

        if (!window.confirm(`Generate term remedial fee invoices (KES ${termFee}) for ${unbilled.length} student(s)?`)) return;

        let successCount = 0;
        for (const student of unbilled) {
            try {
                // Generate invoice using core method (it handles saving & logging)
                const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newInvoice: any = {
                    id: invoiceId,
                    invoiceNumber: `REMEDIAL-${Date.now().toString().slice(-6)}-${successCount}`,
                    institutionId,
                    issueDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    items: [{
                        description: `Term Remedial Fee (Flat fee billed at start of term)`,
                        quantity: 1,
                        unitPrice: termFee,
                        amount: termFee
                    }],
                    totalAmount: termFee,
                    status: 'pending',
                    studentId: student.studentId,
                    className: student.className
                };

                await apiService.saveModuleRecord('invoices', newInvoice);
                onLogAction?.(`Generated term remedial fee invoice of KES ${termFee} for ${student.studentName}`);
                successCount++;
            } catch (e) {
                console.error(e);
            }
        }

        alert(`Successfully generated term remedial fee invoices for ${successCount} student(s).`);
        loadData();
    };

    return (
        <div className="space-y-8 animate-fade-in mt-4">
            
            {/* Context Tab Bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-3xl p-2 shadow-sm">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('sessions')}
                        className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                    >
                        <Clock className="w-4 h-4" /> Remedial Hours
                    </button>
                    <button 
                        onClick={() => setActiveTab('payouts')}
                        className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'payouts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                    >
                        <DollarSign className="w-4 h-4" /> Teacher Payouts
                    </button>
                    <button 
                        onClick={() => setActiveTab('billing')}
                        className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                    >
                        <CreditCard className="w-4 h-4" /> Parent Billing
                    </button>
                    <button 
                        onClick={() => setActiveTab('rates')}
                        className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'rates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                    >
                        <Shield className="w-4 h-4" /> Rates & Configuration
                    </button>
                </div>

                <div className="flex gap-2">
                    {activeTab === 'sessions' && (
                        <button 
                            onClick={() => setShowLogModal(true)}
                            className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" /> Log Extra Hours
                        </button>
                    )}
                </div>
            </div>

            {/* TAB: SESSIONS */}
            {activeTab === 'sessions' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-650 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search teacher, subject, class..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-6 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Filter</label>
                            <select 
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                            >
                                <option value="all">All Sessions</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Prefect Confirmed">Prefect Confirmed</option>
                                <option value="Approved">Approved</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class & Subject</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prefect validation</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No remedial hours logged.</td>
                                        </tr>
                                    ) : (
                                        filteredSessions.map(session => (
                                            <tr key={session.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase italic">{session.teacherName}</p>
                                                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">ID: {session.teacherId.substring(0, 8)}</p>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-indigo-650 uppercase">{session.subjectName}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{session.className}</p>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck className="w-4 h-4 text-emerald-500" />
                                                        <div>
                                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{session.prefectName}</p>
                                                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">Card Token: {session.prefectToken.slice(-10)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">{session.hours ? `${session.hours} hrs` : 'N/A'}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">
                                                        {new Date(session.startTime).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic ${
                                                        session.status === 'Approved' ? 'bg-indigo-100 text-indigo-600' :
                                                        session.status === 'Prefect Confirmed' ? 'bg-amber-100 text-amber-600' :
                                                        session.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {session.status}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    {session.status === 'Prefect Confirmed' && (
                                                        <button 
                                                            onClick={() => handleApproveSession(session)}
                                                            className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm transition-all"
                                                        >
                                                            Approve Hours
                                                        </button>
                                                    )}
                                                    {session.status === 'Approved' && (
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                            <Check className="w-3.5 h-3.5" /> Ready for Payout
                                                        </span>
                                                    )}
                                                    {session.status === 'Paid' && (
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 justify-end">
                                                            Paid in Voucher
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PAYOUTS */}
            {activeTab === 'payouts' && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Unpaid Approved Hours (Weekly/Monthly calculations)</h4>
                        <p className="text-xs text-slate-500">Below are the accumulated approved remedial hours per teacher waiting for payment voucher issuance.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Accrued Hours</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate / hr</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payout</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accruedPayouts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No accrued unpaid hours. All teachers have been paid or hours are unapproved.</td>
                                    </tr>
                                ) : (
                                    accruedPayouts.map(accrued => (
                                        <tr key={accrued.teacherId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">{accrued.teacherName}</td>
                                            <td className="p-6 text-xs font-black text-slate-950 dark:text-slate-100">{accrued.totalHours} hrs</td>
                                            <td className="p-6 text-xs font-bold text-slate-400 font-mono">KES {accrued.rate.toLocaleString()}</td>
                                            <td className="p-6 text-sm font-black text-indigo-650 font-mono">KES {accrued.totalAmount.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                <button 
                                                    onClick={() => handleIssuePayout(accrued)}
                                                    className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
                                                >
                                                    Issue Payout Voucher
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mt-8">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Payout Vouchers Ledger</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher ID</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Anonymous Signature</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No payouts recorded.</td>
                                        </tr>
                                    ) : (
                                        payouts.map(p => (
                                            <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50">
                                                <td className="p-4 font-mono text-xs font-black text-purple-650">#{p.id.split('_')[1] || p.id}</td>
                                                <td className="p-4 text-xs font-black text-slate-900 dark:text-white uppercase">{p.teacherName}</td>
                                                <td className="p-4 text-xs font-black text-indigo-650 font-mono">KES {p.totalAmount.toLocaleString()}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {p.anonymousSignature ? (
                                                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{p.anonymousSignature}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase italic">Awaiting Signature</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === 'billing' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Generate Parent Term Fee Invoices</h4>
                            <p className="text-xs text-slate-500">Bill parents for remedial lessons at the beginning of the term as a flat fee. Parents pay via installments in their portals.</p>
                        </div>
                        <button
                            onClick={handleBulkBillParents}
                            className="px-5 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" /> Bulk Invoice All Students
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Stream</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Status</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Term Fee</th>
                                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billingSummary.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">No students registered in the system.</td>
                                    </tr>
                                ) : (
                                    billingSummary.map(bill => (
                                        <tr key={bill.studentId} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-black text-slate-900 dark:text-white uppercase italic text-xs">{bill.studentName}</td>
                                            <td className="p-6 text-xs font-bold text-slate-500 uppercase">{bill.className}</td>
                                            <td className="p-6 text-xs">
                                                {bill.isInvoiced ? (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-black uppercase text-[8px] tracking-widest">Invoiced</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-black uppercase text-[8px] tracking-widest">Pending Invoice</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-sm font-black text-indigo-650 font-mono">KES {bill.amount.toLocaleString()}</td>
                                            <td className="p-6 text-right">
                                                {!bill.isInvoiced ? (
                                                    <button 
                                                        onClick={() => handleBillParent(bill.studentId, bill.studentName, bill.className)}
                                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all"
                                                    >
                                                        Issue Term Invoice
                                                    </button>
                                                ) : (
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 justify-end">
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Billed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: RATES & CONFIG */}
            {activeTab === 'rates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Rates Form */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-500" /> Remedial Financial Rates
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Teacher Payout Rate (per hour)</label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                    <input 
                                        type="number"
                                        value={hourlyRate}
                                        onChange={e => setHourlyRate(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Parent Remedial Fee (per session)</label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                    <input 
                                        type="number"
                                        value={feePerStudent}
                                        onChange={e => setFeePerStudent(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Parent Remedial Term Fee (Flat fee billed at start of term)</label>
                                <div className="relative group">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                    <input 
                                        type="number"
                                        value={termFee}
                                        onChange={e => setTermFee(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveRates}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Save Configuration Settings
                        </button>
                    </div>

                    {/* Prefects Cards Directory */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-indigo-500" /> Prefect QR Cards Directory
                        </h4>
                        <p className="text-xs text-slate-500">Print the physical verification QR cards for prefects. Teachers scan these cards to start and end remedial classes.</p>

                        <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                            {prefectsList.map(prefect => {
                                const course = courses.find(c => c.id === prefect.courseId);
                                return (
                                    <div key={prefect.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{prefect.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Stream: {course?.name || 'Unassigned'}</p>
                                        </div>
                                        <button 
                                            onClick={() => printPrefectCard(prefect)}
                                            className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                                            title="Print Prefect Verification Card"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Layout (Hidden on Screen, Visible on Print) */}
            {printingPrefect && (
                <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black text-center font-sans">
                    <div className="border-4 border-double border-indigo-600 p-8 max-w-sm mx-auto rounded-[2rem] space-y-6">
                        <h2 className="text-lg font-black uppercase tracking-tight text-indigo-750">{currentInstitution?.name || 'SCHOOL LOGO'}</h2>
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mx-auto"></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tight">{printingPrefect.name}</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Class Prefect Card</p>
                            <p className="text-xs font-black uppercase text-indigo-600 mt-1">Stream: {courses.find(c => c.id === printingPrefect.courseId)?.name || 'Class'}</p>
                        </div>
                        
                        {/* Generates high-quality physical QR code */}
                        <div className="mx-auto w-[160px] h-[160px] border-2 border-slate-100 p-2 rounded-2xl flex items-center justify-center bg-white">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`prefect_remedial_token_class_${printingPrefect.courseId}`)}`}
                                alt="Prefect Validation QR"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <p className="text-[8px] font-mono font-bold text-slate-400">Token ID: prefect_remedial_token_class_{printingPrefect.courseId}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-700 pt-2 border-t border-slate-100">REMEDIAL LESSONS SCAN CARD</p>
                    </div>
                </div>
            )}

            {/* MANUAL LOG SESSION MODAL */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Manually Log approved Remedial</h3>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleManualLog} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Teacher</label>
                                <select 
                                    value={manualTeacherId}
                                    onChange={e => setManualTeacherId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                >
                                    <option value="">-- Select Teacher --</option>
                                    {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                                <select 
                                    value={manualSubjectId}
                                    onChange={e => setManualSubjectId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                >
                                    <option value="">-- Select Subject --</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Class Stream</label>
                                    <select 
                                        value={manualCourseId}
                                        onChange={e => setManualCourseId(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                    >
                                        <option value="">-- Select Stream --</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Class Prefect</label>
                                    <select 
                                        value={manualPrefectId}
                                        onChange={e => setManualPrefectId(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                    >
                                        <option value="">-- Select Prefect --</option>
                                        {prefectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Hours</label>
                                    <input 
                                        type="number"
                                        value={manualHours}
                                        onChange={e => setManualHours(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Date</label>
                                    <input 
                                        type="date"
                                        value={manualDate}
                                        onChange={e => setManualDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none dark:text-white font-mono"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all mt-4"
                            >
                                Log & Approve Hours
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
