import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Plus, Trash, CheckCircle, XCircle, DollarSign, BookOpen, User, Users, 
    Clipboard, Clock, Award, Calendar, Layers, ShieldCheck, AlertCircle, FileText
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { syncEngine } from '../../services/syncEngine';
import type { User as AppUser } from '../../types';

interface BeautyCollegeManagerProps {
    currentUser: AppUser;
    currentInstitution: any;
    onRefreshData?: () => void;
    activeTab?: 'dashboard' | 'students' | 'courses' | 'finance' | 'practicals' | 'trainers';
}

export const BeautyCollegeManager: React.FC<BeautyCollegeManagerProps> = ({ 
    currentUser, 
    currentInstitution,
    onRefreshData,
    activeTab: externalTab
}) => {
    const [internalTab, setInternalTab] = useState<'dashboard' | 'students' | 'courses' | 'finance' | 'practicals' | 'trainers'>('dashboard');
    const activeTab = externalTab || internalTab;
    const setActiveTab = (tab: any) => setInternalTab(tab);
    const [loading, setLoading] = useState(true);

    // Module Data States
    const [students, setStudents] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [trainers, setTrainers] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [practicals, setPracticals] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<AppUser[]>([]);

    // Modal Toggles & Forms
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [studentForm, setStudentForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        courseId: '',
        userId: ''
    });

    const [showCourseModal, setShowCourseModal] = useState(false);
    const [courseForm, setCourseForm] = useState({
        code: '',
        name: '',
        description: '',
        baseFee: 0,
        kitFee: 0,
        examFee: 0,
        practicalHoursRequired: 20
    });

    const [showTrainerModal, setShowTrainerModal] = useState(false);
    const [trainerForm, setTrainerForm] = useState({
        name: '',
        phone: '',
        email: '',
        specialization: '',
        userId: ''
    });

    const [showPaymentModal, setShowPaymentModal] = useState<any>(null); // holds target invoice
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        paymentMethod: 'M-Pesa',
        transactionReference: ''
    });

    const [showPracticalModal, setShowPracticalModal] = useState(false);
    const [practicalForm, setPracticalForm] = useState({
        studentId: '',
        trainerId: '',
        sessionDate: new Date().toISOString().split('T')[0],
        hours: 2,
        topic: '',
        notes: ''
    });

    const instId = currentInstitution?.id || 'GLOBAL';

    // Fetch Module Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                studentsData, 
                coursesData, 
                trainersData, 
                invoicesData, 
                paymentsData, 
                practicalsData,
                allUsers
            ] = await Promise.all([
                apiService.fetchModuleRecords('bc_students', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_courses', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_trainers', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_invoices', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_payments', instId).catch(() => []),
                apiService.fetchModuleRecords('bc_practicals', instId).catch(() => []),
                apiService.fetchModuleRecords('users', instId).catch(() => [])
            ]);

            setStudents(studentsData || []);
            setCourses((coursesData || []).filter((c: any) => c.isActive !== false));
            setTrainers(trainersData || []);
            setInvoices(invoicesData || []);
            setPayments(paymentsData || []);
            setPracticals(practicalsData || []);
            setUsersList(allUsers || []);
        } catch (error) {
            console.error('[BeautyCollegeManager] Failed to load registry:', error);
        } finally {
            setLoading(false);
        }
    }, [instId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Financial Metrics
    const metrics = useMemo(() => {
        const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
        const totalHours = practicals.reduce((sum, p) => sum + Number(p.hours || 0), 0);
        return {
            totalCollected,
            totalOutstanding,
            totalHours,
            totalStudents: students.length,
            activeCourses: courses.length
        };
    }, [students, courses, invoices, payments, practicals]);

    // Register Student & Auto-Billing
    const handleRegisterStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedCourse = courses.find(c => c.id === studentForm.courseId);
        if (!selectedCourse) {
            alert('Please select a valid course package.');
            return;
        }

        const studentId = `std_${Date.now()}`;
        const newStudent = {
            id: studentId,
            institutionId: instId,
            userId: studentForm.userId || null,
            fullName: studentForm.fullName,
            email: studentForm.email,
            phone: studentForm.phone,
            courseId: selectedCourse.id,
            kitIssuedStatus: 'Pending',
            practicalHoursCompleted: 0,
            status: 'Enrolled',
            enrollmentDate: new Date().toISOString().split('T')[0]
        };

        // Create initial invoice
        const tuition = Number(selectedCourse.baseFee || 0);
        const kit = Number(selectedCourse.kitFee || 0);
        const exam = Number(selectedCourse.examFee || 0);
        const totalAmount = tuition + kit + exam;

        const invoiceId = `inv_${Date.now()}`;
        const invoiceNum = `BC-INV-${Math.floor(100000 + Math.random() * 900000)}`;
        const initialInvoice = {
            id: invoiceId,
            institutionId: instId,
            studentId,
            studentName: studentForm.fullName,
            courseId: selectedCourse.id,
            items: [
                { desc: 'Tuition Fee', amount: tuition },
                { desc: 'Beauty Starter Kit', amount: kit },
                { desc: 'Exam Registration', amount: exam }
            ],
            totalAmount,
            paidAmount: 0,
            balance: totalAmount,
            status: 'Pending',
            invoiceNumber: invoiceNum,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days due
            notes: `Initial Enrollment Invoice for ${selectedCourse.name}`
        };

        try {
            await apiService.saveModuleRecord('bc_students', newStudent);
            await syncEngine.queueMutation('INSERT', 'bc_students', newStudent).catch(() => {});

            await apiService.saveModuleRecord('bc_invoices', initialInvoice);
            await syncEngine.queueMutation('INSERT', 'bc_invoices', initialInvoice).catch(() => {});

            setShowStudentModal(false);
            setStudentForm({ fullName: '', email: '', phone: '', courseId: '', userId: '' });
            fetchData();
            if (onRefreshData) onRefreshData();
            alert('Student enrolled and invoice generated successfully!');
        } catch (error) {
            console.error('Failed to register student:', error);
            alert('Enrollment failed.');
        }
    };

    // Add Course
    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        const courseId = `crs_${Date.now()}`;
        const newCourse = {
            id: courseId,
            institutionId: instId,
            code: courseForm.code,
            name: courseForm.name,
            description: courseForm.description,
            baseFee: Number(courseForm.baseFee),
            kitFee: Number(courseForm.kitFee),
            examFee: Number(courseForm.examFee),
            practicalHoursRequired: Number(courseForm.practicalHoursRequired),
            isActive: true
        };

        try {
            await apiService.saveModuleRecord('bc_courses', newCourse);
            await syncEngine.queueMutation('INSERT', 'bc_courses', newCourse).catch(() => {});
            setShowCourseModal(false);
            setCourseForm({ code: '', name: '', description: '', baseFee: 0, kitFee: 0, examFee: 0, practicalHoursRequired: 20 });
            fetchData();
        } catch (error) {
            console.error('Failed to create course:', error);
        }
    };

    // Add Trainer
    const handleAddTrainer = async (e: React.FormEvent) => {
        e.preventDefault();
        const trainerId = `trn_${Date.now()}`;
        const newTrainer = {
            id: trainerId,
            institutionId: instId,
            userId: trainerForm.userId || null,
            name: trainerForm.name,
            phone: trainerForm.phone,
            email: trainerForm.email,
            specialization: trainerForm.specialization,
            status: 'Active'
        };

        try {
            await apiService.saveModuleRecord('bc_trainers', newTrainer);
            await syncEngine.queueMutation('INSERT', 'bc_trainers', newTrainer).catch(() => {});
            setShowTrainerModal(false);
            setTrainerForm({ name: '', phone: '', email: '', specialization: '', userId: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to save trainer:', error);
        }
    };

    // Record Payment
    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPaymentModal) return;
        const targetInvoice = showPaymentModal;

        const payAmt = Number(paymentForm.amount);
        if (payAmt <= 0 || payAmt > targetInvoice.balance) {
            alert('Please enter a valid payment amount not exceeding current balance.');
            return;
        }

        const paymentId = `pay_${Date.now()}`;
        const receiptNum = `BC-REC-${Math.floor(100000 + Math.random() * 900000)}`;

        const newPayment = {
            id: paymentId,
            institutionId: instId,
            invoiceId: targetInvoice.id,
            studentId: targetInvoice.studentId,
            studentName: targetInvoice.studentName,
            amount: payAmt,
            paymentMethod: paymentForm.paymentMethod,
            transactionReference: paymentForm.transactionReference,
            paymentDate: new Date().toISOString(),
            receiptNumber: receiptNum,
            receivedBy: currentUser.name
        };

        const updatedInvoice = {
            ...targetInvoice,
            paidAmount: Number(targetInvoice.paidAmount || 0) + payAmt,
            balance: Number(targetInvoice.balance) - payAmt,
            status: Number(targetInvoice.balance) - payAmt === 0 ? 'Paid' : 'Partial'
        };

        try {
            await apiService.saveModuleRecord('bc_payments', newPayment);
            await syncEngine.queueMutation('INSERT', 'bc_payments', newPayment).catch(() => {});

            await apiService.saveModuleRecord('bc_invoices', updatedInvoice);
            await syncEngine.queueMutation('UPDATE', 'bc_invoices', updatedInvoice).catch(() => {});

            setShowPaymentModal(null);
            setPaymentForm({ amount: 0, paymentMethod: 'M-Pesa', transactionReference: '' });
            fetchData();
            if (onRefreshData) onRefreshData();
            alert('Payment recorded successfully!');
        } catch (error) {
            console.error('Payment saving failed:', error);
        }
    };

    // Log Practical session
    const handleLogPractical = async (e: React.FormEvent) => {
        e.preventDefault();
        const practicalId = `prc_${Date.now()}`;
        const newPractical = {
            id: practicalId,
            institutionId: instId,
            studentId: practicalForm.studentId,
            trainerId: practicalForm.trainerId || null,
            sessionDate: practicalForm.sessionDate,
            hours: Number(practicalForm.hours),
            topic: practicalForm.topic,
            status: 'Completed',
            notes: practicalForm.notes
        };

        // Update student progress hours
        const student = students.find(s => s.id === practicalForm.studentId);
        if (student) {
            const updatedStudent = {
                ...student,
                practicalHoursCompleted: Number(student.practicalHoursCompleted || 0) + Number(practicalForm.hours)
            };
            try {
                await apiService.saveModuleRecord('bc_students', updatedStudent);
                await syncEngine.queueMutation('UPDATE', 'bc_students', updatedStudent).catch(() => {});
            } catch (err) {
                console.error("Student practical hours update failed", err);
            }
        }

        try {
            await apiService.saveModuleRecord('bc_practicals', newPractical);
            await syncEngine.queueMutation('INSERT', 'bc_practicals', newPractical).catch(() => {});
            setShowPracticalModal(false);
            setPracticalForm({ studentId: '', trainerId: '', sessionDate: new Date().toISOString().split('T')[0], hours: 2, topic: '', notes: '' });
            fetchData();
        } catch (error) {
            console.error('Practical session log failed:', error);
        }
    };

    // Toggle Kit issued status
    const handleToggleKitStatus = async (student: any) => {
        const nextStatus = student.kitIssuedStatus === 'Pending' ? 'Issued' : 'Pending';
        const updated = { ...student, kitIssuedStatus: nextStatus };
        try {
            await apiService.saveModuleRecord('bc_students', updated);
            await syncEngine.queueMutation('UPDATE', 'bc_students', updated).catch(() => {});
            fetchData();
        } catch (error) {
            console.error('Failed to toggle kit status:', error);
        }
    };

    return (
        <div className="w-full space-y-8">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Layers className="w-8 h-8 text-indigo-600 animate-pulse" /> Beauty College Management
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        Tuition Packages, Starter Kit Inventories & Academy Practicals
                    </p>
                </div>

                {/* Main Action buttons */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowStudentModal(true)}
                        className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Enroll Student
                    </button>
                    <button
                        onClick={() => setShowPracticalModal(true)}
                        className="px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-355 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <Clock className="w-4 h-4 text-indigo-500" /> Log Practical
                    </button>
                </div>
            </div>

            {/* Switch tabs */}
            {!externalTab && (
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto scrollbar-hide pb-0.5">
                    {(['dashboard', 'students', 'courses', 'finance', 'practicals', 'trainers'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-[10px] uppercase font-black tracking-widest border-b-2 transition-all shrink-0 ${
                                activeTab === tab 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-slate-450 hover:text-slate-600 dark:hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            {/* TAB CONTENTS */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading College Ledger...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in-50 duration-300">
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Total Enrolled</span>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{metrics.totalStudents}</h3>
                                    </div>
                                    <Users className="w-10 h-10 text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-2xl" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Fees Collected</span>
                                        <h3 className="text-3xl font-black text-emerald-500">${metrics.totalCollected.toLocaleString()}</h3>
                                    </div>
                                    <DollarSign className="w-10 h-10 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-2xl" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Outstanding Balance</span>
                                        <h3 className="text-3xl font-black text-rose-500">${metrics.totalOutstanding.toLocaleString()}</h3>
                                    </div>
                                    <DollarSign className="w-10 h-10 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-2xl" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Practical Hours Logged</span>
                                        <h3 className="text-3xl font-black text-indigo-400">{metrics.totalHours} hrs</h3>
                                    </div>
                                    <Clock className="w-10 h-10 text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-2xl" />
                                </div>
                            </div>

                            {/* Informative Banner */}
                            <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl shadow-indigo-600/10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[60px] opacity-40 translate-x-1/3 -translate-y-1/3" />
                                <div className="space-y-2 relative z-10 text-left">
                                    <h4 className="text-2xl font-black uppercase tracking-tight">Structured Course Installments</h4>
                                    <p className="text-xs text-indigo-100 max-w-xl">Enrolling a student automatically assigns the customized tuition, kit, and exam fee parameters. Payment is structured via installments with transparent balance receipts.</p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('students')}
                                    className="px-6 py-3.5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all relative z-10"
                                >
                                    Manage Registry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STUDENTS TAB */}
                    {activeTab === 'students' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in-50 duration-300">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700/60 flex justify-between items-center">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Student Registry</h3>
                            </div>
                            {students.length === 0 ? (
                                <div className="p-16 text-center text-slate-400 font-bold uppercase text-xs">
                                    No beauty students enrolled yet. Get started by enrolling your first student above.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900 text-[8px] font-black uppercase text-slate-450 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-6">Student Name</th>
                                                <th className="p-6">Contact Info</th>
                                                <th className="p-6">Enrolled Course</th>
                                                <th className="p-6 text-center">Kit Status</th>
                                                <th className="p-6 text-center">Practicals Progress</th>
                                                <th className="p-6">Joined Date</th>
                                                <th className="p-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-medium">
                                            {students.map(std => {
                                                const course = courses.find(c => c.id === std.courseId);
                                                const totalRequired = course?.practicalHoursRequired || 20;
                                                const percent = Math.min(100, Math.round(((std.practicalHoursCompleted || 0) / totalRequired) * 100));

                                                return (
                                                    <tr key={std.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                        <td className="p-6 font-bold text-slate-900 dark:text-white">{std.fullName}</td>
                                                        <td className="p-6 text-slate-550 dark:text-slate-400">
                                                            <div>{std.phone || 'No phone'}</div>
                                                            <div className="text-[10px] mt-0.5">{std.email}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="inline-block text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                                                {course?.name || 'Unassigned Course'}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <button
                                                                onClick={() => handleToggleKitStatus(std)}
                                                                className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all ${
                                                                    std.kitIssuedStatus === 'Issued'
                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20'
                                                                        : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 animate-pulse'
                                                                }`}
                                                            >
                                                                {std.kitIssuedStatus === 'Issued' ? 'Kit Issued' : 'Kit Pending'}
                                                            </button>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-3 justify-center min-w-[120px]">
                                                                <span className="text-[10px] font-bold text-slate-405">{std.practicalHoursCompleted || 0} / {totalRequired} hrs</span>
                                                                <div className="w-20 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-slate-500">{new Date(std.enrollmentDate).toLocaleDateString()}</td>
                                                        <td className="p-6 text-right">
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Are you sure you want to remove this student?')) {
                                                                        await apiService.deleteModuleRecord('bc_students', std.id);
                                                                        await syncEngine.queueMutation('DELETE', 'bc_students', { id: std.id }).catch(() => {});
                                                                        fetchData();
                                                                    }
                                                                }}
                                                                className="p-2 bg-slate-50 hover:bg-red-50 dark:bg-slate-900 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* COURSES TAB */}
                    {activeTab === 'courses' && (
                        <div className="space-y-6 animate-in fade-in-50 duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Active Course Packages</h3>
                                <button
                                    onClick={() => setShowCourseModal(true)}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                                >
                                    Add Course Package
                                </button>
                            </div>

                            {courses.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border p-12 text-center text-slate-400 font-bold uppercase text-xs">
                                    No beauty packages registered yet. Setup nail, makeup, or hair courses.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {courses.map(course => (
                                        <div key={course.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="text-left">
                                                    <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest">{course.code}</span>
                                                    <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">{course.name}</h4>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm('Deactivate this package?')) {
                                                            const updated = { ...course, isActive: false };
                                                            await apiService.saveModuleRecord('bc_courses', updated);
                                                            await syncEngine.queueMutation('UPDATE', 'bc_courses', updated).catch(() => {});
                                                            fetchData();
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-slate-400 text-xs min-h-[40px] text-left">{course.description || 'No description provided.'}</p>
                                            
                                            <div className="pt-4 border-t border-slate-50 dark:border-slate-700/60 space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-450">Tuition Fee:</span>
                                                    <span className="font-extrabold text-slate-900 dark:text-white">${course.baseFee}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-455">Beauty Kit:</span>
                                                    <span className="font-extrabold text-slate-900 dark:text-white">${course.kitFee}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-455">Exam Fee:</span>
                                                    <span className="font-extrabold text-slate-900 dark:text-white">${course.examFee}</span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t border-slate-50 border-dashed dark:border-slate-700/60">
                                                    <span className="text-slate-450 font-bold">Required Practicals:</span>
                                                    <span className="font-black text-indigo-500">{course.practicalHoursRequired} hrs</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FINANCE TAB */}
                    {activeTab === 'finance' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-stretch animate-in fade-in-50 duration-300">
                            {/* Invoices List */}
                            <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-8 border-b border-slate-50 dark:border-slate-700/60">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Course Invoices</h3>
                                </div>
                                {invoices.length === 0 ? (
                                    <div className="p-16 text-center text-slate-400 font-bold uppercase text-xs">
                                        No billing ledger found.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                    <th className="p-6">Invoice No</th>
                                                    <th className="p-6">Student Name</th>
                                                    <th className="p-6 text-right">Total</th>
                                                    <th className="p-6 text-right">Paid</th>
                                                    <th className="p-6 text-right">Balance</th>
                                                    <th className="p-6 text-center">Status</th>
                                                    <th className="p-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                                                {invoices.map(inv => (
                                                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                        <td className="p-6 font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                                                        <td className="p-6 text-slate-600 dark:text-slate-300 font-bold">{inv.studentName}</td>
                                                        <td className="p-6 text-right font-bold text-slate-500">${inv.totalAmount}</td>
                                                        <td className="p-6 text-right font-bold text-emerald-500">${inv.paidAmount || 0}</td>
                                                        <td className="p-6 text-right font-bold text-rose-500">${inv.balance}</td>
                                                        <td className="p-6 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                                inv.status === 'Paid' 
                                                                    ? 'bg-emerald-50 text-emerald-600' 
                                                                    : inv.status === 'Partial' 
                                                                    ? 'bg-amber-50 text-amber-600' 
                                                                    : 'bg-rose-50 text-rose-600'
                                                            }`}>
                                                                {inv.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            {inv.balance > 0 && (
                                                                <button
                                                                    onClick={() => setShowPaymentModal(inv)}
                                                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[8px] uppercase tracking-wider"
                                                                >
                                                                    Pay
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Recent Payments Feed */}
                            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm p-8 flex flex-col justify-between text-left">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Recent Payments</h3>
                                    {payments.length === 0 ? (
                                        <p className="text-slate-400 text-xs italic text-center py-12">No transactions recorded yet.</p>
                                    ) : (
                                        <div className="space-y-5 overflow-y-auto max-h-[400px] pr-2">
                                            {payments.map(pay => (
                                                <div key={pay.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-805 flex justify-between items-center text-xs">
                                                    <div>
                                                        <div className="font-extrabold text-slate-900 dark:text-white">{pay.studentName}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1">{pay.receiptNumber} • {pay.paymentMethod}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-black text-emerald-500 text-sm">+${pay.amount}</span>
                                                        <div className="text-[9px] text-slate-400 mt-1">{new Date(pay.paymentDate).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PRACTICALS TAB */}
                    {activeTab === 'practicals' && (
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in-50 duration-300">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700/60">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Practical Hours Log</h3>
                            </div>
                            {practicals.length === 0 ? (
                                <div className="p-16 text-center text-slate-400 font-bold uppercase text-xs">
                                    No practical sessions logged yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-6">Student Name</th>
                                                <th className="p-6">Trainer</th>
                                                <th className="p-6">Date</th>
                                                <th className="p-6">Topic / Area</th>
                                                <th className="p-6 text-center">Duration</th>
                                                <th className="p-6">Notes</th>
                                                <th className="p-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                                            {practicals.map(prac => {
                                                const student = students.find(s => s.id === prac.studentId);
                                                const trainer = trainers.find(t => t.id === prac.trainerId);
                                                return (
                                                    <tr key={prac.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                        <td className="p-6 font-bold text-slate-900 dark:text-white">{student?.fullName || 'Unknown Student'}</td>
                                                        <td className="p-6 text-slate-600 dark:text-slate-350 font-bold">{trainer?.name || 'Unassigned Trainer'}</td>
                                                        <td className="p-6 text-slate-500">{new Date(prac.sessionDate).toLocaleDateString()}</td>
                                                        <td className="p-6 font-extrabold text-indigo-600 dark:text-indigo-400">{prac.topic}</td>
                                                        <td className="p-6 text-center font-bold">{prac.hours} hrs</td>
                                                        <td className="p-6 text-slate-400 italic max-w-xs truncate" title={prac.notes}>{prac.notes || 'None'}</td>
                                                        <td className="p-6 text-right">
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Delete this practical log? Hours progress will be adjusted.')) {
                                                                        if (student) {
                                                                            const updatedStudent = {
                                                                                ...student,
                                                                                practicalHoursCompleted: Math.max(0, Number(student.practicalHoursCompleted || 0) - Number(prac.hours))
                                                                            };
                                                                            await apiService.saveModuleRecord('bc_students', updatedStudent);
                                                                            await syncEngine.queueMutation('UPDATE', 'bc_students', updatedStudent).catch(() => {});
                                                                        }
                                                                        await apiService.deleteModuleRecord('bc_practicals', prac.id);
                                                                        await syncEngine.queueMutation('DELETE', 'bc_practicals', { id: prac.id }).catch(() => {});
                                                                        fetchData();
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-500"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TRAINERS TAB */}
                    {activeTab === 'trainers' && (
                        <div className="space-y-6 animate-in fade-in-50 duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Academy Training Staff</h3>
                                <button
                                    onClick={() => setShowTrainerModal(true)}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                                >
                                    Add Trainer
                                </button>
                            </div>

                            {trainers.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border p-12 text-center text-slate-400 font-bold uppercase text-xs">
                                    No beauty trainers registered yet. Add trainers to log practicals.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {trainers.map(trn => (
                                        <div key={trn.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex gap-4 items-center text-left">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg">
                                                {trn.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-slate-900 dark:text-white">{trn.name}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{trn.specialization || 'General Beauty Trainer'}</p>
                                                <div className="text-[9px] text-slate-400 mt-1 font-bold">{trn.email} • {trn.phone}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ENROLL STUDENT MODAL */}
            {showStudentModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in-50 duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-750 shadow-2xl relative text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Enroll New Student</h3>
                        
                        <form onSubmit={handleRegisterStudent} className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-450 tracking-wider mb-2">Select Course Package</label>
                                <select
                                    required
                                    value={studentForm.courseId}
                                    onChange={(e) => setStudentForm(prev => ({ ...prev, courseId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs font-bold"
                                >
                                    <option value="">-- Choose Course --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} (${Number(c.baseFee) + Number(c.kitFee) + Number(c.examFee)})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Student Full Name</label>
                                <input
                                    required
                                    type="text"
                                    value={studentForm.fullName}
                                    onChange={(e) => setStudentForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={studentForm.email}
                                    onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Phone Number</label>
                                <input
                                    type="text"
                                    value={studentForm.phone}
                                    onChange={(e) => setStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="e.g. +254..."
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Link User Account (Optional)</label>
                                <select
                                    value={studentForm.userId}
                                    onChange={(e) => setStudentForm(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                >
                                    <option value="">-- No Account Link --</option>
                                    {usersList.filter(u => u.role === 'student').map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowStudentModal(false)}
                                    className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-650 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-slate-250 dark:border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-600/10"
                                >
                                    Enroll
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD COURSE MODAL */}
            {showCourseModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in-50 duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-750 shadow-2xl relative text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Create Beauty Package</h3>
                        
                        <form onSubmit={handleAddCourse} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Course Code</label>
                                    <input
                                        required
                                        type="text"
                                        value={courseForm.code}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, code: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                        placeholder="e.g. NAIL-101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Package Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={courseForm.name}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                        placeholder="e.g. Nail Tech Pro"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Description</label>
                                <textarea
                                    value={courseForm.description}
                                    onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs min-h-[80px]"
                                    placeholder="Enter course modules details..."
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[8px] font-black uppercase text-slate-455 tracking-wider mb-1.5">Tuition ($)</label>
                                    <input
                                        required
                                        type="number"
                                        value={courseForm.baseFee}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, baseFee: Number(e.target.value) }))}
                                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black uppercase text-slate-455 tracking-wider mb-1.5">Starter Kit ($)</label>
                                    <input
                                        required
                                        type="number"
                                        value={courseForm.kitFee}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, kitFee: Number(e.target.value) }))}
                                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black uppercase text-slate-455 tracking-wider mb-1.5">Exams ($)</label>
                                    <input
                                        required
                                        type="number"
                                        value={courseForm.examFee}
                                        onChange={(e) => setCourseForm(prev => ({ ...prev, examFee: Number(e.target.value) }))}
                                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Required Practical Hours</label>
                                <input
                                    required
                                    type="number"
                                    value={courseForm.practicalHoursRequired}
                                    onChange={(e) => setCourseForm(prev => ({ ...prev, practicalHoursRequired: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowCourseModal(false)}
                                    className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECORD PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in-50 duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-750 shadow-2xl relative text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Record Payment</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Invoice: {showPaymentModal.invoiceNumber} • Outstanding: ${showPaymentModal.balance}</p>
                        
                        <form onSubmit={handleRecordPayment} className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Amount Paid ($)</label>
                                <input
                                    required
                                    type="number"
                                    max={showPaymentModal.balance}
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs font-bold text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Payment Method</label>
                                <select
                                    value={paymentForm.paymentMethod}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs font-bold"
                                >
                                    <option value="M-Pesa">M-Pesa</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Transaction Reference / Code</label>
                                <input
                                    type="text"
                                    value={paymentForm.transactionReference}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionReference: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="e.g. RGX993J"
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(null)}
                                    className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/10"
                                >
                                    Submit Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LOG PRACTICAL MODAL */}
            {showPracticalModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in-50 duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-750 shadow-2xl relative text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Log Practical Session</h3>
                        
                        <form onSubmit={handleLogPractical} className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Select Student</label>
                                <select
                                    required
                                    value={practicalForm.studentId}
                                    onChange={(e) => setPracticalForm(prev => ({ ...prev, studentId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                >
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Assigned Trainer</label>
                                <select
                                    value={practicalForm.trainerId}
                                    onChange={(e) => setPracticalForm(prev => ({ ...prev, trainerId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                >
                                    <option value="">-- Choose Trainer --</option>
                                    {trainers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Session Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={practicalForm.sessionDate}
                                        onChange={(e) => setPracticalForm(prev => ({ ...prev, sessionDate: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Duration (Hours)</label>
                                    <input
                                        required
                                        type="number"
                                        value={practicalForm.hours}
                                        onChange={(e) => setPracticalForm(prev => ({ ...prev, hours: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-2xl text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Session Topic</label>
                                <input
                                    required
                                    type="text"
                                    value={practicalForm.topic}
                                    onChange={(e) => setPracticalForm(prev => ({ ...prev, topic: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="e.g. Acrylic Sculpting, Bridal Makeup"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Trainer's Assessment Notes</label>
                                <textarea
                                    value={practicalForm.notes}
                                    onChange={(e) => setPracticalForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-2xl text-xs min-h-[60px]"
                                    placeholder="Describe skills practiced, strengths or weaknesses..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowPracticalModal(false)}
                                    className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-650 rounded-2xl font-black text-[9px] uppercase tracking-widest border"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-500/10"
                                >
                                    Log Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD TRAINER MODAL */}
            {showTrainerModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in-50 duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-750 shadow-2xl relative text-left">
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-6">Register Beauty Trainer</h3>
                        
                        <form onSubmit={handleAddTrainer} className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Trainer Full Name</label>
                                <input
                                    required
                                    type="text"
                                    value={trainerForm.name}
                                    onChange={(e) => setTrainerForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={trainerForm.email}
                                    onChange={(e) => setTrainerForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Phone Number</label>
                                <input
                                    type="text"
                                    value={trainerForm.phone}
                                    onChange={(e) => setTrainerForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="e.g. +254..."
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Specialization Area</label>
                                <input
                                    type="text"
                                    value={trainerForm.specialization}
                                    onChange={(e) => setTrainerForm(prev => ({ ...prev, specialization: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                    placeholder="e.g. Nails, Cosmetology, Hair"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-455 tracking-wider mb-2">Link User Account (Optional)</label>
                                <select
                                    value={trainerForm.userId}
                                    onChange={(e) => setTrainerForm(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs"
                                >
                                    <option value="">-- No Account Link --</option>
                                    {usersList.filter(u => u.role === 'teacher').map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowTrainerModal(false)}
                                    className="flex-1 py-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 text-slate-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg"
                                >
                                    Register
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
