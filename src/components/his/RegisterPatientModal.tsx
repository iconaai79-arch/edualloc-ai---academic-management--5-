import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '../icons/XIcon';
import { UserIcon } from '../icons/UserIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { HeartIcon, IdentificationIcon, ShieldCheckIcon, CalendarIcon } from './HealthIcons';
import { HISPatient, User } from '../../types';
import { generateNextPatientId, advancePatientIdSequence } from '../../utils/hisPatientIdGenerator';

interface RegisterPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRegister: (patient: Omit<HISPatient, 'id' | 'institutionId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    users?: User[];
    isEdu?: boolean;
    institutionId?: string;
    existingPatients?: any[];
}

function ChevronRightIcon(props: any) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
    );
}

function ChevronLeftIcon(props: any) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
    );
}

export function getStudentResolvedAdm(u: any, generateFallback: boolean = false): string {
    if (!u) return '';
    const adm = (
        u.admissionNumber ||
        u.admission_number ||
        u.admissionNo ||
        u.admission_no ||
        u.admNo ||
        u.adm_no ||
        u.studentAdmissionNumber ||
        u.student_admission_number ||
        u.studentId ||
        u.student_id ||
        u.studentNumber ||
        u.student_number ||
        u.regNo ||
        u.reg_no ||
        u.regNumber ||
        u.registrationNumber ||
        u.assessmentNo ||
        u.assessmentNumber ||
        u.metadata?.admissionNumber ||
        u.metadata?.admission_number ||
        u.metadata?.admissionNo ||
        u.metadata?.admission_no ||
        u.metadata?.admNo ||
        u.metadata?.adm_no ||
        u.metadata?.studentAdmissionNumber ||
        u.metadata?.student_admission_number ||
        u.metadata?.studentId ||
        u.metadata?.student_id ||
        u.metadata?.studentNumber ||
        u.metadata?.regNo ||
        u.metadata?.reg_no ||
        u.metadata?.assessmentNo ||
        u.metadata?.assessmentNumber ||
        u.metadata?.upi ||
        u.metadata?.upiNumber ||
        u.metadata?.staffId ||
        u.staffId ||
        ''
    );
    const cleaned = adm ? String(adm).trim() : '';
    if (cleaned && cleaned !== '—' && cleaned !== '-' && cleaned.toLowerCase() !== 'pending') {
        return cleaned;
    }
    if (generateFallback) {
        const idSeed = String(u.id || u.email || Math.random().toString(36).substring(2, 7)).replace(/[^a-zA-Z0-9]/g, '');
        const suffix = idSeed.length >= 4 ? idSeed.slice(-4).toUpperCase() : idSeed.toUpperCase().padStart(4, '0');
        const year = new Date().getFullYear();
        const isStudent = !u.role || (u.role || '').toLowerCase() === 'student';
        return isStudent ? `ADM-${year}-${suffix}` : `STF-${year}-${suffix}`;
    }
    return '';
}

export function getStudentResolvedClass(u: any): string {
    if (!u) return '';
    const grade = (
        u.studentClass ||
        u.supervisedClass ||
        u.metadata?.studentClass ||
        u.metadata?.className ||
        u.metadata?.gradeLevel ||
        u.metadata?.class_level ||
        u.metadata?.grade_level ||
        u.metadata?.grade ||
        u.metadata?.class ||
        u.metadata?.class_name ||
        u.metadata?.courseLevel ||
        u.metadata?.courseLevelName ||
        u.metadata?.academicLevel ||
        u.metadata?.academicLevelName ||
        u.metadata?.form ||
        u.metadata?.level ||
        u.className ||
        u.gradeLevel ||
        u.grade ||
        u.class ||
        u.class_name ||
        u.grade_level ||
        ''
    );
    const stream = (
        u.metadata?.stream ||
        u.metadata?.streamName ||
        u.metadata?.stream_name ||
        u.metadata?.stream_title ||
        u.stream ||
        u.stream_name ||
        ''
    );
    const gradeStr = String(grade).trim();
    const streamStr = String(stream).trim();
    if (gradeStr && streamStr) {
        if (gradeStr.toLowerCase().includes(streamStr.toLowerCase())) return gradeStr;
        return `${gradeStr} ${streamStr}`;
    }
    return gradeStr || streamStr || '';
}

