import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Institution, User, Course, LetterheadConfig } from '../../types';
import type { LeavingCertificateTemplateType, LeavingCertificateFormData, LeavingCertificateRecord } from '../../types/leavingCertificate';
import {
    LEAVING_CERTIFICATE_TEMPLATES,
    detectDefaultTemplate,
    generateCertificateSerial,
    CBC_COMPETENCY_PRESETS,
    SOCIAL_BEHAVIOUR_PRESETS,
    CSL_PARTICIPATION_PRESETS,
    SECONDARY_SPORTS_CLUBS_PRESETS
} from '../../utils/leavingCertificateTemplates';
import { LeavingCertificateSheet } from './LeavingCertificateSheet';
import { StudentClearanceManager } from './StudentClearanceManager';
import { AlumnaOnboardingModal } from './AlumnaOnboardingModal';
import { apiService } from '../../services/apiService';
import { supabase } from '../../lib/supabase';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';
import { XIcon } from '../icons/XIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { formatStampDate } from '../../utils/stampGenerator';

export interface LeavingCertificateManagerProps {
    currentInstitution?: Institution | null;
    currentUser?: User | null;
    users?: User[];
    courses?: Course[];
    letterheadConfig?: LetterheadConfig;
}

const resolveStudentAdm = (student: any): string => {
    if (!student) return '';
    return String(
        student.admissionNumber ||
        student.admission_number ||
        student.studentAdmissionNumber ||
        student.admNo ||
        student.adm_no ||
        student.metadata?.admissionNumber ||
        student.metadata?.admNo ||
        student.idNumber ||
        ''
    ).trim();
};

