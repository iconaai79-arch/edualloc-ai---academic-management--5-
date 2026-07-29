import React, { useState, useEffect, useMemo } from 'react';
import type { User, Course, Subject, RemedialSession, RemedialRateSetting, RemedialPayout, Invoice, RemedialAllocation } from '../types';
import { apiService } from '../services/apiService';
import { 
    Clock, Plus, Check, CheckCircle2, CreditCard, Printer, QrCode, Search, 
    DollarSign, AlertCircle, Trash2, Shield, Eye, Award, BookOpen, Layers, UserCheck,
    Globe, Copy, ExternalLink, Sparkles, Calendar, RefreshCw, X
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
    const [allocations, setAllocations] = useState<RemedialAllocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sessions' | 'allocations' | 'payouts' | 'billing' | 'rates' | 'portal_hub'>('sessions');
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'In Progress' | 'Prefect Confirmed' | 'Approved' | 'Paid'>('all');
    const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>('All');
    
    // Rates Form State
    const [hourlyRate, setHourlyRate] = useState<number>(1000);
    const [weekdayHourlyRate, setWeekdayHourlyRate] = useState<number>(1000);
    const [weekendHourlyRate, setWeekendHourlyRate] = useState<number>(1500);
    const [weekdayStartTime, setWeekdayStartTime] = useState<string>('16:00');
    const [weekdayEndTime, setWeekdayEndTime] = useState<string>('18:00');
    const [weekendStartTime, setWeekendStartTime] = useState<string>('08:00');
    const [weekendEndTime, setWeekendEndTime] = useState<string>('12:00');
    const [maxLessonsPerDay, setMaxLessonsPerDay] = useState<number>(1);
    const [feePerStudent, setFeePerStudent] = useState<number>(200);
    const [termFee, setTermFee] = useState<number>(3000);

    // Manual Allocation Modal State
    const [showAllocModal, setShowAllocModal] = useState(false);
    const [allocCourseId, setAllocCourseId] = useState('');
    const [allocSubjectId, setAllocSubjectId] = useState('');
    const [allocTeacherId, setAllocTeacherId] = useState('');
    const [allocDay, setAllocDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'>('Monday');
    const [allocStartTime, setAllocStartTime] = useState('16:00');
    const [allocEndTime, setAllocEndTime] = useState('18:00');

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
                apiService.fetchInvoices(institutionId),
            ]);

            // Fetch allocations separately with fallback for older builds
            let allocList: RemedialAllocation[] = [];
            try {
                if (typeof (apiService as any).fetchRemedialAllocations === 'function') {
                    allocList = await (apiService as any).fetchRemedialAllocations(institutionId) || [];
                }
            } catch {
                allocList = [];
            }

            setSessions(sessList || []);
            setInvoices(invList || []);
            setPayouts(payList || []);
            setAllocations(allocList);

            if (rates && rates.length > 0) {
                setRateSetting(rates[0]);
                setHourlyRate(rates[0].hourlyRate || 1000);
                setWeekdayHourlyRate(rates[0].weekdayHourlyRate ?? rates[0].hourlyRate ?? 1000);
                setWeekendHourlyRate(rates[0].weekendHourlyRate ?? 1500);
                setWeekdayStartTime(rates[0].weekdayStartTime || '16:00');
                setWeekdayEndTime(rates[0].weekdayEndTime || '18:00');
                setWeekendStartTime(rates[0].weekendStartTime || '08:00');
                setWeekendEndTime(rates[0].weekendEndTime || '12:00');
                setMaxLessonsPerDay(rates[0].maxLessonsPerDay ?? 1);
                setFeePerStudent(rates[0].feePerStudent || 200);
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
                hourlyRate: weekdayHourlyRate,
                weekdayHourlyRate,
                weekendHourlyRate,
                weekdayStartTime,
                weekdayEndTime,
                weekendStartTime,
                weekendEndTime,
                maxLessonsPerDay,
                feePerStudent,
                termFee,
                institutionId
            };
            await apiService.saveRemedialRateSetting(data);
            onLogAction?.(`Updated Remedial Rates & Rules: Weekday Rate KES ${weekdayHourlyRate}, Weekend Rate KES ${weekendHourlyRate}, Max Lessons/Day ${maxLessonsPerDay}`);
            alert('Remedial rates and rules updated successfully!');
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

        // Daily Lesson Limit Check
        const manualDateObj = new Date(manualDate);
        const dayStr = manualDateObj.toDateString();
        const existingTeacherSessionsOnDate = sessions.filter(s => {
            return s.teacherId === manualTeacherId && new Date(s.startTime).toDateString() === dayStr;
        });

        if (existingTeacherSessionsOnDate.length >= maxLessonsPerDay) {
            return alert(`Daily Quota Exceeded: Teacher has already reached the maximum limit of ${maxLessonsPerDay} remedial lesson(s) allowed per day on ${manualDate}.`);
        }

        try {
            const teacher = users.find(u => u.id === manualTeacherId);
            const subject = subjects.find(s => s.id === manualSubjectId);
            const course = courses.find(c => c.id === manualCourseId);
            const prefect = users.find(u => u.id === manualPrefectId);

            const isWeekend = [0, 6].includes(manualDateObj.getDay());
            const defaultStart = isWeekend ? (weekendStartTime || '08:00') : (weekdayStartTime || '16:00');
            const startTime = new Date(`${manualDate}T${defaultStart}:00`).toISOString();
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

    // Manual Allocation Handler
    const handleCreateManualAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allocCourseId || !allocSubjectId || !allocTeacherId) {
            return alert('Please select class stream, subject, and teacher.');
        }

        try {
            const course = courses.find(c => c.id === allocCourseId);
            const subject = subjects.find(s => s.id === allocSubjectId);
            const teacher = users.find(u => u.id === allocTeacherId);
            const isWeekend = ['Saturday', 'Sunday'].includes(allocDay);

            const newAlloc: RemedialAllocation = {
                id: `rem_alloc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                courseId: allocCourseId,
                className: course?.name || 'Class',
                subjectId: allocSubjectId,
                subjectName: subject?.name || 'Subject',
                teacherId: allocTeacherId,
                teacherName: teacher?.name || 'Teacher',
                dayOfWeek: allocDay,
                startTime: allocStartTime,
                endTime: allocEndTime,
                isWeekend,
                createdAt: new Date().toISOString(),
                institutionId
            };

            if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                await (apiService as any).saveRemedialAllocation(newAlloc);
            } else {
                await apiService.saveModuleRecord('school_remedial_allocations', newAlloc);
            }
            onLogAction?.(`Allocated remedial ${subject?.name} for ${course?.name} to ${teacher?.name} on ${allocDay}`);
            alert('Remedial allocation saved successfully!');
            setShowAllocModal(false);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to save allocation');
        }
    };

    // Auto-Generate Timetable Engine
    const handleAutoGenerateTimetable = async () => {
        if (courses.length === 0 || subjects.length === 0 || teachersList.length === 0) {
            return alert('Insufficient data to auto-generate remedial timetable. Please ensure classes, subjects, and teachers are registered.');
        }

        if (!window.confirm(`Auto-generate balanced weekly remedial timetable for ${courses.length} class(es)? This will auto-assign subjects and teachers to weekday/weekend slots respecting configured rules.`)) {
            return;
        }

        try {
            setLoading(true);
            const newAllocations: RemedialAllocation[] = [];
            const daysOfWeek: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
                'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
            ];

            const teacherDailyCount: Record<string, Record<string, number>> = {};
            teachersList.forEach(t => {
                teacherDailyCount[t.id] = {};
                daysOfWeek.forEach(day => {
                    teacherDailyCount[t.id][day] = 0;
                });
            });

            let teacherIdx = 0;

            for (const course of courses) {
                for (let subIdx = 0; subIdx < Math.min(subjects.length, 7); subIdx++) {
                    const subject = subjects[subIdx];
                    const day = daysOfWeek[subIdx % daysOfWeek.length];
                    const isWeekend = ['Saturday', 'Sunday'].includes(day);
                    const startTime = isWeekend ? (weekendStartTime || '08:00') : (weekdayStartTime || '16:00');
                    const endTime = isWeekend ? (weekendEndTime || '18:00') : (weekdayEndTime || '18:00');

                    let assignedTeacher: User | null = null;
                    for (let attempt = 0; attempt < teachersList.length; attempt++) {
                        const candidate = teachersList[(teacherIdx + attempt) % teachersList.length];
                        const currentCount = teacherDailyCount[candidate.id]?.[day] || 0;
                        if (currentCount < maxLessonsPerDay) {
                            assignedTeacher = candidate;
                            teacherIdx = (teacherIdx + attempt + 1) % teachersList.length;
                            break;
                        }
                    }

                    if (!assignedTeacher) {
                        assignedTeacher = teachersList[teacherIdx % teachersList.length];
                    }

                    teacherDailyCount[assignedTeacher.id][day] = (teacherDailyCount[assignedTeacher.id][day] || 0) + 1;

                    newAllocations.push({
                        id: `rem_alloc_${Date.now()}_${course.id.slice(-4)}_${subject.id.slice(-4)}_${day.slice(0, 3)}_${subIdx}`,
                        courseId: course.id,
                        className: course.name,
                        subjectId: subject.id,
                        subjectName: subject.name,
                        teacherId: assignedTeacher.id,
                        teacherName: assignedTeacher.name,
                        dayOfWeek: day,
                        startTime,
                        endTime,
                        isWeekend,
                        createdAt: new Date().toISOString(),
                        institutionId
                    });
                }
            }

            for (const alloc of newAllocations) {
                if (typeof (apiService as any).saveRemedialAllocation === 'function') {
                    await (apiService as any).saveRemedialAllocation(alloc);
                } else {
                    await apiService.saveModuleRecord('school_remedial_allocations', alloc);
                }
            }

            onLogAction?.(`Auto-generated ${newAllocations.length} remedial lesson allocations across ${courses.length} classes.`);
            alert(`Successfully auto-generated and scheduled ${newAllocations.length} remedial lesson allocations!`);
            loadData();
        } catch (err: any) {
            console.error('Failed to auto-generate timetable', err);
            alert('Failed to auto-generate timetable: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Delete Allocation
    const handleDeleteAllocation = async (allocId: string) => {
        if (!window.confirm('Delete this remedial session allocation?')) return;
        try {
            await apiService.deleteModuleRecord('school_remedial_allocations', allocId);
            onLogAction?.(`Deleted remedial allocation #${allocId}`);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete allocation');
        }
    };

    // Calculate accrued unpaid earnings per teacher (distinguishing weekday vs weekend rates)
    const accruedPayouts = useMemo(() => {
        const unpaidApproved = sessions.filter(s => s.status === 'Approved');
        const grouped: Record<string, { teacherName: string; totalHours: number; totalAmount: number; sessionIds: string[] }> = {};

        unpaidApproved.forEach(s => {
            if (!grouped[s.teacherId]) {
                grouped[s.teacherId] = {
                    teacherName: s.teacherName || 'Unknown Teacher',
                    totalHours: 0,
                    totalAmount: 0,
                    sessionIds: []
                };
            }
            const sHours = s.hours || 1;
            const dayOfWeek = new Date(s.startTime).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const applicableRate = isWeekend
                ? (weekendHourlyRate || 1500)
                : (weekdayHourlyRate || hourlyRate || 1000);

            grouped[s.teacherId].totalHours += sHours;
            grouped[s.teacherId].totalAmount += sHours * applicableRate;
            grouped[s.teacherId].sessionIds.push(s.id);
        });

        return Object.entries(grouped).map(([teacherId, data]) => ({
            teacherId,
            teacherName: data.teacherName,
            totalHours: data.totalHours,
            sessionIds: data.sessionIds,
            rate: Math.round(data.totalAmount / (data.totalHours || 1)),
            totalAmount: data.totalAmount
        }));
    }, [sessions, hourlyRate, weekdayHourlyRate, weekendHourlyRate]);

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
        <>
        <div className="space-y-8 animate-fade-in mt-4">
            
            {/* Futuristic Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            Academic Intervention Control
                        </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase">Remedial Manager</h2>
                    <p className="text-xs text-slate-300 max-w-xl font-medium">
                        Oversee extra lesson verification, automated QR prefect signatures, teacher disbursement calculations, and parent remedial billing.
                    </p>
                </div>
                
                {/* Quick Launcher Action */}
                <div className="relative z-10 flex items-center gap-3 shrink-0">
                    <button 
                        onClick={() => setShowLogModal(true)}
                        className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95 flex items-center gap-2 border border-indigo-400/30"
                    >
                        <Plus className="w-4 h-4" /> Log Extra Hours
                    </button>
                </div>
            </div>

            {/* Main Workspace Layout with Futuristic Vertical Menu */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Futuristic Vertical Menu Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-2.5 sticky top-6">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 mb-2 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation Hub</p>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase mt-0.5">Control Center</h4>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></span>
                        </div>

                        <button 
                            onClick={() => setActiveTab('sessions')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'sessions' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'sessions' ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Remedial Hours</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'sessions' ? 'text-indigo-100' : 'text-slate-400'}`}>Session logs & QR verify</p>
                                </div>
                            </div>
                            {sessions.filter(s => s.status === 'Prefect Confirmed').length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'sessions' ? 'bg-white text-indigo-700' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                }`}>
                                    {sessions.filter(s => s.status === 'Prefect Confirmed').length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('allocations')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'allocations' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'allocations' ? 'bg-white/20 text-white' : 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Subject Allocations</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'allocations' ? 'text-indigo-100' : 'text-slate-400'}`}>Teacher assignments &amp; timetable</p>
                                </div>
                            </div>
                            {allocations.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'allocations' ? 'bg-white text-indigo-700' : 'bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400'
                                }`}>
                                    {allocations.length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('payouts')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'payouts' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'payouts' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Teacher Payouts</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'payouts' ? 'text-indigo-100' : 'text-slate-400'}`}>Accrued pay & sign off</p>
                                </div>
                            </div>
                            {accruedPayouts.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === 'payouts' ? 'bg-white text-indigo-700' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    {accruedPayouts.length}
                                </span>
                            )}
                        </button>

                        <button 
                            onClick={() => setActiveTab('billing')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'billing' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'billing' ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Parent Billing</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'billing' ? 'text-indigo-100' : 'text-slate-400'}`}>Invoicing & term billing</p>
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab('rates')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'rates' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'rates' ? 'bg-white/20 text-white' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Rates & Rules</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'rates' ? 'text-indigo-100' : 'text-slate-400'}`}>Tariffs & configs</p>
                                </div>
                            </div>
                        </button>

                        <button 
                            onClick={() => setActiveTab('portal_hub')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 text-left font-black text-xs uppercase tracking-wider group relative overflow-hidden cursor-pointer ${
                                activeTab === 'portal_hub' 
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`p-2.5 rounded-xl transition-colors ${
                                    activeTab === 'portal_hub' ? 'bg-white/20 text-white' : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform'
                                }`}>
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <span>Portal Hub</span>
                                    <p className={`text-[9px] font-bold lowercase tracking-normal mt-0.5 ${activeTab === 'portal_hub' ? 'text-indigo-100' : 'text-slate-400'}`}>Public link & QR share</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right Main Content Workspace */}
                <div className="lg:col-span-9 min-w-0">

            {/* TAB: ALLOCATIONS & TIMETABLE */}
            {activeTab === 'allocations' && (
                <div className="space-y-6">
                    {/* Header Controls */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-500" /> Remedial Subject Allocations &amp; Weekly Timetable
                            </h4>
                            <p className="text-xs text-slate-500">
                                Assign subjects and teachers manually or auto-generate a weekly remedial timetable respecting weekday/weekend limits.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={handleAutoGenerateTimetable}
                                className="flex-1 md:flex-none px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" /> Auto-Generate Timetable
                            </button>
                            <button
                                onClick={() => setShowAllocModal(true)}
                                className="flex-1 md:flex-none px-5 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Manual Allocation
                            </button>
                        </div>
                    </div>

                    {/* Filter & Print Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Filter Stream:</span>
                            <select
                                value={selectedTimetableClass}
                                onChange={e => setSelectedTimetableClass(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="All">All Classes &amp; Streams ({courses.length})</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" /> Print Timetable Grid
                        </button>
                    </div>

                    {/* Weekly Timetable Grid View */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(day => {
                                const isWeekend = ['Saturday', 'Sunday'].includes(day);
                                const dayAllocations = allocations.filter(a => {
                                    const matchDay = a.dayOfWeek === day;
                                    const matchClass = selectedTimetableClass === 'All' || a.courseId === selectedTimetableClass;
                                    return matchDay && matchClass;
                                });

                                return (
                                    <div 
                                        key={day} 
                                        className={`rounded-2xl p-4 border transition-all ${
                                            isWeekend 
                                                ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/30' 
                                                : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5 mb-3">
                                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{day}</h5>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                isWeekend ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                            }`}>
                                                {dayAllocations.length} session{dayAllocations.length === 1 ? '' : 's'}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {dayAllocations.length === 0 ? (
                                                <p className="text-[10px] text-slate-400 font-medium italic text-center py-6">No lessons scheduled</p>
                                            ) : (
                                                dayAllocations.map(alloc => (
                                                    <div 
                                                        key={alloc.id}
                                                        className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:border-indigo-500/50 transition-all space-y-1.5"
                                                    >
                                                        <div className="flex items-start justify-between gap-1">
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight">{alloc.subjectName}</p>
                                                            <button 
                                                                onClick={() => handleDeleteAllocation(alloc.id)}
                                                                className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors opacity-80 group-hover:opacity-100"
                                                                title="Delete allocation"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{alloc.className}</p>
                                                        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <UserCheck className="w-3 h-3 text-slate-400" /> {alloc.teacherName}
                                                        </p>
                                                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                            <span className="text-[9px] font-mono font-bold text-slate-400">
                                                                {alloc.startTime} - {alloc.endTime}
                                                            </span>
                                                            <span className="text-[8px] font-black uppercase text-slate-400">
                                                                {isWeekend ? 'Weekend Tariff' : 'Weekday Tariff'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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
                    {/* Rates & Rules Form */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl space-y-6">
                        <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-500" /> Remedial Rates, Timing & Rules
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">Configure teacher rates for weekdays vs weekends, session period windows, and daily lesson quotas.</p>
                        </div>

                        <div className="space-y-5">
                            {/* 1. Teacher Hourly Pay Rates (Weekdays vs Weekends) */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5" /> Teacher Hourly Pay Tariffs
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekday Rate (Mon - Fri / hr)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={weekdayHourlyRate}
                                                onChange={e => setWeekdayHourlyRate(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                                placeholder="1000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekend Rate (Sat & Sun / hr)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={weekendHourlyRate}
                                                onChange={e => setWeekendHourlyRate(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                                placeholder="1500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Period Session Timing Windows */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> Session Period Timing Windows
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekday Remedial Window (Start – End)</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                type="time"
                                                value={weekdayStartTime}
                                                onChange={e => setWeekdayStartTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                            <input 
                                                type="time"
                                                value={weekdayEndTime}
                                                onChange={e => setWeekdayEndTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Weekend Remedial Window (Start – End)</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input 
                                                type="time"
                                                value={weekendStartTime}
                                                onChange={e => setWeekendStartTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                            <input 
                                                type="time"
                                                value={weekendEndTime}
                                                onChange={e => setWeekendEndTime(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Daily Lessons Quotas & Limits */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5" /> Daily Lesson Quota Limit
                                </p>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Max Remedial Lessons Per Teacher Per Day</label>
                                    <select 
                                        value={maxLessonsPerDay}
                                        onChange={e => setMaxLessonsPerDay(Number(e.target.value))}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                                    >
                                        <option value={1}>1 Lesson per Day (Default Limit)</option>
                                        <option value={2}>2 Lessons per Day</option>
                                        <option value={3}>3 Lessons per Day</option>
                                        <option value={4}>4 Lessons per Day</option>
                                        <option value={5}>Unlimited / No Restricting Cap</option>
                                    </select>
                                    <p className="text-[9px] text-slate-400 mt-1 font-medium">Prevents teachers or admins from exceeding the configured maximum remedial sessions per day.</p>
                                </div>
                            </div>

                            {/* 4. Parent Fees */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Student Parent Billing Fees
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Fee Per Student (per session)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={feePerStudent}
                                                onChange={e => setFeePerStudent(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Flat Term Fee (Flat fee billed)</label>
                                        <div className="relative group">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
                                            <input 
                                                type="number"
                                                value={termFee}
                                                onChange={e => setTermFee(Number(e.target.value))}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveRates}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Save Remedial Configuration &amp; Rates
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

            {/* TAB: PORTAL HUB */}
            {activeTab === 'portal_hub' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-6 sm:p-8 text-white space-y-4 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                            <div className="space-y-1">
                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-indigo-400" /> Public Remedial Gateway
                                </span>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Remedial Portal Hub</h3>
                                <p className="text-xs text-slate-300 max-w-lg">
                                    Share live portal access for students, parents, teachers, and prefects to verify remedial sessions, track attendance, and process payments.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=remedial-portal`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" /> Open Live Portal
                                </a>
                            </div>
                        </div>

                        {/* Portal Link Box */}
                        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-indigo-300 truncate">
                                    {`${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=remedial-portal`}
                                </span>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const link = `${window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? 'https://portal.eduai.co.ke' : window.location.origin}/?view=remedial-portal`;
                                        try { await navigator.clipboard.writeText(link); alert('Remedial Portal link copied to clipboard!'); } catch (_) {}
                                    }}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy Link
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Portal Hub Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card 1: Student & Parent Gateway */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Student & Parent Portal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Allows parents and students to check scheduled remedial classes, view prefect verification status, and settle remedial fee invoices online.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Role: Parent / Student</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('billing')}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Manage Billing <CreditCard className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Teacher Self-Service Portal */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Teacher & Lecturer Portal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Teachers log remedial sessions, track accrued teaching hours, view payout vouchers, and present QR codes to class prefects for verification.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Role: Teacher / Lecturer</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('payouts')}
                                    className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Manage Payouts <DollarSign className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Card 3: Prefect Verification Terminal */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <QrCode className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Prefect Verification Terminal</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Class prefects scan teacher QR codes or enter digital tokens to confirm extra lesson attendance and validate taught hours.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Role: Class Prefect</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('sessions')}
                                    className="px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Verify Sessions <Clock className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Card 4: Remedial Rates & Settings */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Remedial Rate Configuration</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        Configure hourly teacher pay rates, per-student fees, and fixed term remedial billing parameters.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono text-slate-400">Config & Rates</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('rates')}
                                    className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                    Configure Rates <Layers className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
            </div>

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

        {/* ===== MANUAL ALLOCATION MODAL ===== */}
        {showAllocModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-500" /> Manual Allocation
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Assign a subject & teacher to a specific day slot</p>
                        </div>
                        <button
                            onClick={() => setShowAllocModal(false)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleCreateManualAllocation} className="p-7 space-y-5">
                        {/* Class Stream */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Class / Stream</label>
                            <select
                                value={allocCourseId}
                                onChange={e => setAllocCourseId(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="">-- Select Class Stream --</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Subject</label>
                            <select
                                value={allocSubjectId}
                                onChange={e => setAllocSubjectId(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="">-- Select Subject --</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Teacher */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Teacher</label>
                            <select
                                value={allocTeacherId}
                                onChange={e => setAllocTeacherId(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-600 dark:text-white"
                            >
                                <option value="">-- Select Teacher --</option>
                                {users
                                    .filter(u => u.role === 'lecturer' || u.role === 'teacher')
                                    .map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                                }
                            </select>
                        </div>

                        {/* Day of Week */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Day of Week</label>
                            <div className="grid grid-cols-7 gap-1">
                                {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((short, i) => {
                                    const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
                                    const fullDay = fullDays[i];
                                    const isWeekend = i >= 5;
                                    const isSelected = allocDay === fullDay;
                                    return (
                                        <button
                                            key={fullDay}
                                            type="button"
                                            onClick={() => {
                                                setAllocDay(fullDay);
                                                setAllocStartTime(isWeekend ? (weekendStartTime || '08:00') : (weekdayStartTime || '16:00'));
                                                setAllocEndTime(isWeekend ? (weekendEndTime || '12:00') : (weekdayEndTime || '18:00'));
                                            }}
                                            className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                                                isSelected
                                                    ? isWeekend
                                                        ? 'bg-amber-500 text-white shadow-md'
                                                        : 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >
                                            {short}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Window */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Start Time</label>
                                <input
                                    type="time"
                                    value={allocStartTime}
                                    onChange={e => setAllocStartTime(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold font-mono outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">End Time</label>
                                <input
                                    type="time"
                                    value={allocEndTime}
                                    onChange={e => setAllocEndTime(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold font-mono outline-none focus:border-indigo-600 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Tariff Badge */}
                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                            ['Saturday', 'Sunday'].includes(allocDay)
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
                                : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40'
                        }`}>
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>
                                {['Saturday', 'Sunday'].includes(allocDay)
                                    ? `Weekend Tariff — KES ${weekendHourlyRate?.toLocaleString()}/hr`
                                    : `Weekday Tariff — KES ${weekdayHourlyRate?.toLocaleString()}/hr`
                                }
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAllocModal(false)}
                                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                Save Allocation
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
};