export function RegisterPatientModal({ isOpen, onClose, onRegister, users = [], isEdu = false, institutionId, existingPatients = [] }: RegisterPatientModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        customPatientId: '',
        fullName: '',
        dob: '',
        gender: 'Male' as 'Male' | 'Female' | 'Other',
        bloodGroup: '',
        contact: '',
        insuranceProvider: '',
        shaNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        guardianName: '',
        guardianPhone: '',
        guardianNationalId: '',
        admissionNumber: '',
        allergies: '',
        gradeLevel: '',
        stream: '',
    });

    const [directorySearch, setDirectorySearch] = useState('');
    const [isAutoFilled, setIsAutoFilled] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-generate patient ID on mount or when existingPatients updates
    useEffect(() => {
        if (isOpen && !formData.customPatientId) {
            const nextId = generateNextPatientId(existingPatients, institutionId);
            setFormData(f => ({ ...f, customPatientId: nextId }));
        }
    }, [isOpen, existingPatients, institutionId]);

    // Calculate Age Automatically based on DOB
    const calculatedAge = useMemo(() => {
        if (!formData.dob) return null;
        const birthDate = new Date(formData.dob);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    }, [formData.dob]);

    const isMinor = calculatedAge !== null && calculatedAge < 18;

    const filteredUsers = useMemo(() => {
        if (!isEdu || !directorySearch.trim()) return [];
        const query = directorySearch.toLowerCase().trim();
        return (users || []).filter(u => {
            const isClinicApplicable = ['student', 'teacher', 'boarding_master', 'staff', 'parent', 'librarian'].includes(u.role);
            if (!isClinicApplicable) return false;
            const adm = getStudentResolvedAdm(u).toLowerCase();
            const className = getStudentResolvedClass(u).toLowerCase();
            const name = (u.name || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const phone = (u.phoneNumber || '');

            return (
                name.includes(query) ||
                adm.includes(query) ||
                className.includes(query) ||
                email.includes(query) ||
                phone.includes(query)
            );
        });
    }, [directorySearch, users, isEdu]);

    const handleSelectUser = (user: User) => {
        const parentPhone = user.metadata?.parentPhone || user.metadata?.guardianPhone || user.metadata?.emergencyContactPhone || (user as any).parentPhone || (user as any).guardianPhone || (user as any).emergencyContact || user.phoneNumber || '';
        const parentName = user.metadata?.parentName || user.metadata?.guardianName || user.metadata?.emergencyContactName || (user as any).parentName || (user as any).guardianName || '';
        const parentId = user.metadata?.guardianNationalId || user.metadata?.parentId || (user as any).guardianNationalId || (user as any).parentId || '';
        
        // Auto-generate a clean, unique admission/staff ID if not already assigned
        const adm = getStudentResolvedAdm(user, true);
        const resolvedClass = getStudentResolvedClass(user);
        
        const grade = (user as any).metadata?.gradeLevel || 
            (user as any).metadata?.class_level || 
            (user as any).metadata?.grade_level || 
            (user as any).metadata?.className || 
            (user as any).metadata?.studentClass || 
            (user as any).studentClass || 
            (user as any).className || 
            (user as any).gradeLevel || 
            resolvedClass || '';
            
        const stream = (user as any).metadata?.stream || (user as any).metadata?.streamName || (user as any).metadata?.stream_name || (user as any).stream || '';

        setFormData(prev => ({
            ...prev,
            fullName: user.name,
            dob: user.metadata?.dob || (user as any).dob || '',
            gender: (user.metadata?.gender === 'Female' || (user as any).gender === 'Female' ? 'Female' : 'Male'),
            bloodGroup: user.metadata?.bloodGroup || (user as any).bloodGroup || '',
            contact: user.phoneNumber || user.email || parentPhone || '',
            insuranceProvider: isEdu ? 'School Coverage / EduPulse Free Student Care' : 'School Coverage',
            shaNumber: user.metadata?.shaNumber || '',
            emergencyContactName: user.metadata?.emergencyContactName || parentName || '',
            emergencyContactPhone: user.metadata?.emergencyContactPhone || parentPhone || '',
            guardianName: parentName,
            guardianPhone: parentPhone,
            guardianNationalId: parentId,
            admissionNumber: adm,
            allergies: Array.isArray(user.metadata?.allergies) 
                ? user.metadata.allergies.join(', ') 
                : (user.metadata?.allergies || (user as any).allergies || ''),
            gradeLevel: grade,
            stream: stream,
        }));
        setIsAutoFilled(true);
        setDirectorySearch('');
    };

    const handleResetForm = () => {
        const nextId = generateNextPatientId(existingPatients, institutionId);
        setFormData({
            customPatientId: nextId,
            fullName: '',
            dob: '',
            gender: 'Male',
            bloodGroup: '',
            contact: '',
            insuranceProvider: isEdu ? 'School Coverage / EduPulse Free Student Care' : '',
            shaNumber: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            guardianName: '',
            guardianPhone: '',
            guardianNationalId: '',
            admissionNumber: '',
            allergies: '',
            gradeLevel: '',
            stream: '',
        });
        setIsAutoFilled(false);
        setCurrentStep(1);
    };

    if (!isOpen) return null;

    const validateForm = (): boolean => {
        if (!formData.fullName.trim()) {
            setCurrentStep(1);
            alert('Please enter Patient Full Name.');
            return false;
        }
        if (!formData.dob.trim()) {
            setCurrentStep(1);
            alert('Please select or enter Patient Date of Birth.');
            return false;
        }
        if (isMinor && !isEdu) {
            if (!formData.guardianName.trim() || !formData.guardianPhone.trim()) {
                setCurrentStep(4);
                alert('For minor patients (<18 yrs), Parent/Guardian Name and Phone Line are required.');
                return false;
            }
        }
        return true;
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return formData.fullName.trim().length > 0 && formData.dob.trim().length > 0;
            case 2:
                return true;
            case 3:
                return true;
            case 4:
                if (isMinor && !isEdu) {
                    return formData.guardianName.trim().length > 0 && formData.guardianPhone.trim().length > 0;
                }
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!formData.fullName.trim()) return alert('Please enter Patient Full Name.');
            if (!formData.dob.trim()) return alert('Please enter Patient Date of Birth.');
        }
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            const generatedId = formData.customPatientId || generateNextPatientId(existingPatients, institutionId);
            const finalContact = formData.contact.trim() || formData.guardianPhone || formData.emergencyContactPhone || 'N/A';

            await onRegister({
                ...formData,
                contact: finalContact,
                patientNumber: generatedId,
                customPatientId: generatedId,
                admissionNumber: formData.admissionNumber || generatedId,
                opNumber: generatedId,
                gender: formData.gender as 'Male' | 'Female' | 'Other',
                insuranceProvider: isEdu ? 'School Coverage / EduPulse Free Student Care' : (formData.insuranceProvider || 'Direct / Cash'),
                allergies: formData.allergies
                    ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean)
                    : []
            });

            // Automatically advance sequence counter for next patient
            await advancePatientIdSequence(generatedId, institutionId);

            handleResetForm();
            onClose();
        } catch (error: any) {
            console.error("Registration failed", error);
            alert("Registration Failed: " + (error?.message || 'Unable to store patient in database.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Decorative Background Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

                <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">Register <span className="text-indigo-600 dark:text-indigo-400">{isEdu ? 'Student / Patient' : 'New Patient'}</span></h2>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">{isEdu ? 'EduPulse Clinic Intake' : 'H.I.S Intake Module'}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-red-500 transition-all cursor-pointer">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Stepper Progress Bar */}
                <div className="px-10 pt-6 pb-4 bg-slate-50/50 dark:bg-slate-900/50 relative z-10 border-b border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-center relative">
                        {/* Connecting Line */}
                        <div className="absolute left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 top-1/2 -z-10 rounded-full" />
                        <div 
                            className="absolute left-0 h-1 bg-indigo-600 -translate-y-1/2 top-1/2 -z-10 rounded-full transition-all duration-500" 
                            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                        />

                        {[1, 2, 3, 4].map(step => (
                            <button
                                key={step}
                                type="button"
                                onClick={() => {
                                    if (step < currentStep || isStepValid()) {
                                        setCurrentStep(step);
                                    }
                                }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ring-4 ${
                                    step === currentStep 
                                        ? 'bg-indigo-600 text-white ring-indigo-500/30' 
                                        : step < currentStep 
                                        ? 'bg-emerald-500 text-white ring-emerald-500/20' 
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-transparent'
                                }`}
                            >
                                {step < currentStep ? '✓' : step}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <span>Identity</span>
                        <span>Clinical</span>
                        <span>{isEdu ? 'Service Tier' : 'Coverage'}</span>
                        <span>{isEdu ? 'Parent / Registry' : 'Emergency'}</span>
                    </div>
                </div>

                {/* Auto-filled Notification Banner */}
                {isAutoFilled && (
                    <div className="mx-8 mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest relative z-10">
                        <span>✓ Record & Parent Data Linked from School Directory</span>
                        <button type="button" onClick={handleResetForm} className="underline hover:text-emerald-400 cursor-pointer">Clear</button>
                    </div>
                )}

                {/* Content Steps */}
                <div className="p-8 relative z-10 max-h-[50vh] overflow-y-auto no-scrollbar">
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            {isEdu && (
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black uppercase text-indigo-500 ml-1">Auto-fill from Student / Staff Registry</label>
                                    <div className="relative group">
                                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH BY STUDENT NAME, ADMISSION NUMBER OR CLASS..."
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-800 dark:text-slate-100"
                                            value={directorySearch}
                                            onChange={e => setDirectorySearch(e.target.value)}
                                        />
                                    </div>
                                    {directorySearch && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[200] max-h-60 overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-white/5">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map(u => {
                                                    const admNo = getStudentResolvedAdm(u, false);
                                                    const fallbackAdm = getStudentResolvedAdm(u, true);
                                                    const className = getStudentResolvedClass(u);
                                                    const isStudent = (u.role || '').toLowerCase() === 'student';
                                                    const roleBadgeColor = isStudent
                                                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                                                        : u.role === 'teacher' || u.role === 'staff'
                                                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';

                                                    return (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            onClick={() => handleSelectUser(u)}
                                                            className="w-full p-3.5 sm:p-4 text-left hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 transition-all flex justify-between items-center gap-3 text-slate-800 dark:text-slate-200 cursor-pointer group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                                                                    {(u.name || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0 space-y-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                                            {u.name}
                                                                        </span>
                                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
                                                                            {u.role || 'STUDENT'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                                                                        {admNo ? (
                                                                            <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                                                                                <span className="text-slate-400 font-semibold text-[9px]">ADM:</span>
                                                                                <span className="text-indigo-600 dark:text-indigo-400 font-black">{admNo}</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300/40 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono" title="Will auto-assign upon selection">
                                                                                <span className="text-indigo-400 font-semibold text-[8px]">⚡ AUTO ADM:</span>
                                                                                <span className="text-indigo-600 dark:text-indigo-400 font-black">{fallbackAdm}</span>
                                                                            </span>
                                                                        )}
                                                                        {className ? (
                                                                            <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                                <span>🏫</span>
                                                                                <span className="font-black uppercase tracking-tight">{className}</span>
                                                                            </span>
                                                                        ) : (
                                                                            isStudent && (
                                                                                <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                                                                    <span>🏫</span>
                                                                                    <span>Class: Pending</span>
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-white bg-indigo-600 group-hover:bg-indigo-700 px-3.5 py-1.5 rounded-xl shadow-sm transition-all">
                                                                Select
                                                            </span>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    No matching student or staff records found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 ml-1 flex items-center justify-between">
                                        <span>Custom Patient ID / MRN *</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextId = generateNextPatientId(existingPatients, institutionId);
                                                setFormData(f => ({ ...f, customPatientId: nextId }));
                                            }}
                                            className="text-[8px] text-indigo-500 hover:text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1 hover:underline cursor-pointer"
                                            title="Re-calculate next unique sequential ID"
                                        >
                                            <span>🔄 Re-Sequence</span>
                                        </button>
                                    </label>
                                    <div className="relative group">
                                        <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="E.G. PID-001"
                                            className="w-full bg-indigo-50/50 dark:bg-white/5 border-2 border-indigo-500/30 focus:border-indigo-500 rounded-2xl pl-12 pr-12 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-indigo-600 dark:text-indigo-300 font-mono"
                                            value={formData.customPatientId}
                                            onChange={e => setFormData({ ...formData, customPatientId: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300/30">
                                            Auto
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Identity Name</label>
                                    <div className="relative group">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="E.G. JOHN DOE"
                                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                            value={formData.fullName}
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Birth Registry Date</label>
                                    <div className="relative group">
                                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            required
                                            type="date"
                                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                            value={formData.dob}
                                            onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                        />
                                    </div>
                                    {calculatedAge !== null && (
                                        <div className={`p-3 rounded-2xl border text-[9px] font-black uppercase tracking-wider flex items-center justify-between mt-2 ${
                                            isMinor 
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400' 
                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            <span>🎂 Calculated Age: {calculatedAge} Yrs Old</span>
                                            <span>{isEdu ? '🎓 School Clinic Coverage' : isMinor ? '⚠️ MINOR (<18)' : '✓ ADULT (18+)'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner appearance-none text-slate-900 dark:text-white"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {isEdu && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Student Admission / Staff Number</label>
                                            <div className="relative group">
                                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="E.G. ADM-1234"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                    value={formData.admissionNumber}
                                                    onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Grade / Class Level</label>
                                            <div className="relative group">
                                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="E.G. GRADE 5 / FORM 2"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                    value={formData.gradeLevel}
                                                    onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Stream / Class Group</label>
                                            <div className="relative group">
                                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="E.G. EAST / BLUE / ALPHA"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                    value={formData.stream}
                                                    onChange={e => setFormData({ ...formData, stream: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Blood Registry Group</label>
                                <div className="relative group">
                                    <HeartIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="E.G. O+"
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                        value={formData.bloodGroup}
                                        onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Medical Notes & Allergies</label>
                                <textarea
                                    rows={4}
                                    placeholder="E.G. PENICILLIN ALLERGY, ASTHMATIC..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner resize-none leading-relaxed text-slate-900 dark:text-white"
                                    value={formData.allergies}
                                    onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            {isEdu ? (
                                <div className="space-y-4">
                                    <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">✨</span>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">100% Free School Health Service</h4>
                                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                    School clinic intake, consultations, nursing triage, and emergency first aid are free institutional health services for students. No checkout, cashier billing, or payment options are required.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Institutional Coverage Tier</label>
                                            <input
                                                type="text"
                                                readOnly
                                                value="School Health Coverage (Complimentary)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 outline-none cursor-default font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Student / Primary Phone (Optional)</label>
                                            <div className="relative group">
                                                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                <input
                                                    type="tel"
                                                    placeholder="E.G. +254... (OPTIONAL)"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                    value={formData.contact}
                                                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Primary Contact Unit</label>
                                        <div className="relative group">
                                            <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <input
                                                required
                                                type="tel"
                                                placeholder="+254..."
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.contact}
                                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">S.H.A Identifier (Registry)</label>
                                        <div className="relative group">
                                            <ShieldCheckIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="SHA-XXXXXX"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.shaNumber}
                                                onChange={e => setFormData({ ...formData, shaNumber: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Intake Payment Method *</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, insuranceProvider: '' })}
                                                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                                                    !formData.insuranceProvider
                                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-md'
                                                        : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:bg-slate-100'
                                                }`}
                                            >
                                                💵 Cash / Mobile Money (Direct)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, insuranceProvider: 'SHA (Social Health Authority)' })}
                                                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                                                    !!formData.insuranceProvider
                                                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md'
                                                        : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:bg-slate-100'
                                                }`}
                                            >
                                                🛡️ Insurance Cover / SHA Scheme
                                            </button>
                                        </div>
                                    </div>

                                    {!!formData.insuranceProvider && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Insurance Partner / Cover Scheme</label>
                                                <div className="relative group">
                                                    <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                    <select
                                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white appearance-none"
                                                        value={formData.insuranceProvider}
                                                        onChange={e => setFormData({ ...formData, insuranceProvider: e.target.value })}
                                                    >
                                                        <option value="SHA (Social Health Authority)">SHA (Social Health Authority)</option>
                                                        <option value="Jubilee Insurance">Jubilee Insurance</option>
                                                        <option value="UAP Old Mutual">UAP Old Mutual</option>
                                                        <option value="AAR Insurance">AAR Insurance</option>
                                                        <option value="APA Insurance">APA Insurance</option>
                                                        <option value="Britam Health">Britam Health</option>
                                                        <option value="CIC Africa Group">CIC Africa Group</option>
                                                        <option value="School Coverage">School Coverage / EduPulse</option>
                                                        <option value="Other Commercial Cover">Other Commercial Cover</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Policy / SHA Member ID</label>
                                                <div className="relative group">
                                                    <ShieldCheckIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        placeholder="SHA-XXXXXX OR POLICY NO..."
                                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                        value={formData.shaNumber}
                                                        onChange={e => setFormData({ ...formData, shaNumber: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            {isEdu ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center justify-between">
                                        <span>🎓 Student Registry Parent / Guardian Data (Auto-Fetched)</span>
                                        <span className="px-2 py-0.5 bg-indigo-500/20 rounded font-bold">Auto-Linked</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                        Parent and guardian contact details are automatically linked from the student's admission profile in the school registry. You may leave these fields as-is or optionally update them below.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent / Legal Guardian Name (From Student Registry)</label>
                                            <input
                                                type="text"
                                                placeholder="Parent / Guardian Name (Auto-Populated from Registry)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.guardianName}
                                                onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent / Guardian Phone Line (Optional)</label>
                                            <input
                                                type="tel"
                                                placeholder="+254 7XX XXX XXX (Optional)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.guardianPhone}
                                                onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent National ID / Emergency Phone (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="ID No. or Emergency Contact (Optional)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.guardianNationalId || formData.emergencyContactPhone}
                                                onChange={e => setFormData({ ...formData, guardianNationalId: e.target.value, emergencyContactPhone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : isMinor ? (
                                <>
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center justify-between">
                                        <span>👨‍👩‍👧 MINOR PATIENT (&lt;18 YRS) — PARENT / GUARDIAN DETAILS MANDATORY</span>
                                        <span className="px-2 py-0.5 bg-amber-500/20 rounded">REQUIRED</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent / Legal Guardian Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="E.G. MARY WANJIKU (MOTHER / FATHER)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.guardianName}
                                                onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent / Guardian Phone Line *</label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder="+254 7XX XXX XXX"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.guardianPhone}
                                                onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Parent National ID / Passport No. *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="E.G. ID-28491029"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.guardianNationalId}
                                                onChange={e => setFormData({ ...formData, guardianNationalId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-between">
                                        <span>🆘 ADULT PATIENT (18+ YRS) — EMERGENCY CONTACT (OPTIONAL)</span>
                                        <span className="px-2 py-0.5 bg-emerald-500/20 rounded">OPTIONAL</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Emergency Contact / Next of Kin Name (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="NEXT OF KIN NAME (OPTIONAL)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.emergencyContactName}
                                                onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Emergency Phone Line (Optional)</label>
                                            <input
                                                type="tel"
                                                placeholder="KIN PHONE NUMBER (OPTIONAL)"
                                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-900 dark:text-white"
                                                value={formData.emergencyContactPhone}
                                                onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 relative z-10 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        Abandon Registry
                    </button>
                    
                    <div className="flex gap-3">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 text-slate-900 dark:text-white"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        
                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 cursor-pointer"
                            >
                                Continue
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 disabled:hover:scale-100 transition-all shadow-xl shadow-indigo-500/20 disabled:shadow-none cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <PlusIcon className="w-4 h-4" />
                                )}
                                <span>{isSubmitting ? 'Registering Intake...' : 'Finalize Intake'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