export const LeavingCertificateManager: React.FC<LeavingCertificateManagerProps> = ({
    currentInstitution,
    currentUser,
    users = [],
    courses = []
}) => {
    // Determine default template
    const initialTemplate = useMemo(() => detectDefaultTemplate(currentInstitution), [currentInstitution]);
    const [templateType, setTemplateType] = useState<LeavingCertificateTemplateType>(initialTemplate);
    const [viewMode, setViewMode] = useState<'editor' | 'clearance' | 'registry'>('editor');
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState<number>(0.85);
    const [isAlumnaModalOpen, setIsAlumnaModalOpen] = useState(false);

    // Prevent background scrolling when preview modal is open
    useEffect(() => {
        if (isPreviewModalOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isPreviewModalOpen]);

    // List of student users
    const students = useMemo(() => {
        return users.filter(u => u.role === 'student');
    }, [users]);

    // Student selection & search
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

    // Issued registry records
    const [issuedRecords, setIssuedRecords] = useState<LeavingCertificateRecord[]>([]);
    const [registrySearch, setRegistrySearch] = useState('');
    const [registryFilter, setRegistryFilter] = useState<'all' | LeavingCertificateTemplateType>('all');
    const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

    // Form state initialized to default
    const [formData, setFormData] = useState<LeavingCertificateFormData>(() => {
        const todayFormatted = formatStampDate(new Date(), 'DD/MM/YYYY');
        const defaultTmpl = LEAVING_CERTIFICATE_TEMPLATES[initialTemplate] || LEAVING_CERTIFICATE_TEMPLATES.jss;
        return {
            certificateNo: generateCertificateSerial(1),
            assessmentNo: '',
            studentName: '',
            admissionNumber: '',
            dateOfBirth: '',
            schoolName: currentInstitution?.name || '',
            enrollmentDate: `08/01/${new Date().getFullYear() - 2}`,
            entryGrade: defaultTmpl.defaultEntryGrade,
            leavingDate: todayFormatted,
            exitGrade: defaultTmpl.defaultExitGrade,
            approvedCourse: defaultTmpl.defaultCourse,
            coreCompetenciesAchieved: CBC_COMPETENCY_PRESETS[0],
            socialBehaviourReport: SOCIAL_BEHAVIOUR_PRESETS[0],
            cslParticipation: CSL_PARTICIPATION_PRESETS[0],
            academicAbility: 'Hardworking, intellectually inquisitive, and demonstrates high academic industry.',
            characterConduct: 'Exemplary character, obedient to school authorities, and trustworthy.',
            gamesAndSports: 'Participated actively in track athletics, football, and team competitions.',
            clubsAndSocieties: 'Science & Robotics Club, Scouts Movement, Environmental Conservation Society.',
            responsibilitiesHeld: 'Class Prefect, Library Assistant, Team Captain.',
            headteacherGeneralRemarks: 'An outstanding learner with great future promise. Recommended for next level.',
            headteacherName: currentUser?.name || (currentInstitution as any)?.headteacher || 'HEADTEACHER',
            issueDate: todayFormatted,
            includeOfficialStamp: true,
            stampDepartment: 'OFFICIAL LEAVING CERTIFICATE'
        };
    });

    // Auto-update school name and headteacher when institution/user changes
    useEffect(() => {
        if (currentInstitution?.name && !formData.schoolName) {
            setFormData(prev => ({ ...prev, schoolName: currentInstitution.name }));
        }
        if (currentUser?.name && formData.headteacherName === 'HEADTEACHER') {
            setFormData(prev => ({ ...prev, headteacherName: currentUser.name }));
        }
    }, [currentInstitution, currentUser]);

    // Update template defaults when template is switched
    const handleSwitchTemplate = (newType: LeavingCertificateTemplateType) => {
        setTemplateType(newType);
        const meta = LEAVING_CERTIFICATE_TEMPLATES[newType];
        setFormData(prev => ({
            ...prev,
            entryGrade: meta.defaultEntryGrade,
            exitGrade: meta.defaultExitGrade,
            approvedCourse: meta.defaultCourse
        }));
    };

    // Load previously issued certificates from Supabase or localStorage
    const loadIssuedRecords = useCallback(async () => {
        const instId = currentInstitution?.id;
        const localKey = `eduai_leaving_certificates_${instId || 'global'}`;

        try {
            if (supabase && instId) {
                const { data, error } = await supabase
                    .from('school_leaving_certificates')
                    .select('*')
                    .eq('institution_id', instId)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    setIssuedRecords(data as LeavingCertificateRecord[]);
                    localStorage.setItem(localKey, JSON.stringify(data));
                    return;
                }
            }
        } catch (e) {
            console.warn("Could not query Supabase school_leaving_certificates, falling back to local storage:", e);
        }

        // Fallback to local storage
        const saved = localStorage.getItem(localKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setIssuedRecords(parsed);
            } catch (e) {
                console.error("Failed to parse saved leaving certificates:", e);
            }
        }
    }, [currentInstitution]);

    useEffect(() => {
        loadIssuedRecords();
    }, [loadIssuedRecords]);

    // Quick fill when a student is selected
    const handleSelectStudent = (studentId: string) => {
        setSelectedStudentId(studentId);
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const adm = resolveStudentAdm(student);
        const dob = (student as any).dateOfBirth || (student as any).dob || (student as any).metadata?.dateOfBirth || '';
        const enrolled = (student as any).enrollmentDate || (student as any).enrolledAt || `08/01/${new Date().getFullYear() - 2}`;
        const studentClass = student.className || (student as any).grade || (student as any).course || '';

        setFormData(prev => ({
            ...prev,
            studentId: student.id,
            studentName: student.name || 'STUDENT NAME',
            admissionNumber: adm,
            assessmentNo: prev.assessmentNo || adm || `ASS-${Math.floor(100000 + Math.random() * 900000)}`,
            dateOfBirth: dob ? formatStampDate(dob, 'DD/MM/YYYY') : prev.dateOfBirth,
            enrollmentDate: enrolled ? formatStampDate(enrolled, 'DD/MM/YYYY') : prev.enrollmentDate,
            exitGrade: studentClass ? studentClass.toUpperCase() : prev.exitGrade
        }));

        setNotificationMessage(`Selected ${student.name}. Details auto-populated.`);
        setTimeout(() => setNotificationMessage(null), 3500);
    };

    // Filter students for search dropdown
    const filteredStudents = useMemo(() => {
        if (!studentSearchTerm.trim()) return students.slice(0, 50);
        const term = studentSearchTerm.toLowerCase();
        return students.filter(s => {
            const name = (s.name || '').toLowerCase();
            const adm = resolveStudentAdm(s).toLowerCase();
            return name.includes(term) || adm.includes(term);
        });
    }, [students, studentSearchTerm]);

    // Actual Certificate Generation & Archival
    const executeIssueCertificate = async (alumniMemberId?: string) => {
        const instId = currentInstitution?.id || 'inst_default';
        const serial = formData.certificateNo || generateCertificateSerial(issuedRecords.length + 1);

        const newRecord: LeavingCertificateRecord = {
            id: `cert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            institution_id: instId,
            student_id: selectedStudentId || null,
            certificate_no: serial,
            assessment_no: formData.assessmentNo || formData.admissionNumber || '—',
            template_type: templateType,
            student_name: formData.studentName,
            admission_no: formData.admissionNumber,
            payload: {
                ...formData,
                alumniMemberId: alumniMemberId || (formData as any).alumniMemberId
            },
            headteacher_name: formData.headteacherName,
            issue_date: formData.issueDate,
            status: 'issued',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Persist to Supabase if table exists
        try {
            if (supabase && currentInstitution?.id) {
                await supabase
                    .from('school_leaving_certificates')
                    .upsert({
                        id: newRecord.id,
                        institution_id: instId,
                        student_id: newRecord.student_id,
                        certificate_no: newRecord.certificate_no,
                        assessment_no: newRecord.assessment_no,
                        template_type: newRecord.template_type,
                        student_name: newRecord.student_name,
                        admission_no: newRecord.admission_no,
                        payload: newRecord.payload,
                        headteacher_name: newRecord.headteacher_name,
                        issue_date: newRecord.issue_date,
                        status: newRecord.status
                    });
            }
        } catch (err) {
            console.warn("Could not save to Supabase directly, persisting to local storage:", err);
        }

        // Local storage update
        const updated = [newRecord, ...issuedRecords];
        setIssuedRecords(updated);
        localStorage.setItem(`eduai_leaving_certificates_${instId}`, JSON.stringify(updated));

        // Advance serial for next issuance
        setFormData(prev => ({
            ...prev,
            certificateNo: generateCertificateSerial(updated.length + 1)
        }));

        setNotificationMessage(`Official Leaving Certificate #${serial} successfully issued & archived!`);
        setTimeout(() => setNotificationMessage(null), 4000);
    };

    // Alumnae Registration Callback
    const handleCompleteAlumnaRegistration = async (alumnaData: {
        personalEmail: string;
        phone: string;
        nextDestination: string;
        alumniMemberId: string;
    }) => {
        const instId = currentInstitution?.id || 'inst_default';
        const newAlumna = {
            id: `alm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: formData.studentName,
            admissionNumber: formData.admissionNumber,
            email: alumnaData.personalEmail,
            phone: alumnaData.phone,
            schoolId: instId,
            schoolName: currentInstitution?.name || 'School',
            graduationYear: new Date().getFullYear().toString(),
            course: formData.approvedCourse || 'Junior Secondary School',
            profession: alumnaData.nextDestination,
            company: 'Student / Graduate',
            location: (currentInstitution as any)?.county || 'Kenya',
            bio: `Class of ${new Date().getFullYear()} graduate.`,
            status: 'verified',
            joinedAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('alumni_members', newAlumna);
        } catch (_) {}

        try {
            const existing = JSON.parse(localStorage.getItem('alumni_members') || localStorage.getItem(`eduai_alumni_${instId}`) || '[]');
            localStorage.setItem('alumni_members', JSON.stringify([newAlumna, ...existing]));
            localStorage.setItem(`eduai_alumni_${instId}`, JSON.stringify([newAlumna, ...existing]));
        } catch (_) {}

        setIsAlumnaModalOpen(false);
        setNotificationMessage(`Alumna profile ${alumnaData.alumniMemberId} registered! Finalizing Leaving Certificate...`);
        await executeIssueCertificate(alumnaData.alumniMemberId);
    };

    // Issue & Save Certificate Handler (Validates Clearance & Alumnae Portal)
    const handleIssueCertificate = async () => {
        if (!formData.studentName.trim()) {
            alert('Please enter or select a student name before issuing.');
            return;
        }

        const instId = currentInstitution?.id || 'inst_default';

        // 1. Check Junior School Clearance Status
        try {
            const clearanceKey = `eduai_student_clearances_${instId}`;
            const clearances = JSON.parse(localStorage.getItem(clearanceKey) || '[]');
            const studentClearance = clearances.find((c: any) => 
                (selectedStudentId && c.studentId === selectedStudentId) ||
                (formData.admissionNumber && c.admissionNumber === formData.admissionNumber)
            );

            if (!studentClearance || studentClearance.principalApproval?.releaseOfDocuments !== 'yes') {
                const proceed = window.confirm(
                    `⚠️ Clearance Incomplete / Not Approved:\n\n` +
                    `Student ${formData.studentName} has not been approved for release on the Junior School Clearance Form (Release of Documents: Yes by Deputy Principal).\n\n` +
                    `• Click "Cancel" to inspect/fill the Clearance Form.\n` +
                    `• Click "OK" to proceed with Administrative Override.`
                );
                if (!proceed) {
                    setViewMode('clearance');
                    return;
                }
            }
        } catch (_) {}

        // 2. Check Alumnae Portal Registration
        try {
            const localAlumni = JSON.parse(localStorage.getItem('alumni_members') || localStorage.getItem(`eduai_alumni_${instId}`) || '[]');
            const isEnrolled = localAlumni.some((m: any) => 
                (m.admissionNumber && formData.admissionNumber && m.admissionNumber.toLowerCase() === formData.admissionNumber.toLowerCase()) ||
                (m.name && m.name.toLowerCase() === formData.studentName.toLowerCase())
            );

            if (!isEnrolled) {
                // Trigger mandatory Alumnae Portal Sign-Up Step
                setIsAlumnaModalOpen(true);
                return;
            }
        } catch (_) {}

        await executeIssueCertificate();
    };

    // Print action using native window.print with isolated print stylesheet
    const handlePrintCertificate = () => {
        window.print();
    };

    // Load an issued record back into the editor
    const handleLoadRecord = (record: LeavingCertificateRecord) => {
        setTemplateType(record.template_type);
        setFormData(record.payload);
        setSelectedStudentId(record.student_id || '');
        setViewMode('editor');
        setNotificationMessage(`Loaded Certificate #${record.certificate_no} for ${record.student_name}.`);
        setTimeout(() => setNotificationMessage(null), 3000);
    };

    // Delete an issued record
    const handleDeleteRecord = async (id: string) => {
        if (!confirm('Are you sure you want to delete this issued certificate record?')) return;
        const instId = currentInstitution?.id || 'inst_default';
        try {
            if (supabase && currentInstitution?.id) {
                await supabase.from('school_leaving_certificates').delete().eq('id', id);
            }
        } catch (e) {
            console.warn(e);
        }

        const filtered = issuedRecords.filter(r => r.id !== id);
        setIssuedRecords(filtered);
        localStorage.setItem(`eduai_leaving_certificates_${instId}`, JSON.stringify(filtered));
    };

    // Filter registry records
    const filteredRecords = useMemo(() => {
        return issuedRecords.filter(r => {
            const matchesTemplate = registryFilter === 'all' || r.template_type === registryFilter;
            const term = registrySearch.toLowerCase();
            const matchesSearch =
                !term ||
                r.student_name.toLowerCase().includes(term) ||
                r.certificate_no.toLowerCase().includes(term) ||
                r.admission_no.toLowerCase().includes(term) ||
                r.assessment_no.toLowerCase().includes(term);
            return matchesTemplate && matchesSearch;
        });
    }, [issuedRecords, registryFilter, registrySearch]);

    return (
        <div className="space-y-6 w-full text-slate-900 dark:text-slate-100">
            {/* Embedded Print CSS to guarantee clean A4 Certificate Printout */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #leaving-certificate-sheet, #leaving-certificate-sheet * {
                        visibility: visible !important;
                    }
                    #leaving-certificate-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                }
            `}} />

            {/* Notification Toast */}
            {notificationMessage && (
                <div className="fixed top-6 right-6 z-[999999] bg-emerald-600 text-white font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                    <CheckCircleIcon className="w-5 h-5 shrink-0" />
                    <span>{notificationMessage}</span>
                </div>
            )}

            {/* Header / Statistics & View Switcher */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                            <AcademicCapIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    School Leaving Certificate Hub
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    Official Ministry Templates
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Issue, customize, and print official Leaving Certificates for Junior Secondary (JSS), Primary (KPSEA/KCPE), and Secondary (KCSE) schools.
                            </p>
                        </div>
                    </div>

                    {/* View Switcher & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setViewMode('editor')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    viewMode === 'editor'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Certificate Designer
                            </button>
                            <button
                                onClick={() => setViewMode('clearance')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'clearance'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>Clearance Forms</span>
                            </button>
                            <button
                                onClick={() => setViewMode('registry')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'registry'
                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>Issued Registry</span>
                                <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded-md text-[10px]">
                                    {issuedRecords.length}
                                </span>
                            </button>
                        </div>

                        <button
                            onClick={() => setIsPreviewModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                            <EyeIcon className="w-4 h-4" />
                            <span>Preview Full A4</span>
                        </button>

                        <button
                            onClick={handlePrintCertificate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            <span>Print Certificate</span>
                        </button>
                    </div>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Issued</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{issuedRecords.length}</span>
                    </div>
                    <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">JSS Transition</span>
                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                            {issuedRecords.filter(r => r.template_type === 'jss').length}
                        </span>
                    </div>
                    <div className="p-3 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Primary (KPSEA)</span>
                        <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                            {issuedRecords.filter(r => r.template_type === 'primary').length}
                        </span>
                    </div>
                    <div className="p-3 bg-purple-500/5 rounded-2xl border border-purple-500/20">
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block">Secondary (KCSE)</span>
                        <span className="text-xl font-black text-purple-700 dark:text-purple-300">
                            {issuedRecords.filter(r => r.template_type === 'secondary').length}
                        </span>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {viewMode === 'editor' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: Configuration, Student Selector & Inputs (7 Columns) */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* 1. Template Switcher Banner */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                                Select Official Ministry Template
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {(Object.keys(LEAVING_CERTIFICATE_TEMPLATES) as LeavingCertificateTemplateType[]).map((type) => {
                                    const meta = LEAVING_CERTIFICATE_TEMPLATES[type];
                                    const isSelected = templateType === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleSwitchTemplate(type)}
                                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 text-amber-900 dark:text-amber-300'
                                                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-xs uppercase tracking-wide block">
                                                    {type === 'jss' ? 'JSS Transition' : type === 'primary' ? 'Primary' : 'Secondary'}
                                                </span>
                                                {isSelected && <ShieldCheckIcon className="w-4 h-4 text-amber-600" />}
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight line-clamp-2">
                                                {meta.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Student Search & Quick Auto-populate */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                                    Select Enrolled Learner (Auto-fill Data)
                                </label>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {students.length} Enrolled Students Available
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Search Student Input */}
                                <div className="relative">
                                    <SearchIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter student by name or adm..."
                                        value={studentSearchTerm}
                                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Student Select Dropdown */}
                                <div>
                                    <select
                                        value={selectedStudentId}
                                        onChange={(e) => handleSelectStudent(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                    >
                                        <option value="">— Or choose student directly —</option>
                                        {filteredStudents.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} {resolveStudentAdm(s) ? `(Adm: ${resolveStudentAdm(s)})` : ''} {s.className ? `— ${s.className}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Certificate Core Form Fields */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                                Learner Particulars & Institutional Record
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Student Name */}
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Learner Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.studentName}
                                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value.toUpperCase() })}
                                        placeholder="e.g. BRIAN KIPCHUMBA MAINA"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white"
                                    />
                                </div>

                                {/* Assessment No. / Index No. */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        {LEAVING_CERTIFICATE_TEMPLATES[templateType].idBoxLabel} *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.assessmentNo}
                                        onChange={(e) => setFormData({ ...formData, assessmentNo: e.target.value.toUpperCase() })}
                                        placeholder="e.g. 10203040/025"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black tracking-widest text-slate-900 dark:text-white uppercase"
                                    />
                                </div>

                                {/* Admission Number */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Admission Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.admissionNumber}
                                        onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value.toUpperCase() })}
                                        placeholder="e.g. 4821"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase"
                                    />
                                </div>

                                {/* Date of Birth */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Date of Birth
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        placeholder="e.g. 14/05/2011"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                                    />
                                </div>

                                {/* School Name */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        School Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value.toUpperCase() })}
                                        placeholder="e.g. LENANA ACADEMY"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase"
                                    />
                                </div>

                                {/* Enrolled Date & Entry Grade */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Enrolled Date
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.enrollmentDate}
                                        onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                                        placeholder="e.g. 08/01/2024"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Enrolled Grade / Class
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.entryGrade}
                                        onChange={(e) => setFormData({ ...formData, entryGrade: e.target.value.toUpperCase() })}
                                        placeholder="e.g. GRADE 7"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase"
                                    />
                                </div>

                                {/* Leaving Date & Exit Grade */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Leaving Date
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.leavingDate}
                                        onChange={(e) => setFormData({ ...formData, leavingDate: e.target.value })}
                                        placeholder="e.g. 24/11/2026"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Exit Grade / Class
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.exitGrade}
                                        onChange={(e) => setFormData({ ...formData, exitGrade: e.target.value.toUpperCase() })}
                                        placeholder="e.g. GRADE 9"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase"
                                    />
                                </div>

                                {/* Approved Course */}
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Approved Course Completed
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.approvedCourse}
                                        onChange={(e) => setFormData({ ...formData, approvedCourse: e.target.value.toUpperCase() })}
                                        placeholder="e.g. JUNIOR SECONDARY EDUCATION (CBC)"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. Assessment Reports & Competencies */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    {templateType === 'jss' ? 'CBC Competency & Behaviour Reports' : 'Academic & Conduct Evaluation'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            coreCompetenciesAchieved: CBC_COMPETENCY_PRESETS[Math.floor(Math.random() * CBC_COMPETENCY_PRESETS.length)],
                                            socialBehaviourReport: SOCIAL_BEHAVIOUR_PRESETS[Math.floor(Math.random() * SOCIAL_BEHAVIOUR_PRESETS.length)],
                                            cslParticipation: CSL_PARTICIPATION_PRESETS[Math.floor(Math.random() * CSL_PARTICIPATION_PRESETS.length)]
                                        }));
                                    }}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    <span>Auto-populate Smart Presets</span>
                                </button>
                            </div>

                            {/* JSS SPECIFIC FIELDS */}
                            {templateType === 'jss' && (
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Head Teacher&apos;s Report on Core Competencies Achieved
                                            </label>
                                            <div className="flex gap-1">
                                                {CBC_COMPETENCY_PRESETS.map((p, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, coreCompetenciesAchieved: p })}
                                                        className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950"
                                                        title={p}
                                                    >
                                                        Preset {idx + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={formData.coreCompetenciesAchieved}
                                            onChange={(e) => setFormData({ ...formData, coreCompetenciesAchieved: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Learner&apos;s Social/Behaviour Report
                                            </label>
                                            <div className="flex gap-1">
                                                {SOCIAL_BEHAVIOUR_PRESETS.map((p, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, socialBehaviourReport: p })}
                                                        className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950"
                                                        title={p}
                                                    >
                                                        Preset {idx + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={formData.socialBehaviourReport}
                                            onChange={(e) => setFormData({ ...formData, socialBehaviourReport: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Learner&apos;s Participation in Community Service Learning (CSL)
                                            </label>
                                            <div className="flex gap-1">
                                                {CSL_PARTICIPATION_PRESETS.map((p, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, cslParticipation: p })}
                                                        className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950"
                                                        title={p}
                                                    >
                                                        Preset {idx + 1}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={formData.cslParticipation}
                                            onChange={(e) => setFormData({ ...formData, cslParticipation: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* PRIMARY SPECIFIC FIELDS */}
                            {templateType === 'primary' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                            Head Teacher&apos;s Report on Academic Ability & Industry
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.academicAbility}
                                            onChange={(e) => setFormData({ ...formData, academicAbility: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                            Character & Conduct
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.characterConduct}
                                            onChange={(e) => setFormData({ ...formData, characterConduct: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                            Games, Athletics & Special Responsibilities
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.gamesAndSports}
                                            onChange={(e) => setFormData({ ...formData, gamesAndSports: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SECONDARY SPECIFIC FIELDS */}
                            {templateType === 'secondary' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                            Principal&apos;s Report on Academic Ability & General Attitude
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.academicAbility}
                                            onChange={(e) => setFormData({ ...formData, academicAbility: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                            Character & Disciplinary Record
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.characterConduct}
                                            onChange={(e) => setFormData({ ...formData, characterConduct: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                                Games & Sports
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={formData.gamesAndSports}
                                                onChange={(e) => setFormData({ ...formData, gamesAndSports: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                                Clubs, Societies & Responsibilities
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={formData.clubsAndSocieties}
                                                onChange={(e) => setFormData({ ...formData, clubsAndSocieties: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. Issuance & Stamp Details */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                                Signature & Official Rubber Stamp
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        {templateType === 'secondary' ? "Principal's Full Name" : "Headteacher's Full Name"} *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.headteacherName}
                                        onChange={(e) => setFormData({ ...formData, headteacherName: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        Issue Date
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.issueDate}
                                        onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                                    />
                                </div>

                                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                            Include Official Digital Rubber Stamp
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            Renders the institutional stamp with official dater and department code
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.includeOfficialStamp}
                                        onChange={(e) => setFormData({ ...formData, includeOfficialStamp: e.target.checked })}
                                        className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Final Issuance Action Buttons */}
                            <div className="pt-3 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewModalOpen(true)}
                                    className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                >
                                    Full Preview
                                </button>

                                <button
                                    type="button"
                                    onClick={handleIssueCertificate}
                                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    <span>Issue & Archive Certificate</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Interactive Live Mini Preview (5 Columns) */}
                    <div className="lg:col-span-5 sticky top-6 space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Live Certificate Preview (A4 Scaled)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewModalOpen(true)}
                                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <EyeIcon className="w-3 h-3" />
                                    <span>Expand Full A4</span>
                                </button>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                    Real-time Dynamic
                                </span>
                            </div>
                        </div>

                        {/* Interactive Scaled Sheet Preview Card */}
                        <div className="bg-slate-200/70 dark:bg-slate-950 p-4 rounded-3xl border border-slate-300 dark:border-slate-800 flex justify-center items-center shadow-inner overflow-hidden max-h-[880px] overflow-y-auto">
                            <div className="transform scale-[0.55] sm:scale-[0.62] md:scale-[0.68] lg:scale-[0.58] xl:scale-[0.70] origin-top my-2">
                                <LeavingCertificateSheet
                                    templateType={templateType}
                                    data={formData}
                                    institution={currentInstitution}
                                    scale={1}
                                    showStamp={formData.includeOfficialStamp}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            ) : viewMode === 'clearance' ? (
                <StudentClearanceManager
                    currentInstitution={currentInstitution}
                    currentUser={currentUser}
                    users={users}
                    onClearanceApproved={(clearance) => {
                        setSelectedStudentId(clearance.studentId);
                        setFormData(prev => ({
                            ...prev,
                            studentName: clearance.studentName,
                            admissionNumber: clearance.admissionNumber,
                            assessmentNo: clearance.assessmentNo || prev.assessmentNo,
                            exitGrade: clearance.grade || prev.exitGrade
                        }));
                        setViewMode('editor');
                        setNotificationMessage(`Clearance approved for ${clearance.studentName}! Switched to Leaving Certificate Designer.`);
                    }}
                />
            ) : (
                /* REGISTRY VIEW: Issued Certificates History */
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 space-y-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Issued Certificates Archive Registry
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Search, review, re-print, and manage official leaving certificates previously issued to learners.
                            </p>
                        </div>

                        {/* Registry Filters */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative grow md:grow-0">
                                <SearchIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search certificate, student, adm..."
                                    value={registrySearch}
                                    onChange={(e) => setRegistrySearch(e.target.value)}
                                    className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-64"
                                />
                            </div>

                            <select
                                value={registryFilter}
                                onChange={(e) => setRegistryFilter(e.target.value as any)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                            >
                                <option value="all">All Templates</option>
                                <option value="jss">JSS Transition</option>
                                <option value="primary">Primary (KPSEA)</option>
                                <option value="secondary">Secondary (KCSE)</option>
                            </select>
                        </div>
                    </div>

                    {/* Registry Table */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase tracking-widest font-black text-[10px] border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3.5">Serial No.</th>
                                    <th className="px-4 py-3.5">Template</th>
                                    <th className="px-4 py-3.5">Learner Name</th>
                                    <th className="px-4 py-3.5">Adm / Ass. No.</th>
                                    <th className="px-4 py-3.5">Issue Date</th>
                                    <th className="px-4 py-3.5">Headteacher</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                            No issued leaving certificates match your search or filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map(record => (
                                        <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                                                {record.certificate_no}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                    record.template_type === 'jss'
                                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                                        : record.template_type === 'primary'
                                                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                                        : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                                }`}>
                                                    {record.template_type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-black text-slate-900 dark:text-white uppercase">
                                                {record.student_name}
                                            </td>
                                            <td className="px-4 py-3 font-mono">
                                                {record.admission_no || record.assessment_no || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {record.issue_date}
                                            </td>
                                            <td className="px-4 py-3 uppercase text-slate-500">
                                                {record.headteacher_name}
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => handleLoadRecord(record)}
                                                    className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                                >
                                                    Edit / Re-issue
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleLoadRecord(record);
                                                        setIsPreviewModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                                >
                                                    Print
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord(record.id)}
                                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                                                    title="Delete Record"
                                                >
                                                    <Trash2Icon className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* FULL A4 PREVIEW MODAL */}
            {isPreviewModalOpen && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsPreviewModalOpen(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col h-[94vh] max-h-[96vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Official Certificate Print Preview</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        A4 Standard
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    {LEAVING_CERTIFICATE_TEMPLATES[templateType].label} • Serial #{formData.certificateNo}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Zoom Controls */}
                                <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewScale(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                                        title="Zoom Out"
                                    >
                                        −
                                    </button>
                                    <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px] min-w-[42px] text-center">
                                        {Math.round(previewScale * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewScale(prev => Math.min(1.4, parseFloat((prev + 0.1).toFixed(2))))}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                                        title="Zoom In"
                                    >
                                        +
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewScale(0.85)}
                                        className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                    >
                                        Fit
                                    </button>
                                </div>

                                <button
                                    onClick={handlePrintCertificate}
                                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    <span>Print Sheet</span>
                                </button>
                                <button
                                    onClick={() => setIsPreviewModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                    title="Close Preview"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Printable Sheet Container */}
                        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950 flex justify-center items-start">
                            <div className="shadow-2xl transition-all duration-200 origin-top">
                                <LeavingCertificateSheet
                                    templateType={templateType}
                                    data={formData}
                                    institution={currentInstitution}
                                    scale={previewScale}
                                    showStamp={formData.includeOfficialStamp}
                                />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Mandatory Alumnae Portal Onboarding Modal */}
            <AlumnaOnboardingModal
                isOpen={isAlumnaModalOpen}
                onClose={() => setIsAlumnaModalOpen(false)}
                studentName={formData.studentName}
                admissionNumber={formData.admissionNumber}
                studentId={selectedStudentId}
                currentInstitution={currentInstitution}
                onComplete={handleCompleteAlumnaRegistration}
            />
        </div>
    );
};
