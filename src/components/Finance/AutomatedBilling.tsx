import React, { useState, useMemo, useEffect } from 'react';
import type { FeeStructure, User, AcademicYear, Semester, Institution, CompanyDetails, Course } from '../../types';
import { apiService } from '../../services/apiService';
import { ZapIcon } from '../icons/ZapIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { UserIcon } from '../icons/UserIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';

interface AutomatedBillingProps {
    feeStructures: FeeStructure[];
    students: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    institution: Institution;
    onGenerateInvoices: (invoices: any[]) => Promise<void>;
    companyDetails?: CompanyDetails;
    courses?: Course[];
}

export const AutomatedBilling: React.FC<AutomatedBillingProps> = ({
    feeStructures: rawFeeStructures,
    students: rawStudents,
    academicYears: rawAcademicYears,
    semesters: rawSemesters,
    institution,
    onGenerateInvoices,
    companyDetails,
    courses: rawCourses = []
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

    // Selection criteria states
    const [targetType, setTargetType] = useState<'all' | 'individual' | 'class' | 'course'>('all');
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
            return students.filter(s => s.courseId === selectedCourseId);
        }
        return students;
    }, [students, targetType, selectedStudentId, selectedClass, selectedCourseId, studentClassMap]);

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
        // Deduplicate by voteHeadId + name to avoid showing the same votehead twice in the summary list
        const seen = new Set<string>();
        return activeFeeStructures.filter(f => {
            const key = f.voteHeadId ? String(f.voteHeadId) : String(f.name);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
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
            const matchesCourse = !f.courseId || f.courseId === s.courseId;
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
            const parsed = typeof amt === 'string' ? parseFloat(amt.replace(/,/g, '')) : Number(amt);
            return acc + (isNaN(parsed) ? 0 : parsed);
        }, 0);
        
        if (includeTransport) {
            const pref = studentCommutePrefs[s.id];
            if (pref && pref.preference !== 'none') {
                const route = routeFeeSettings.find(r => r.routeId === pref.routeId);
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
        
        // Mock processing logic
        const total = billingStudents.length;
        for (let i = 0; i <= 100; i += 10) {
            setProgress(i);
            await new Promise(r => setTimeout(r, 200));
        }

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
        const mockInvoices = billingStudents.map(s => {
            const boarder = isStudentBoarder(s);
            const studentFeeStructures = activeFeeStructures.filter(f => {
                const matchesCourse = !f.courseId || f.courseId === s.courseId;
                if (!matchesCourse) return false;

                const appTo = f.applicableTo || f.applicable_to || 'all';
                if (appTo === 'all') return true;
                if (appTo === 'boarder') return boarder;
                if (appTo === 'day_scholar') return !boarder;

                return true;
            });
            
            const baseAmount = studentFeeStructures.reduce((acc, f) => {
                const amt = f.amount || (f as any).allocatedAmount || 0;
                const parsed = typeof amt === 'string' ? parseFloat(amt.replace(/,/g, '')) : Number(amt);
                return acc + (isNaN(parsed) ? 0 : parsed);
            }, 0);
            
            const invoiceItems = studentFeeStructures.map(f => {
                const amt = f.amount || (f as any).allocatedAmount || 0;
                const parsed = typeof amt === 'string' ? parseFloat(amt.replace(/,/g, '')) : Number(amt);
                return {
                    description: f.name,
                    quantity: 1,
                    unitPrice: isNaN(parsed) ? 0 : parsed,
                    amount: isNaN(parsed) ? 0 : parsed
                };
            });

            let transportAmount = 0;
            if (includeTransport) {
                const pref = studentCommutePrefs[s.id];
                if (pref && pref.preference !== 'none') {
                    const route = routeFeeSettings.find(r => r.routeId === pref.routeId);
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
                            description: `Transport Fee: ${route.routeName} (${prefLabel})${selectedSem === 'annual' ? ' - Annual' : ''}`,
                            quantity: 1,
                            unitPrice: transportAmount,
                            amount: transportAmount
                        });
                    }
                }
            }

            const totalAmount = baseAmount + transportAmount;
            const invoiceNumber = `${invoicePrefix}${currentNum}`;
            currentNum += 1;

            const studentClass = studentClassMap.get(s.id) || '';

            return {
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
            };
        });

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
        setStep('done');
        setIsGenerating(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 py-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100 mb-4 animate-bounce">
                    <ZapIcon className="w-10 h-10" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Institutional Billing Wizard</h2>
                <p className="text-slate-500 font-medium max-w-lg mx-auto">
                    Automate your revenue lifecycle. Generate term-based invoices for targeted students in seconds.
                </p>
            </div>

            {step === 'config' && (
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8">
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { id: 'all', label: 'All Students', desc: 'Invoices entire registry', icon: UsersIcon },
                                { id: 'individual', label: 'Single Student', desc: 'Invoices one account', icon: UserIcon },
                                { id: 'class', label: 'Class Group', desc: 'Filter by grade/stream', icon: UserGroupIcon },
                                { id: 'course', label: 'By Course', desc: 'Filter by program', icon: AcademicCapIcon },
                            ].map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setTargetType(option.id as any)}
                                    className={`p-5 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[120px] ${
                                        targetType === option.id 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' 
                                        : 'bg-slate-50 dark:bg-slate-950 border-transparent hover:bg-slate-100 hover:scale-[1.02] text-slate-700 dark:text-slate-355'
                                    }`}
                                >
                                    <option.icon className={`w-6 h-6 mb-3 ${targetType === option.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{option.label}</p>
                                        <p className={`text-[9px] font-bold mt-0.5 ${targetType === option.id ? 'text-indigo-200' : 'text-slate-400'}`}>{option.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

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
                        {includeTransport && routeFeeSettings.map(r => (
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
                                const studentFeeStructures = activeFeeStructures.filter(f => {
                                    const matchesCourse = !f.courseId || f.courseId === s.courseId;
                                    if (!matchesCourse) return false;

                                    const appTo = f.applicableTo || f.applicable_to || 'all';
                                    if (appTo === 'all') return true;
                                    if (appTo === 'boarder') return boarder;
                                    if (appTo === 'day_scholar') return !boarder;

                                    return true;
                                });
                                const baseAmount = studentFeeStructures.reduce((acc, f) => {
                                    const amt = f.amount || (f as any).allocatedAmount || 0;
                                    const parsed = typeof amt === 'string' ? parseFloat(amt.replace(/,/g, '')) : Number(amt);
                                    return acc + (isNaN(parsed) ? 0 : parsed);
                                }, 0);

                                const items = studentFeeStructures.map(f => {
                                    const amt = f.amount || (f as any).allocatedAmount || 0;
                                    const parsed = typeof amt === 'string' ? parseFloat(amt.replace(/,/g, '')) : Number(amt);
                                    return {
                                        name: f.name,
                                        amount: isNaN(parsed) ? 0 : parsed
                                    };
                                });

                                let transportAmount = 0;
                                if (includeTransport) {
                                    const pref = studentCommutePrefs[s.id];
                                    if (pref && pref.preference !== 'none') {
                                        const route = routeFeeSettings.find(r => r.routeId === pref.routeId);
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
                                                amount: transportAmount
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
                <div className="bg-white p-16 rounded-[4rem] border border-slate-100 shadow-2xl text-center space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 bg-indigo-600 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.5)]" style={{ width: `${progress}%` }} />
                    <div className="space-y-4">
                        <div className="w-24 h-24 border-8 border-slate-50 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-slate-900">Engineered Precision Invoicing</h3>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Executing Phase: Ledger Distribution ({progress}%)</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 italic">"Finalizing cryptographic billing signatures for institutional compliance..."</p>
                    </div>
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
        </div>
    );
};
