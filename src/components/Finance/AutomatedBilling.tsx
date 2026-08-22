import React, { useState, useMemo, useEffect } from 'react';
import type { FeeStructure, User, AcademicYear, Semester, Institution, CompanyDetails, Course } from '../../types';
import { apiService } from '../../services/apiService';
import { ZapIcon } from '../icons/ZapIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';
import { ExcelStudentInvoiceModal } from './ExcelStudentInvoiceModal';

const parseMoneyAmount = (amt: any): number => {
    if (amt === null || amt === undefined) return 0;
    if (typeof amt === 'number') return amt;
    const clean = String(amt).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

interface AutomatedBillingProps {
    feeStructures: FeeStructure[];
    students: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    institution: Institution;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
    companyDetails?: CompanyDetails;
    courses?: Course[];
    onOpenHistory?: () => void;
    onBackToLedger?: () => void;
}

export const AutomatedBilling: React.FC<AutomatedBillingProps> = ({
    feeStructures: rawFeeStructures,
    students: rawStudents,
    academicYears: rawAcademicYears,
    semesters: rawSemesters,
    institution,
    onGenerateInvoices,
    companyDetails,
    courses: rawCourses = [],
    onOpenHistory,
    onBackToLedger
}) => {
    const feeStructures = Array.isArray(rawFeeStructures) ? rawFeeStructures : [];
    const students = Array.isArray(rawStudents) ? rawStudents : [];
    const academicYears = Array.isArray(rawAcademicYears) ? rawAcademicYears : [];
    const semesters = Array.isArray(rawSemesters) ? rawSemesters : [];
    const courses = Array.isArray(rawCourses) ? rawCourses : [];

    const isSchool = institution.institutionType === 'Primary' || 
                     institution.institutionType === 'Secondary' || 
                     (institution.institutionType || '').toLowerCase().includes('school');

    const [selectedAY, setSelectedAY] = useState('');
    const [selectedSem, setSelectedSem] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [step, setStep] = useState<'config' | 'preview' | 'processing' | 'done'>('config');

    // Live Progress & ETA calculation state
    const [etaInfo, setEtaInfo] = useState<{
        estimatedTimeText: string;
        speedRate: number;
        currentStudentName: string;
        currentAdm: string;
        completedCount: number;
        totalCount: number;
        currentPhase: string;
    }>({
        estimatedTimeText: 'Calculating ETA...',
        speedRate: 0,
        currentStudentName: '',
        currentAdm: '',
        completedCount: 0,
        totalCount: 0,
        currentPhase: 'Initializing precision billing engine...'
    });

    // Selection criteria states
    const [targetType, setTargetType] = useState<'all' | 'individual' | 'class' | 'course' | 'excel'>('all');
    const [showExcelInvoiceModal, setShowExcelInvoiceModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [includeTransport, setIncludeTransport] = useState(false);

    // Boarding student registry status mapping
    const [bedAllocations, setBedAllocations] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [nextInvoiceNum, setNextInvoiceNum] = useState(1001);
    const [invoicePrefix, setInvoicePrefix] = useState('INV-');

    useEffect(() => {
        apiService.fetchBedAllocations(institution.id)
            .then(res => setBedAllocations(res || []))
            .catch(err => console.error("Failed to load bed allocations for billing:", err));

        apiService.fetchModuleRecords('student_enrollments', institution.id)
            .then(res => setEnrollments(res || []))
            .catch(err => console.error("Failed to load student enrollments for billing:", err));

        apiService.fetchModuleRecords<any>('finance_numbering_configs', institution.id)
            .then(configs => {
                const configRecord = configs.find((c: any) => c.documentType === 'invoice' || c.document_type === 'invoice');
                if (configRecord) {
                    setInvoicePrefix(configRecord.prefix || 'INV-');
                    setNextInvoiceNum(Number(configRecord.nextNumber || configRecord.next_number || 1001));
                }
            })
            .catch(err => console.error("Failed to load invoice numbering config:", err));
    }, [institution.id]);

    const admissionNumberMap = useMemo(() => {
        const map = new Map<string, string>();
        enrollments.forEach(enr => {
            if (enr.userId && enr.admissionNumber) {
                map.set(enr.userId, enr.admissionNumber);
            }
        });
        return map;
    }, [enrollments]);

    const studentEnrollmentMap = useMemo(() => {
        const map = new Map<string, any>();
        enrollments.forEach(enr => {
            if (enr.userId) {
                map.set(enr.userId, enr);
            }
        });
        return map;
    }, [enrollments]);

    const getStudentCourseId = (student: User) => {
        const enr = studentEnrollmentMap.get(student.id);
        const gradeLevel = student.courseId || (student as any).course_id || enr?.metadata?.gradeLevel || enr?.metadata?.stream || enr?.courseId || enr?.course_id;
        if (!gradeLevel) return undefined;
        
        const matched = courses.find(c => 
            c.id === gradeLevel ||
            (c.name && c.name.toLowerCase() === gradeLevel.toLowerCase()) ||
            (c.code && c.code.toLowerCase() === gradeLevel.toLowerCase())
        );
        if (matched) return matched.id;
        
        return gradeLevel;
    };

    const isStudentBoarder = (student: User) => {
        const enrollment = studentEnrollmentMap.get(student.id);
        const enrResidence = enrollment?.metadata?.boardingStatus || enrollment?.metadata?.residenceType;
        if (enrResidence === 'boarder' || enrResidence === 'boarding') {
            return true;
        }
        const metaResidence = student?.metadata?.boardingStatus || student?.metadata?.residenceType;
        if (metaResidence === 'boarder' || metaResidence === 'boarding') {
            return true;
        }
        return bedAllocations.some(a => a.studentId === student.id && a.status === 'Active');
    };

    const studentClassMap = useMemo(() => {
        const map = new Map<string, string>();
        enrollments.forEach(enr => {
            if (enr.userId) {
                const cls = enr.metadata?.gradeLevel || enr.metadata?.stream;
                if (cls) {
                    map.set(enr.userId, cls);
                }
            }
        });
        return map;
    }, [enrollments]);

    // Extract unique classes/grade levels from student registry
    const classes = useMemo(() => {
        const set = new Set<string>();
        enrollments.forEach(enr => {
            const cls = enr.metadata?.gradeLevel || enr.metadata?.stream;
            if (cls) set.add(cls);
        });
        return Array.from(set);
    }, [enrollments]);

    // Filter students target pool based on target selection
    const billingStudents = useMemo(() => {
        if (targetType === 'individual') {
            return students.filter(s => s.id === selectedStudentId);
        }
        if (targetType === 'class') {
            return students.filter(s => studentClassMap.get(s.id) === selectedClass);
        }
        if (targetType === 'course') {
            return students.filter(s => getStudentCourseId(s) === selectedCourseId);
        }
        return students;
    }, [students, targetType, selectedStudentId, selectedClass, selectedCourseId, studentClassMap, studentEnrollmentMap]);

    // Resolve selected semester to its name (fee structures store the human-readable name e.g. "Term 1")
    const selectedSemName = useMemo(() => {
        if (selectedSem === 'annual') return 'Entire Academic Year (Annual)';
        const sem = semesters.find(s => s.id === selectedSem);
        return sem ? sem.name : selectedSem;
    }, [semesters, selectedSem]);

    const activeFeeStructures = useMemo(() => {
        return feeStructures.filter(f =>
            f.academicYearId === selectedAY &&
            (
                selectedSem === 'annual' ||
                String(f.term || '') === String(selectedSemName) ||
                String(f.term || '') === String(selectedSem)
            )
        );
    }, [feeStructures, selectedAY, selectedSem, selectedSemName]);

    const displayFeeStructures = useMemo(() => {
        const grouped: Record<string, FeeStructure> = {};
        activeFeeStructures.forEach(f => {
            const key = f.voteHeadId ? String(f.voteHeadId) : String(f.name);
            const amt = parseMoneyAmount(f.amount || (f as any).allocatedAmount || 0);
            if (grouped[key]) {
                const existingAmt = parseMoneyAmount(grouped[key].amount || (grouped[key] as any).allocatedAmount || 0);
                grouped[key] = {
                    ...grouped[key],
                    amount: existingAmt + amt
                };
            } else {
                grouped[key] = { ...f, amount: amt };
            }
        });
        return Object.values(grouped);
    }, [activeFeeStructures]);

    const routeFeeSettings = useMemo(() => {
        const saved = localStorage.getItem('eduai_transport_route_fee_settings');
        return saved ? JSON.parse(saved) : [
            { routeId: 'route_1', routeName: 'Route A - Kilimani & Hurlingham', termFee: 8500, monthlyFee: 3000 },
            { routeId: 'route_2', routeName: 'Route B - Langata & Karen', termFee: 12000, monthlyFee: 4200 },
            { routeId: 'route_3', routeName: 'Route C - Westlands & Spring Valley', termFee: 6000, monthlyFee: 2200 },
        ];
    }, []);

    const studentCommutePrefs = useMemo(() => {
        const saved = localStorage.getItem('eduai_student_commute_prefs');
        if (saved) return JSON.parse(saved);
        const initialPrefs: Record<string, { routeId: string; preference: 'round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none' }> = {};
        students.forEach((student, index) => {
            const routes = ['route_1', 'route_2', 'route_3'];
            const prefs: ('round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none')[] = ['round_trip', 'one_way_pickup', 'one_way_drop'];
            initialPrefs[student.id] = {
                routeId: routes[index % routes.length],
                preference: prefs[index % prefs.length]
            };
        });
        return initialPrefs;
    }, [students]);

    const totalProjectedRevenue = billingStudents.reduce((sum, s) => {
        const boarder = isStudentBoarder(s);
        const studentFeeStructures = activeFeeStructures.filter(f => {
            // Course restriction filter
            const matchesCourse = !f.courseId || f.courseId === getStudentCourseId(s);
            if (!matchesCourse) return false;

            // Boarding/Residence status filter
            const appTo = f.applicableTo || f.applicable_to || 'all';
            if (appTo === 'all') return true;
            if (appTo === 'boarder') return boarder;
            if (appTo === 'day_scholar') return !boarder;

            return true;
        });
        let studentSum = studentFeeStructures.reduce((acc, f) => {
            const amt = f.amount || (f as any).allocatedAmount || 0;
            const parsed = parseMoneyAmount(amt);
            return acc + parsed;
        }, 0);
        
        if (includeTransport) {
            const pref = studentCommutePrefs[s.id];
            if (pref && pref.preference !== 'none') {
                const route = routeFeeSettings.find((r: any) => r.routeId === pref.routeId);
                if (route) {
                    const multiplier = pref.preference === 'round_trip' ? 1.0 : 0.6;
                    let transportFee = Math.round(route.termFee * multiplier);
                    if (selectedSem === 'annual') {
                        const numTerms = semesters.length || 3;
                        transportFee *= numTerms;
                    }
                    studentSum += transportFee;
                }
            }
        }
        
        return sum + studentSum;
    }, 0);

    const isTargetValid = useMemo(() => {
        if (targetType === 'individual') return !!selectedStudentId;
        if (targetType === 'class') return !!selectedClass;
        if (targetType === 'course') return !!selectedCourseId;
        return true;
    }, [targetType, selectedStudentId, selectedClass, selectedCourseId]);

    const handleRunBilling = async () => {
        setIsGenerating(true);
        setStep('processing');
        const total = billingStudents.length;
        const startTime = Date.now();

        setEtaInfo({
            estimatedTimeText: 'Calculating ETA...',
            speedRate: 0,
            currentStudentName: billingStudents[0]?.name || '',
            currentAdm: billingStudents[0]?.admissionNumber || '',
            completedCount: 0,
            totalCount: total,
            currentPhase: 'Initializing precision billing engine...'
        });

        const instId = institution.id;
        let invoicePrefix = (companyDetails?.globalInvoicePrefix || 'INV-').trim();
        let nextInvoiceNumber = 1001;
        let configRecord: any = null;

        try {
            const configs = await apiService.fetchModuleRecords<any>('finance_numbering_configs', instId);
            configRecord = configs.find((c: any) => c.documentType === 'invoice' || c.document_type === 'invoice');
            if (configRecord) {
                invoicePrefix = configRecord.prefix || 'INV-';
                nextInvoiceNumber = Number(configRecord.nextNumber || configRecord.next_number || 1001);
            }
        } catch (err) {
            console.error("Failed to load invoice numbering config for automated billing:", err);
        }

        let currentNum = nextInvoiceNumber;
        const mockInvoices: any[] = [];

        for (let i = 0; i < billingStudents.length; i++) {
            const s = billingStudents[i];
            const boarder = isStudentBoarder(s);
            let studentFeeStructures = activeFeeStructures.filter(f => {
                const matchesCourse = !f.courseId || f.courseId === getStudentCourseId(s);
                if (!matchesCourse) return false;

                const appTo = f.applicableTo || f.applicable_to || 'all';
                if (appTo === 'all') return true;
                if (appTo === 'boarder') return boarder;
                if (appTo === 'day_scholar') return !boarder;

                return true;
            });

            if (selectedSem === 'annual') {
                const groupedMap = new Map<string, typeof studentFeeStructures[0]>();
                studentFeeStructures.forEach(f => {
                    const key = f.voteHeadId ? String(f.voteHeadId) : f.name.trim().toLowerCase();
                    const existing = groupedMap.get(key);
                    const amt = parseMoneyAmount(f.amount || (f as any).allocatedAmount || 0);
                    if (existing) {
                        const existingAmt = parseMoneyAmount(existing.amount || (existing as any).allocatedAmount || 0);
                        existing.amount = existingAmt + amt;
                        if ((existing as any).allocatedAmount !== undefined) {
                            (existing as any).allocatedAmount = existingAmt + amt;
                        }
                    } else {
                        groupedMap.set(key, { ...f, amount: amt });
                    }
                });
                studentFeeStructures = Array.from(groupedMap.values());
            }
            
            const baseAmount = studentFeeStructures.reduce((acc, f) => {
                const amt = f.amount || (f as any).allocatedAmount || 0;
                const parsed = parseMoneyAmount(amt);
                return acc + parsed;
            }, 0);
            
            const invoiceItems = studentFeeStructures.map(f => {
                const amt = f.amount || (f as any).allocatedAmount || 0;
                const parsed = parseMoneyAmount(amt);
                return {
                    name: f.name,
                    description: f.name,
                    voteheadName: f.name,
                    quantity: 1,
                    unitPrice: parsed,
                    amount: parsed,
                    priority: f.priority
                };
            });

            let transportAmount = 0;
            if (includeTransport) {
                const pref = studentCommutePrefs[s.id];
                if (pref && pref.preference !== 'none') {
                    const route = routeFeeSettings.find((r: any) => r.routeId === pref.routeId);
                    if (route) {
                        const multiplier = pref.preference === 'round_trip' ? 1.0 : 0.6;
                        let transportFee = Math.round(route.termFee * multiplier);
                        if (selectedSem === 'annual') {
                            const numTerms = semesters.length || 3;
                            transportFee *= numTerms;
                        }
                        transportAmount = transportFee;
                        const prefLabel = pref.preference === 'round_trip' ? 'Round Trip' : 'One Way';
                        invoiceItems.push({
                            name: 'Transport Fee',
                            description: `Transport Fee: ${route.routeName} (${prefLabel})${selectedSem === 'annual' ? ' - Annual' : ''}`,
                            voteheadName: 'Transport',
                            quantity: 1,
                            unitPrice: transportAmount,
                            amount: transportAmount,
                            priority: 99
                        });
                    }
                }
            }

            const totalAmount = baseAmount + transportAmount;
            const invoiceNumber = `${invoicePrefix}${currentNum}`;
            currentNum += 1;

            const studentClass = studentClassMap.get(s.id) || '';

            mockInvoices.push({
                id: `inv_auto_${Date.now()}_${s.id}`,
                invoiceNumber: invoiceNumber,
                studentId: s.id,
                totalAmount: totalAmount,
                status: 'pending' as const,
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: invoiceItems,
                institutionId: institution.id,
                className: studentClass
            });

            // Live progress & ETA calculation
            const completed = i + 1;
            const currentProgress = Math.round((completed / total) * 90);
            const elapsedSec = (Date.now() - startTime) / 1000;
            const speedRate = elapsedSec > 0.1 ? parseFloat((completed / elapsedSec).toFixed(1)) : 0;
            const remainingCount = total - completed;
            const secRemaining = speedRate > 0 ? Math.max(0, Math.round(remainingCount / speedRate)) : 0;

            let etaString = 'Calculating ETA...';
            if (elapsedSec >= 0.2) {
                if (secRemaining <= 0) etaString = 'Almost complete...';
                else if (secRemaining < 60) etaString = `~${secRemaining}s remaining`;
                else etaString = `~${Math.floor(secRemaining / 60)}m ${secRemaining % 60}s remaining`;
            }

            setProgress(currentProgress);
            setEtaInfo({
                estimatedTimeText: etaString,
                speedRate: speedRate,
                currentStudentName: s.name,
                currentAdm: s.admissionNumber || s.admission_number || '',
                completedCount: completed,
                totalCount: total,
                currentPhase: `Invoicing ${s.name} (${completed}/${total})...`
            });

            if (i % 8 === 0 || i === billingStudents.length - 1) {
                await new Promise(r => setTimeout(r, 12));
            }
        }

        setEtaInfo(prev => ({
            ...prev,
            currentPhase: 'Committing batch invoices to financial ledger...',
            estimatedTimeText: 'Finalizing ledger entries...'
        }));
        setProgress(95);

        // Save back updated config
        if (configRecord) {
            try {
                await apiService.updateModuleRecord('finance_numbering_configs', configRecord.id, {
                    ...configRecord,
                    nextNumber: currentNum,
                    next_number: currentNum,
                    updatedAt: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            } catch (err) {
                console.error("Failed to update numbering config after billing:", err);
            }
        }

        await onGenerateInvoices(mockInvoices);

        // Record batch history for Audit & Undo
        try {
            const batchTitle = selectedFeeStructure?.name || `BILLING - ${selectedTerm || 'GENERAL'}`;
            const totalVal = mockInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
            const batchRecord = {
                id: `batch_wiz_${Date.now()}`,
                description: batchTitle.toUpperCase(),
                totalValue: totalVal,
                noOfRecords: mockInvoices.length,
                addedOn: new Date().toISOString(),
                addedBy: 'Finance Officer (Wizard)',
                invoiceIds: mockInvoices.map((i: any) => i.id),
                status: 'active' as const
            };
            const stored = localStorage.getItem(`eduai_invoice_batches_${institution.id}`);
            const existing = stored ? JSON.parse(stored) : [];
            const updated = [batchRecord, ...existing];
            localStorage.setItem(`eduai_invoice_batches_${institution.id}`, JSON.stringify(updated));
            apiService.saveModuleRecord('institution_module_states', {
                institution_id: institution.id,
                module_id: 'invoice_batches_history',
                state_data: updated,
                updated_at: new Date().toISOString()
            }).catch(() => {});
        } catch (e) {}

        setProgress(100);
        setStep('done');
        setIsGenerating(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 py-2 animate-in fade-in zoom-in-95 duration-300">
            {step === 'config' && (
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
                                <ZapIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional Billing Wizard</h2>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Automate your revenue lifecycle. Generate term-based invoices for targeted students in seconds.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {onBackToLedger && (
                                <button
                                    type="button"
                                    onClick={onBackToLedger}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    <ClipboardListIcon className="w-3.5 h-3.5" />
                                    <span>Invoices Ledger</span>
                                </button>
                            )}
                            {onOpenHistory && (
                                <button
                                    type="button"
                                    onClick={onOpenHistory}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                                >
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    <span>Batch History</span>
                                </button>
                            )}
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                                ⚡ Wizard
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Academic Year</label>
                            <select 
                                value={selectedAY}
                                onChange={(e) => setSelectedAY(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select Year</option>
                                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Term / Semester</label>
                            <select 
                                value={selectedSem}
                                onChange={(e) => setSelectedSem(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select Term</option>
                                <option value="annual">Entire Academic Year (Annual)</option>
                                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Target Selector */}
                    <div className="space-y-4 pt-6 border-t border-slate-100 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Billing Target</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { id: 'all', label: 'All Students', desc: 'Invoices entire registry', icon: UsersIcon },
                                { id: 'individual', label: 'Single Student', desc: 'Invoices one account', icon: UserIcon },
                                { id: 'class', label: 'Class Group', desc: 'Filter by grade/stream', icon: UserGroupIcon },
                                { id: 'course', label: 'By Course', desc: 'Filter by program', icon: AcademicCapIcon },
                                { id: 'excel', label: 'Excel / CSV Sheet', desc: 'Import custom list', icon: ArrowUpTrayIcon },
                            ].map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        setTargetType(option.id as any);
                                        if (option.id === 'excel') {
                                            setShowExcelInvoiceModal(true);
                                        }
                                    }}
                                    className={`p-4 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[110px] ${
                                        targetType === option.id 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' 
                                        : 'bg-slate-50 dark:bg-slate-950 border-transparent hover:bg-slate-100 hover:scale-[1.02] text-slate-700 dark:text-slate-355'
                                    }`}
                                >
                                    <option.icon className={`w-5 h-5 mb-2 ${targetType === option.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{option.label}</p>
                                        <p className={`text-[8.5px] font-bold mt-0.5 ${targetType === option.id ? 'text-indigo-200' : 'text-slate-400'}`}>{option.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {targetType === 'excel' && (
                        <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-3xl text-left space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                                        <ArrowUpTrayIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                            Excel / CSV Student Invoicing
                                        </h5>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            Upload your spreadsheet with student admission numbers, fee descriptions, and itemized amounts.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowExcelInvoiceModal(true)}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>Launch Excel Importer</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {targetType === 'individual' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Student</label>
                            <select 
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select a student...</option>
                                {students.map(s => {
                                    const adm = s.admissionNumber || s.admission_number || admissionNumberMap.get(s.id) || 'No Adm';
                                    return (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({adm})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {targetType === 'class' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Class / Grade Level</label>
                            <select 
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select class...</option>
                                {classes.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {targetType === 'course' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Course / Program</label>
                            <select 
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all text-sm font-bold text-slate-700 outline-none"
                            >
                                <option value="">Select course...</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Transport Billing Integration */}
                    <div className="pt-6 border-t border-slate-100 text-left space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Transport Integration</label>
                        <button
                            type="button"
                            onClick={() => setIncludeTransport(!includeTransport)}
                            className={`w-full p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center justify-between ${
                                includeTransport
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-900 dark:text-emerald-300'
                                : 'bg-slate-50 dark:bg-slate-950 border-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-355'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${includeTransport ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.32-5.12a1.902 1.902 0 0 0-1.802-1.786l-8.225-.045m10.345 8.075h-1.125M9 4.5h6m-6 0h1.125c.621 0 1.129.504 1.09 1.124l-.32 5.12a1.902 1.902 0 0 0-1.802 1.786L5.25 12.5M9 4.5h6" /></svg>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black uppercase tracking-tight">Include Route Transport Fees</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                                        Automatically append corresponding route transport fees for active commuters
                                    </p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${includeTransport ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                                {includeTransport && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                            </div>
                        </button>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-700">
                            <ZapIcon className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Impact Analysis</span>
                        </div>
                        <p className="text-sm font-bold text-amber-800/80 leading-relaxed text-left">
                            Generating billing for {billingStudents.length} students across {activeFeeStructures.length} active fee categories. 
                            Estimated revenue projection: <span className="font-black">KES {totalProjectedRevenue?.toLocaleString()}</span>.
                        </p>
                    </div>

                    <button 
                        onClick={() => setStep('preview')}
                        disabled={!selectedAY || !selectedSem || !isTargetValid || billingStudents.length === 0}
                        className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all hover:scale-[1.02] active:scale-95 shadow-xl disabled:opacity-50"
                    >
                        Preview Billing Run
                    </button>
                </div>
            )}

            {step === 'preview' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8 animate-in slide-in-from-right-8 duration-500">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm border-l-4 border-indigo-600 pl-4 text-left">Billing Preview Summary</h3>
                    
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-4 custom-scrollbar">
                        {displayFeeStructures.length === 0 ? (
                            <p className="text-center text-xs font-medium text-slate-400 p-4">No active fee structures configured for this academic year and semester.</p>
                        ) : (
                            displayFeeStructures.map((f, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{f.name}</p>
                                        <div className="flex flex-wrap gap-2 items-center mt-1">
                                            {f.courseId && <span className="text-[8px] font-black bg-indigo-50 text-indigo-650 px-1.5 py-0.5 rounded uppercase tracking-wider">{isSchool ? 'Grade Restricted' : 'Course Restricted'}</span>}
                                            {(f.applicableTo || f.applicable_to) && (f.applicableTo || f.applicable_to) !== 'all' && (
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                    (f.applicableTo || f.applicable_to) === 'boarder' 
                                                    ? 'bg-rose-50 text-rose-650' 
                                                    : 'bg-emerald-50 text-emerald-650'
                                                }`}>
                                                    {(f.applicableTo || f.applicable_to) === 'boarder' ? 'Boarders Only' : 'Day Scholars Only'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-slate-900">KES {Number(f.amount || (f as any).allocatedAmount || 0)?.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                        
                        {/* Transport Preview Items */}
                        {includeTransport && routeFeeSettings.map((r: any) => (
                            <div key={r.routeId} className="flex justify-between items-center p-4 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-left">
                                <div>
                                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{r.routeName}</p>
                                    <div className="flex flex-wrap gap-2 items-center mt-1">
                                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Transport Fee</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-emerald-900 dark:text-emerald-300">KES {Number(r.termFee)?.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Student Invoices Preview Section with Subtotals */}
                    <div className="space-y-4 pt-6 border-t border-slate-100 text-left">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-4">Sample Student Invoice Previews</h4>
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                            {billingStudents.slice(0, 5).map((s, idx) => {
                                const boarder = isStudentBoarder(s);
                                let studentFeeStructures = activeFeeStructures.filter(f => {
                                    const matchesCourse = !f.courseId || f.courseId === getStudentCourseId(s);
                                    if (!matchesCourse) return false;

                                    const appTo = f.applicableTo || f.applicable_to || 'all';
                                    if (appTo === 'all') return true;
                                    if (appTo === 'boarder') return boarder;
                                    if (appTo === 'day_scholar') return !boarder;

                                    return true;
                                });

                                if (selectedSem === 'annual') {
                                    const groupedMap = new Map<string, typeof studentFeeStructures[0]>();
                                    studentFeeStructures.forEach(f => {
                                        const key = f.voteHeadId ? String(f.voteHeadId) : f.name.trim().toLowerCase();
                                        const existing = groupedMap.get(key);
                                        const amt = parseMoneyAmount(f.amount || (f as any).allocatedAmount || 0);
                                        if (existing) {
                                            const existingAmt = parseMoneyAmount(existing.amount || (existing as any).allocatedAmount || 0);
                                            existing.amount = existingAmt + amt;
                                            if ((existing as any).allocatedAmount !== undefined) {
                                                (existing as any).allocatedAmount = existingAmt + amt;
                                            }
                                        } else {
                                            groupedMap.set(key, { ...f, amount: amt });
                                        }
                                    });
                                    studentFeeStructures = Array.from(groupedMap.values());
                                }

                                const baseAmount = studentFeeStructures.reduce((acc, f) => {
                                    const amt = f.amount || (f as any).allocatedAmount || 0;
                                    const parsed = parseMoneyAmount(amt);
                                    return acc + parsed;
                                }, 0);

                                const items = studentFeeStructures.map(f => {
                                    const amt = f.amount || (f as any).allocatedAmount || 0;
                                    const parsed = parseMoneyAmount(amt);
                                    return {
                                        name: f.name,
                                        amount: parsed,
                                        priority: f.priority
                                    };
                                });

                                let transportAmount = 0;
                                if (includeTransport) {
                                    const pref = studentCommutePrefs[s.id];
                                    if (pref && pref.preference !== 'none') {
                                        const route = routeFeeSettings.find((r: any) => r.routeId === pref.routeId);
                                        if (route) {
                                            const multiplier = pref.preference === 'round_trip' ? 1.0 : 0.6;
                                            let transportFee = Math.round(route.termFee * multiplier);
                                            if (selectedSem === 'annual') {
                                                const numTerms = semesters.length || 3;
                                                transportFee *= numTerms;
                                            }
                                            transportAmount = transportFee;
                                            const prefLabel = pref.preference === 'round_trip' ? 'Round Trip' : 'One Way';
                                            items.push({
                                                name: `Transport Fee: ${route.routeName} (${prefLabel})${selectedSem === 'annual' ? ' - Annual' : ''}`,
                                                amount: transportAmount,
                                                priority: 99
                                            });
                                        }
                                    }
                                }

                                const totalAmount = baseAmount + transportAmount;
                                const adm = s.admissionNumber || s.admission_number || admissionNumberMap.get(s.id) || 'No Adm';
                                const previewInvoiceNumber = `${invoicePrefix}${nextInvoiceNum + idx}`;

                                return (
                                    <div key={s.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{s.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                    INV #: {previewInvoiceNumber} • ADM: {adm} • {boarder ? 'Boarder' : 'Day Scholar'} • Term: {selectedSemName}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice Subtotal</p>
                                                <p className="text-sm font-black text-indigo-650">KES {totalAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-dashed border-slate-200 pt-2.5 space-y-1">
                                            {items.map((item, itemIdx) => (
                                                <div key={itemIdx} className="flex justify-between items-center text-xs text-slate-600">
                                                    <span>{item.name}</span>
                                                    <span className="font-bold">KES {item.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {billingStudents.length === 0 && (
                                <p className="text-center text-xs text-slate-400 py-4 font-bold uppercase tracking-wider">No matching students to preview</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                        <button onClick={() => setStep('config')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Back</button>
                        <button onClick={handleRunBilling} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Confirm & Execute Run</button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="bg-white dark:bg-slate-900 p-10 md:p-14 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl text-center space-y-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    
                    {/* Top Glowing Shimmer Line */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.8)]" 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>

                    {/* Spinner & Phase Header */}
                    <div className="space-y-4 pt-2">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="w-20 h-20 border-4 border-indigo-100 dark:border-indigo-950/60 border-t-indigo-600 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{progress}%</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Generating Student Invoices
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                {etaInfo.currentPhase}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar Container with ETA & Metrics */}
                    <div className="max-w-xl mx-auto space-y-3">
                        
                        {/* Status Badges Header: ETA + Speed + Counter */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full font-bold">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                <span>⏱️ Est. Time Remaining: <strong className="font-mono text-indigo-900 dark:text-indigo-200">{etaInfo.estimatedTimeText}</strong></span>
                            </div>
                            {etaInfo.speedRate > 0 && (
                                <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full font-bold font-mono text-[11px]">
                                    ⚡ {etaInfo.speedRate} inv/sec
                                </div>
                            )}
                        </div>

                        {/* Animated Multi-color Progress Bar */}
                        <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300 relative overflow-hidden shadow-md flex items-center justify-end pr-2"
                                style={{ width: `${Math.max(5, progress)}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                            </div>
                        </div>

                        {/* Progress Counter */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
                            <span>{etaInfo.completedCount} of {etaInfo.totalCount} Invoices Created</span>
                            <span>{progress}% Completed</span>
                        </div>
                    </div>

                    {/* Active Invoicing Card */}
                    {etaInfo.currentStudentName && (
                        <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-left">
                            <div className="truncate pr-2">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Current Student In Pipeline</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">{etaInfo.currentStudentName}</span>
                            </div>
                            {etaInfo.currentAdm && (
                                <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                    ADM: {etaInfo.currentAdm}
                                </span>
                            )}
                        </div>
                    )}

                </div>
            )}

            {step === 'done' && (
                <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-2xl text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                        <CheckCircleIcon className="w-12 h-12 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-slate-900">Lifecycle Executed</h3>
                        <p className="text-slate-500 font-medium">
                            The billing engine has successfully generated and distributed invoices to <span className="text-indigo-600 font-black">{billingStudents.length}</span> student accounts.
                        </p>
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setStep('config')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">New Billing Run</button>
                        <button onClick={() => window.print()} className="px-8 py-4 bg-white text-slate-900 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Export Journals</button>
                    </div>
                </div>
            )}

            {/* Excel / CSV Student Invoice Modal */}
            <ExcelStudentInvoiceModal
                isOpen={showExcelInvoiceModal}
                onClose={() => setShowExcelInvoiceModal(false)}
                institution={institution}
                students={students}
                companyDetails={companyDetails}
                onGenerateInvoices={onGenerateInvoices}
            />
        </div>
    );
};
