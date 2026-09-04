import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UsersIcon } from '../icons/UsersIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { HeartIcon, CalendarIcon, IdentificationIcon } from './HealthIcons';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { apiService } from '../../services/apiService';
import { generatePatientHistoryPdf } from '../../services/pdfService';
import { isEduInstitution } from '../../utils/roleUtils';
import { SmartHISPatientImporterModal } from './SmartHISPatientImporterModal';
import { isSyntheticAdmNo, isPlaceholderEmail } from '../../utils/academicUtils';
import { User } from '../../types';

export interface Patient {
    id: string;
    fullName: string;
    gender: string;
    dob?: string;
    contact?: string;
    admissionNumber?: string;
    bloodGroup?: string;
    insuranceProvider?: string;
    shaNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergies?: string;
    institutionId?: string;
    gradeLevel?: string;
    stream?: string;
    createdAt?: string;
    [key: string]: any;
}

export function getPatientAdmNo(p: any, users: User[] = [], enrollments: any[] = []): string {
    if (!p) return '';
    const direct = (
        p.admissionNumber ||
        p.admission_number ||
        p.admissionNo ||
        p.admission_no ||
        p.admNo ||
        p.adm_no ||
        p.studentAdmissionNumber ||
        p.student_admission_number ||
        p.customPatientId ||
        p.custom_patient_id ||
        p.patientNumber ||
        p.patient_number ||
        p.opNumber ||
        p.op_number ||
        p.studentNumber ||
        p.student_number ||
        p.studentId ||
        p.student_id ||
        p.assessmentNo ||
        p.assessmentNumber ||
        p.metadata?.admissionNumber ||
        p.metadata?.admission_number ||
        p.metadata?.admissionNo ||
        p.metadata?.admNo ||
        p.metadata?.adm_no
    );

    // If direct candidate is valid and genuinely non-synthetic, return immediately
    if (direct && !isSyntheticAdmNo(direct)) {
        return String(direct).trim();
    }

    // Try finding genuine admission number in student_enrollments
    let effectiveEnrollments = enrollments;
    if (!effectiveEnrollments || !Array.isArray(effectiveEnrollments) || effectiveEnrollments.length === 0) {
        try {
            const instKey = p.institutionId || p.institution_id || '';
            const rawEnr = (instKey ? localStorage.getItem(`eduai_student_enrollments_${instKey}`) : null) ||
                           localStorage.getItem('eduai_student_enrollments_default') ||
                           (instKey ? localStorage.getItem(`eduai_students_${instKey}`) : null) ||
                           localStorage.getItem('eduai_students_default') ||
                           (instKey ? localStorage.getItem(`eduai_enrollments_${instKey}`) : null);
            if (rawEnr) {
                const parsed = JSON.parse(rawEnr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    effectiveEnrollments = parsed;
                }
            }
        } catch (e) {}
    }

    const pName = (p.fullName || p.name || '').trim().toLowerCase();
    const pUserId = String(p.userId || p.user_id || p.id || '').trim();
    const nameTokens = pName.split(/\s+/).filter(Boolean);

    if (effectiveEnrollments && Array.isArray(effectiveEnrollments) && effectiveEnrollments.length > 0) {
        const matchedEnr = effectiveEnrollments.find((e: any) => {
            if (!e) return false;
            const eUserId = String(e.userId || e.user_id || '').trim();
            const eStudentId = String(e.studentId || e.student_id || '').trim();
            const eId = String(e.id || '').trim();

            if (pUserId && (eUserId === pUserId || eStudentId === pUserId || eId === pUserId)) return true;

            if (pName) {
                const eName = String(e.name || e.fullName || e.studentName || e.student_name || e.metadata?.studentName || e.metadata?.fullName || '').trim().toLowerCase();
                if (eName && (eName === pName || (nameTokens.length >= 2 && (eName.includes(pName) || pName.includes(eName))))) {
                    return true;
                }
            }
            return false;
        });

        if (matchedEnr) {
            let mMeta = matchedEnr.metadata;
            if (typeof mMeta === 'string' && mMeta.trim().startsWith('{')) {
                try { mMeta = JSON.parse(mMeta); } catch (e) {}
            }
            const enrAdm = (
                matchedEnr.admissionNumber ||
                matchedEnr.admission_number ||
                matchedEnr.admissionNo ||
                matchedEnr.admission_no ||
                matchedEnr.admNo ||
                matchedEnr.adm_no ||
                matchedEnr.registrationNo ||
                matchedEnr.registration_number ||
                matchedEnr.assessmentNo ||
                matchedEnr.assessment_no ||
                matchedEnr.studentId ||
                matchedEnr.student_id ||
                matchedEnr.customId ||
                mMeta?.admissionNumber ||
                mMeta?.admission_number ||
                mMeta?.admissionNo ||
                mMeta?.admNo ||
                mMeta?.studentId ||
                mMeta?.assessmentNo
            );
            if (enrAdm && !isSyntheticAdmNo(enrAdm)) {
                return String(enrAdm).trim();
            }
        }
    }

    // Match in school directory users
    if (users && users.length > 0) {
        const pEmail = (p.email || '').trim().toLowerCase();
        const pContact = (p.contact || p.phoneNumber || '').trim();

        const matched = users.find(u => {
            if (!u) return false;
            if (pUserId && u.id === pUserId) return true;
            if (pName && u.name && u.name.trim().toLowerCase() === pName) return true;
            if (pEmail && u.email && u.email.trim().toLowerCase() === pEmail) return true;
            if (pContact && u.phoneNumber && u.phoneNumber.trim() === pContact) return true;
            return false;
        });

        if (matched) {
            const userAdm = (
                matched.admissionNumber ||
                matched.admission_number ||
                matched.admissionNo ||
                (matched as any).admission_no ||
                (matched as any).admNo ||
                (matched as any).adm_no ||
                matched.metadata?.admissionNumber ||
                matched.metadata?.admission_number ||
                matched.metadata?.admissionNo ||
                matched.metadata?.admNo ||
                matched.metadata?.adm_no ||
                matched.metadata?.student_admission_number ||
                matched.metadata?.studentId ||
                matched.metadata?.student_id ||
                (matched as any).assessmentNo ||
                (matched as any).assessmentNumber ||
                matched.metadata?.assessmentNo ||
                matched.staffId ||
                matched.metadata?.staffId
            );
            if (userAdm && !isSyntheticAdmNo(userAdm)) {
                return String(userAdm).trim();
            }

            // Also check if matched user has an enrollment in effectiveEnrollments
            if (effectiveEnrollments && Array.isArray(effectiveEnrollments)) {
                const uEnr = effectiveEnrollments.find((e: any) => e && (e.userId === matched.id || e.id === matched.id));
                if (uEnr) {
                    const uEnrAdm = uEnr.admissionNumber || uEnr.admission_number || uEnr.metadata?.admissionNumber || uEnr.assessmentNo;
                    if (uEnrAdm && !isSyntheticAdmNo(uEnrAdm)) {
                        return String(uEnrAdm).trim();
                    }
                }
            }
        }
    }

    // Direct fallback if present
    if (direct && String(direct).trim() !== '' && String(direct).trim() !== '—' && String(direct).trim() !== '-' && String(direct).trim() !== 'N/A' && String(direct).trim().toLowerCase() !== 'pending') {
        return String(direct).trim();
    }

    return '';
}

export function getPatientGrade(p: any, users: User[] = []): string {
    if (!p) return '';
    const direct = p.gradeLevel || (p as any).grade_level || p.classLevel || (p as any).class_level || p.studentClass || (p as any).className;
    if (direct && String(direct).trim() !== '') return String(direct).trim();
    if (users && users.length > 0) {
        const pName = (p.fullName || p.name || '').trim().toLowerCase();
        const pUserId = p.userId || p.user_id || p.id;
        const matched = users.find(u => u && ((pUserId && u.id === pUserId) || (pName && u.name && u.name.trim().toLowerCase() === pName)));
        if (matched) {
            return (
                matched.studentClass ||
                matched.metadata?.studentClass ||
                matched.metadata?.gradeLevel || 
                matched.metadata?.class_level || 
                matched.metadata?.grade_level || 
                matched.metadata?.className ||
                matched.metadata?.class ||
                matched.metadata?.grade ||
                matched.metadata?.courseLevel ||
                matched.metadata?.courseLevelName ||
                matched.metadata?.academicLevel ||
                (matched as any).gradeLevel || 
                (matched as any).className || 
                ''
            );
        }
    }
    return '';
}

export function getPatientStream(p: any, users: User[] = []): string {
    if (!p) return '';
    const direct = p.stream || (p as any).stream_name || (p as any).streamName;
    if (direct && String(direct).trim() !== '') return String(direct).trim();
    if (users && users.length > 0) {
        const pName = (p.fullName || p.name || '').trim().toLowerCase();
        const pUserId = p.userId || p.user_id || p.id;
        const matched = users.find(u => u && ((pUserId && u.id === pUserId) || (pName && u.name && u.name.trim().toLowerCase() === pName)));
        if (matched) {
            return (
                matched.metadata?.stream || 
                matched.metadata?.streamName || 
                matched.metadata?.stream_name || 
                (matched as any).stream || 
                ''
            );
        }
    }
    return '';
}

export function getPatientContact(p: any, users: User[] = [], enrollments: any[] = []): string {
    if (!p) return '';
    const direct = (p.contact || (p as any).phoneNumber || (p as any).phone || '').trim();
    if (direct && !isPlaceholderEmail(direct) && direct !== '—' && direct !== '-') return direct;

    const pName = (p.fullName || p.name || '').trim().toLowerCase();
    const pUserId = p.userId || p.user_id || p.id;

    if (users && users.length > 0) {
        const matched = users.find(u => u && ((pUserId && u.id === pUserId) || (pName && u.name && u.name.trim().toLowerCase() === pName)));
        if (matched) {
            const phone = matched.phoneNumber || matched.metadata?.parentPhone || matched.metadata?.guardianPhone || matched.metadata?.emergencyContactPhone;
            if (phone && String(phone).trim()) return String(phone).trim();
            if (matched.email && !isPlaceholderEmail(matched.email)) return String(matched.email).trim();
        }
    }

    if (enrollments && enrollments.length > 0) {
        const matchedEnr = enrollments.find(e => e && ((pUserId && e.userId === pUserId) || (pName && (e.name?.toLowerCase() === pName || e.metadata?.studentName?.toLowerCase() === pName))));
        if (matchedEnr) {
            const enrPhone = matchedEnr.metadata?.parentPhone || matchedEnr.metadata?.guardianPhone || matchedEnr.parentPhone;
            if (enrPhone && String(enrPhone).trim()) return String(enrPhone).trim();
        }
    }

    if (p.emergencyContactPhone && String(p.emergencyContactPhone).trim() && p.emergencyContactPhone !== '--- --- ---') {
        return String(p.emergencyContactPhone).trim();
    }

    return '';
}

interface EduPulsePatientsListProps {
    patients: Patient[];
    users?: User[];
    enrollments?: any[];
    onRegisterPatient: () => void;
    onSelectPatient: (patientId: string) => void;
    onPatientUpdated: () => void;
    institutionId?: string;
    institutionData?: any;
    isEdu?: boolean;
    onPreviewPdf?: (pdfUrl: string) => void;
}

/* ─── Inline Edit Modal ─── */
function EditPatientModal({
    patient,
    users = [],
    enrollments = [],
    isEdu = false,
    onClose,
    onSave
}: {
    patient: Patient;
    users?: User[];
    enrollments?: any[];
    isEdu?: boolean;
    onClose: () => void;
    onSave: (updated: Patient) => Promise<void>;
}) {
    const existingOp = getPatientAdmNo(patient, users, enrollments);
    const existingGrade = getPatientGrade(patient, users);
    const existingStream = getPatientStream(patient, users);
    const existingContact = getPatientContact(patient, users, enrollments);

    const [formData, setFormData] = useState({
        ...patient,
        admissionNumber: existingOp,
        admission_number: existingOp,
        customPatientId: existingOp,
        custom_patient_id: existingOp,
        patientNumber: existingOp,
        patient_number: existingOp,
        opNumber: existingOp,
        op_number: existingOp,
        gradeLevel: existingGrade,
        stream: existingStream,
        contact: existingContact
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const opVal = (formData.admissionNumber || formData.admission_number || formData.customPatientId || formData.custom_patient_id || formData.patientNumber || formData.patient_number || formData.opNumber || formData.op_number || '').trim();
            const updatedRecord: Patient = {
                ...formData,
                admissionNumber: opVal,
                admission_number: opVal,
                customPatientId: opVal,
                custom_patient_id: opVal,
                patientNumber: opVal,
                patient_number: opVal,
                opNumber: opVal,
                op_number: opVal
            };
            await onSave(updatedRecord);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white placeholder-slate-400";
    const labelCls = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2";

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="p-7 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                            Edit <span className="text-indigo-200">Patient Record</span>
                        </h2>
                        <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">
                            {isEdu ? 'Admission No' : 'File No'}: {formData.admissionNumber || formData.admission_number || 'N/A'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-7 space-y-5">
                    
                    {/* Row 1: Name & Adm / File No */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Full Name</label>
                            <input type="text" required placeholder="PATIENT FULL NAME" value={formData.fullName}
                                onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>{isEdu ? 'Student Admission Number' : 'Patient File / OP Number'}</label>
                            <input type="text" placeholder={isEdu ? 'ADM-001' : 'PAT-0001'} value={formData.admissionNumber || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData(p => ({
                                        ...p,
                                        admissionNumber: val,
                                        admission_number: val,
                                        customPatientId: val,
                                        custom_patient_id: val,
                                        patientNumber: val,
                                        patient_number: val,
                                        opNumber: val,
                                        op_number: val
                                    }));
                                }}
                                className={inputCls} />
                        </div>
                    </div>

                    {/* Row: Department & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>{isEdu ? 'Grade / Class Level' : 'Department / Ward'}</label>
                            <input type="text" placeholder={isEdu ? 'Grade 4 / Form 2' : 'General OPD / Ward'} value={formData.gradeLevel || ''}
                                onChange={e => setFormData(p => ({ ...p, gradeLevel: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>{isEdu ? 'Stream / Class Group' : 'Category / Clinic Type'}</label>
                            <input type="text" placeholder={isEdu ? 'East / Blue / Alpha' : 'Outpatient / Inpatient'} value={formData.stream || ''}
                                onChange={e => setFormData(p => ({ ...p, stream: e.target.value }))}
                                className={inputCls} />
                        </div>
                    </div>

                    {/* Row 2: DOB & Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Date of Birth</label>
                            <input type="date" value={formData.dob || ''}
                                onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Gender</label>
                            <select value={formData.gender}
                                onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}
                                className={`${inputCls} appearance-none`}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Contact & Blood Group */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Contact / Phone Number</label>
                            <input type="text" placeholder="+254 700 000 000" value={formData.contact || ''}
                                onChange={e => setFormData(p => ({ ...p, contact: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Blood Group</label>
                            <select value={formData.bloodGroup || ''}
                                onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value }))}
                                className={`${inputCls} appearance-none`}>
                                <option value="">Unknown</option>
                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 4: Emergency Contact */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Emergency Contact Name</label>
                            <input type="text" placeholder="PARENT / GUARDIAN" value={formData.emergencyContactName || ''}
                                onChange={e => setFormData(p => ({ ...p, emergencyContactName: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Emergency Contact Phone</label>
                            <input type="text" placeholder="+254 700 000 000" value={formData.emergencyContactPhone || ''}
                                onChange={e => setFormData(p => ({ ...p, emergencyContactPhone: e.target.value }))}
                                className={inputCls} />
                        </div>
                    </div>

                    {/* Row 5: Allergies */}
                    <div>
                        <label className={labelCls}>Known Allergies</label>
                        <textarea rows={2} placeholder="E.G. PENICILLIN, PEANUTS, DUST MITES..." value={formData.allergies || ''}
                            onChange={e => setFormData(p => ({ ...p, allergies: e.target.value }))}
                            className={`${inputCls} resize-none`} />
                    </div>

                    {/* Save Button */}
                    <button type="submit" disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-3 italic">
                        {isSaving ? 'SAVING CHANGES...' : 'SAVE PATIENT RECORD'} <SparklesIcon className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

/* ─── Age Calculator ─── */
const calcAge = (dob?: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

/* ─── Gender badge colors ─── */
const genderColor = (g: string) => {
    if (g === 'Male') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (g === 'Female') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};
function PatientHistoryModal({
    patient,
    institutionId,
    institutionData,
    users = [],
    enrollments = [],
    isEdu = false,
    onPreviewPdf,
    onClose
}: {
    patient: Patient;
    institutionId?: string;
    institutionData?: any;
    users?: User[];
    enrollments?: any[];
    isEdu?: boolean;
    onPreviewPdf?: (pdfUrl: string) => void;
    onClose: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [vitals, setVitals] = useState<any[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'timeline' | 'prescriptions'>('timeline');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handlePreviewPdf = async () => {
        if (!onPreviewPdf) return;
        setIsGeneratingPdf(true);
        try {
            const logo = institutionData?.logoUrl || null;
            const patientForPdf = {
                ...patient,
                admissionNumber: getPatientAdmNo(patient, users, enrollments),
                admission_number: getPatientAdmNo(patient, users, enrollments),
                gradeLevel: getPatientGrade(patient, users),
                stream: getPatientStream(patient, users),
                contact: getPatientContact(patient, users, enrollments)
            };
            const pdfDataUri = await generatePatientHistoryPdf(
                patientForPdf as any,
                events,
                vitals,
                prescriptions,
                institutionData || { name: 'Health Service' },
                logo
            );
            onPreviewPdf(pdfDataUri);
        } catch (err) {
            console.error("Failed to generate patient history PDF:", err);
            alert("Failed to generate PDF report.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    useEffect(() => {
        const loadHistory = async () => {
            if (!patient.id || !institutionId) return;
            setLoading(true);
            try {
                const evData = await apiService.fetchModuleRecords('his_clinical_events', institutionId, undefined, {
                    filter: { patient_id: patient.id },
                    order: 'created_at.desc'
                });
                
                const vtData = await apiService.fetchModuleRecords('his_vital_statistics', institutionId, undefined, {
                    filter: { patient_id: patient.id },
                    order: 'recorded_at.desc'
                });

                const rxData = await apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, {
                    filter: { patient_id: patient.id },
                    order: 'created_at.desc'
                });

                const rxWithItems = await Promise.all((rxData || []).map(async (rx: any) => {
                    try {
                        const items = await apiService.fetchModuleRecords('his_prescription_items', undefined, undefined, {
                            filter: { prescription_id: rx.id }
                        });
                        return { ...rx, items: items || [] };
                    } catch (e) {
                        console.error(`Failed to fetch items for rx ${rx.id}:`, e);
                        return { ...rx, items: [] };
                    }
                }));

                setEvents(evData || []);
                setVitals(vtData || []);
                setPrescriptions(rxWithItems);
            } catch (err) {
                console.error("Failed to load patient history:", err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [patient.id, institutionId]);

    const groupedVitals = useMemo(() => {
        const groups: Record<string, any[]> = {};
        vitals.forEach(v => {
            const time = v.recordedAt || v.recorded_at || '';
            if (time) {
                const minuteKey = time.substring(0, 16); 
                if (!groups[minuteKey]) {
                    groups[minuteKey] = [];
                }
                groups[minuteKey].push(v);
            }
        });
        return groups;
    }, [vitals]);

    const timelineItems = useMemo(() => {
        const items: any[] = [];
        events.forEach(e => {
            const sortTs = `${e.date || ''}T${e.time || '00:00'}:00`;
            items.push({
                id: e.id,
                type: 'visit',
                timestamp: sortTs,
                displayDate: e.date ? `${e.date} @ ${e.time || '—'}` : '—',
                title: e.event || 'Clinical Consultation',
                subtitle: `Department: ${e.dept || 'OPD / General'} · Attending: ${e.provider || 'Staff'}`,
                raw: e
            });
        });

        Object.entries(groupedVitals).forEach(([minuteKey, vitalsList]) => {
            const timeSample = vitalsList[0]?.recordedAt || vitalsList[0]?.recorded_at || minuteKey;
            items.push({
                id: `vitals_${minuteKey}`,
                type: 'vitals',
                timestamp: timeSample,
                displayDate: timeSample ? new Date(timeSample).toLocaleString() : '—',
                title: 'Diagnostics & Vitals Update',
                subtitle: 'Vital parameters logged',
                raw: vitalsList
            });
        });

        prescriptions.forEach(rx => {
            const sortTs = rx.createdAt || rx.created_at || '';
            items.push({
                id: rx.id,
                type: 'prescription',
                timestamp: sortTs,
                displayDate: sortTs ? new Date(sortTs).toLocaleString() : '—',
                title: 'Medical Prescription Issued',
                subtitle: `Prescribed by ${rx.doctorName || 'Doctor'}`,
                raw: rx
            });
        });

        return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }, [events, groupedVitals, prescriptions]);

    const age = calcAge(patient.dob);

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-3xl rounded-[2.5rem] p-8 max-h-[85vh] flex flex-col relative shadow-2xl animate-zoom-in">
                <div className="flex items-start justify-between pb-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-xl shadow-indigo-600/30">
                            {patient.fullName[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {patient.fullName}
                                </h3>
                                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${genderColor(patient.gender)}`}>
                                    {patient.gender}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {isEdu 
                                    ? `Adm: ${getPatientAdmNo(patient, users) || 'N/A'}` 
                                    : `File No: ${getPatientAdmNo(patient, users) || 'N/A'}`
                                } · Age: {age !== null ? `${age} yrs` : 'N/A'} · Blood: {patient.bloodGroup || 'UNK'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 my-4 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'timeline'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                        }`}
                    >
                        📋 Clinical Timeline ({timelineItems.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('prescriptions')}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'prescriptions'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                        }`}
                    >
                        💊 Prescriptions ({prescriptions.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-2">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading full patient profile...</p>
                        </div>
                    ) : activeTab === 'timeline' ? (
                        timelineItems.length === 0 ? (
                            <div className="py-20 text-center opacity-50">
                                <HeartIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No medical encounters logged yet</p>
                                <p className="text-[9px] text-slate-500 mt-1">Visits, vitals, and prescriptions recorded will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-4 relative before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                                {timelineItems.map((item) => (
                                    <div key={item.id} className="relative flex gap-4 pl-12">
                                        <div className={`absolute left-4 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                                            item.type === 'visit' ? 'bg-indigo-600' : item.type === 'vitals' ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}>
                                        </div>

                                        <div className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    item.type === 'visit' ? 'bg-indigo-500/10 text-indigo-500' : item.type === 'vitals' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                    {item.type}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.displayDate}</span>
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                                                {item.title}
                                            </h4>
                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">{item.subtitle}</p>

                                            {item.type === 'visit' && item.raw?.reason && (
                                                <div className="mt-2 text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                                                    Reason: {item.raw.reason}
                                                </div>
                                            )}

                                            {item.type === 'vitals' && Array.isArray(item.raw) && (
                                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {item.raw.map((v: any, idx: number) => (
                                                        <div key={idx} className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-white/5">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase">{v.vital_type || v.vitalType}</p>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{v.value} <span className="text-[8px] text-slate-400 font-normal">{v.unit}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {item.type === 'prescription' && (
                                                <div className="mt-2 space-y-1">
                                                    {(item.raw.items || []).map((rxItem: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-[9px]">
                                                            <span className="font-black text-indigo-500 uppercase">{rxItem.drugName || rxItem.drug_name}</span>
                                                            <span className="text-slate-400 font-mono">{rxItem.dosage} · {rxItem.duration}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        prescriptions.length === 0 ? (
                            <div className="py-20 text-center opacity-50">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No prescriptions issued</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {prescriptions.map((rx) => (
                                    <div key={rx.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                Prescribed by {rx.doctorName || 'Medical Officer'}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">
                                                {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : '—'}
                                            </span>
                                        </div>
                                        {rx.notes && <p className="text-[9px] text-slate-400 italic mb-3">"{rx.notes}"</p>}

                                        <div className="space-y-1.5">
                                            {(rx.items || []).map((it: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">{it.drugName || it.drug_name}</p>
                                                        <p className="text-[8px] text-slate-400">{it.dosage} · {it.frequency} · {it.duration}</p>
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                        it.status === 'Dispensed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {it.status || 'Prescribed'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Total encounters logged: {timelineItems.length}
                    </p>
                    {onPreviewPdf && (
                        <button
                            onClick={handlePreviewPdf}
                            disabled={isGeneratingPdf}
                            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Building PDF...
                                </>
                            ) : (
                                <>
                                    📄 Preview PDF Report
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-8 py-3.5 bg-slate-900 dark:bg-white/5 text-white dark:text-slate-300 hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Close dossier
                    </button>
                </div>

            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export function EduPulsePatientsList({
    patients,
    users = [],
    enrollments: propEnrollments = [],
    onRegisterPatient,
    onSelectPatient,
    onPatientUpdated,
    institutionId,
    institutionData,
    isEdu: isEduProp,
    onPreviewPdf,
}: EduPulsePatientsListProps) {
    const isEdu = isEduProp !== undefined ? isEduProp : isEduInstitution(institutionData);
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
    const [selectedGrade, setSelectedGrade] = useState<string>('All');
    const [selectedStream, setSelectedStream] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'name' | 'adm' | 'recent'>('name');
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
    const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
    const [notification, setNotification] = useState('');

    const [isSyncing, setIsSyncing] = useState(false);

    // Resolve enrollments with localStorage fallback if not explicitly passed
    const enrollments = useMemo(() => {
        if (propEnrollments && propEnrollments.length > 0) return propEnrollments;
        try {
            const instKey = institutionId || '';
            const rawEnr = (instKey ? localStorage.getItem(`eduai_student_enrollments_${instKey}`) : null) ||
                           localStorage.getItem('eduai_student_enrollments_default') ||
                           (instKey ? localStorage.getItem(`eduai_students_${instKey}`) : null) ||
                           localStorage.getItem('eduai_students_default') ||
                           (instKey ? localStorage.getItem(`eduai_enrollments_${instKey}`) : null);
            if (rawEnr) {
                const parsed = JSON.parse(rawEnr);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return [];
    }, [propEnrollments, institutionId]);

    // Auto-sync whenever a patient is registered anywhere in HIS
    useEffect(() => {
        const handleSync = () => {
            if (onPatientUpdated) onPatientUpdated();
        };
        window.addEventListener('his_patients_updated', handleSync);
        return () => window.removeEventListener('his_patients_updated', handleSync);
    }, [onPatientUpdated]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            if (onPatientUpdated) await onPatientUpdated();
        } finally {
            setTimeout(() => setIsSyncing(false), 600);
        }
    };

    // Pagination states
    const itemsPerPage = 8;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, genderFilter, selectedGrade, selectedStream, sortBy]);

    const gradeOptions = useMemo(() => {
        const grades = new Set<string>();
        patients.forEach(p => {
            const grade = getPatientGrade(p, users);
            if (grade) grades.add(grade);
        });
        return ['All', ...Array.from(grades).sort()];
    }, [patients, users]);

    const streamOptions = useMemo(() => {
        const streams = new Set<string>();
        patients.forEach(p => {
            const stream = getPatientStream(p, users);
            if (stream) streams.add(stream);
        });
        return ['All', ...Array.from(streams).sort()];
    }, [patients, users]);

    const filtered = useMemo(() => {
        return patients
            .filter(p => {
                const q = searchTerm.toLowerCase();
                const adm = getPatientAdmNo(p, users, enrollments);
                const grade = getPatientGrade(p, users);
                const stream = getPatientStream(p, users);
                const contact = getPatientContact(p, users, enrollments) || p.contact || '';
                const matchesSearch = !q
                    || p.fullName.toLowerCase().includes(q)
                    || adm.toLowerCase().includes(q)
                    || contact.includes(q);
                const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
                const matchesGrade = selectedGrade === 'All' || grade === selectedGrade;
                const matchesStream = selectedStream === 'All' || stream === selectedStream;
                return matchesSearch && matchesGender && matchesGrade && matchesStream;
            })
            .sort((a, b) => {
                if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
                if (sortBy === 'adm') {
                    const admA = getPatientAdmNo(a, users, enrollments);
                    const admB = getPatientAdmNo(b, users, enrollments);
                    return admA.localeCompare(admB);
                }
                if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
                return 0;
            });
    }, [patients, users, enrollments, searchTerm, genderFilter, selectedGrade, selectedStream, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const paginatedPatients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filtered.slice(startIndex, startIndex + itemsPerPage);
    }, [filtered, currentPage]);

    const handleSaveEdit = async (updated: Patient) => {
        const opVal = updated.admissionNumber || (updated as any).admission_number || (updated as any).opNumber || (updated as any).op_number || (updated as any).customPatientId || (updated as any).patientNumber || '';
        const syncedRecord: Patient = {
            ...updated,
            institutionId,
            institution_id: institutionId,
            admissionNumber: opVal,
            admission_number: opVal,
            customPatientId: opVal,
            custom_patient_id: opVal,
            patientNumber: opVal,
            patient_number: opVal,
            opNumber: opVal,
            op_number: opVal
        };
        await apiService.saveModuleRecord('his_patients', syncedRecord);
        onPatientUpdated();
        setNotification(`${updated.fullName} (OP: ${opVal || 'N/A'}) record updated successfully.`);
        setTimeout(() => setNotification(''), 4000);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">

            {/* Toast */}
            {notification && (
                <div className="fixed top-6 right-8 z-[300] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 ring-4 ring-indigo-400/30 animate-bounce-in">
                    <SparklesIcon className="w-5 h-5" />
                    <p className="text-[11px] font-black uppercase tracking-widest">{notification}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 p-7 rounded-[2rem] bg-gradient-to-r from-indigo-900/40 via-indigo-950/10 to-transparent border border-indigo-500/10">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Patient <span className="text-indigo-400">Health Registry</span></h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {patients.length} patient{patients.length !== 1 ? 's' : ''} registered
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setIsExcelImportOpen(true)}
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 dark:text-emerald-300 px-5 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg shadow-emerald-500/10"
                        title="Import patients in bulk from Excel (.xlsx, .xls) or CSV"
                    >
                        <ArrowUpTrayIcon className="w-4 h-4 text-emerald-400" />
                        <span>Import Excel</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 px-5 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                        title="Reload latest patients from database"
                    >
                        <span className={`inline-block ${isSyncing ? 'animate-spin' : ''}`}>🔄</span>
                        <span>{isSyncing ? 'Syncing...' : 'Sync Registry'}</span>
                    </button>
                    <button
                        onClick={onRegisterPatient}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 flex-shrink-0">
                        <PlusIcon className="w-4 h-4" /> Register New Patient
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={isEdu ? "SEARCH BY STUDENT NAME, ADMISSION # OR CONTACT..." : "SEARCH BY PATIENT NAME, FILE # OR CONTACT..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                            <XIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Gender filter */}
                <div className="flex gap-2">
                    {(['All', 'Male', 'Female'] as const).map(g => (
                        <button key={g} onClick={() => setGenderFilter(g)}
                            className={`px-5 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                genderFilter === g
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-indigo-500'
                            }`}>
                            {g}
                        </button>
                    ))}
                </div>

                {/* Department / Grade filter */}
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
                    className="bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white appearance-none min-w-[130px]">
                    <option value="All">{isEdu ? 'All Classes' : 'All Departments'}</option>
                    {gradeOptions.filter(g => g !== 'All').map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>

                {/* Category / Stream filter */}
                <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)}
                    className="bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white appearance-none min-w-[130px]">
                    <option value="All">{isEdu ? 'All Streams' : 'All Categories'}</option>
                    {streamOptions.filter(s => s !== 'All').map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white appearance-none">
                    <option value="name">Sort: A–Z</option>
                    <option value="adm">{isEdu ? 'Sort: Admission #' : 'Sort: Patient File #'}</option>
                    <option value="recent">Sort: Most Recent</option>
                </select>
            </div>

            {/* Count badge */}
            <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-3 py-1 rounded-full">
                    {filtered.length} of {patients.length} Records
                </span>
                {searchTerm && (
                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                        · Filtered by "{searchTerm}"
                    </span>
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                        <tr>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">{isEdu ? 'Admission #' : 'Patient File #'}</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Age / DOB</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Blood Grp</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-7 py-16 text-center">
                                    <UsersIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No patients match your search</p>
                                    <button onClick={onRegisterPatient} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                        Register First Patient
                                    </button>
                                </td>
                            </tr>
                        )}
                        {paginatedPatients.map((p) => {
                            const age = calcAge(p.dob);
                            const admNo = getPatientAdmNo(p, users, enrollments);
                            const grade = getPatientGrade(p, users);
                            const stream = getPatientStream(p, users);
                            const contact = getPatientContact(p, users, enrollments) || p.contact;
                            return (
                                <tr key={p.id} className="hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors group">
                                    
                                    {/* Name Avatar */}
                                    <td className="px-7 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md shadow-indigo-500/20">
                                                {p.fullName[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black italic tracking-tight text-slate-900 dark:text-white">{p.fullName}</p>
                                                <div className="flex gap-1.5 mt-0.5 flex-wrap items-center">
                                                    {grade && (
                                                        <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/30 inline-block">
                                                            {grade} {stream ? `• ${stream}` : ''}
                                                        </span>
                                                    )}
                                                    {p.allergies && (
                                                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 px-1.5 py-0.5 rounded inline-block">
                                                            ⚠ {p.allergies.slice(0, 20)}{p.allergies.length > 20 ? '…' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-7 py-5">
                                        <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/30">
                                            {admNo || '—'}
                                        </span>
                                    </td>

                                    {/* Age / DOB */}
                                    <td className="px-7 py-5">
                                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">
                                            {age !== null ? `${age} yrs` : '—'}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-500 mt-0.5">{p.dob || 'N/A'}</p>
                                    </td>

                                    {/* Gender */}
                                    <td className="px-7 py-5">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${genderColor(p.gender)}`}>
                                            {p.gender}
                                        </span>
                                    </td>

                                    {/* Contact */}
                                    <td className="px-7 py-5 text-[10px] font-black text-slate-600 dark:text-slate-400">
                                        {contact || '—'}
                                    </td>

                                    {/* Blood Group */}
                                    <td className="px-7 py-5">
                                        {p.bloodGroup ? (
                                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/50 dark:border-rose-800/30 px-2.5 py-1 rounded-full uppercase">
                                                {p.bloodGroup}
                                            </span>
                                        ) : <span className="text-slate-400 text-[10px]">—</span>}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-7 py-5 text-right space-x-2">
                                        <button
                                            onClick={() => setHistoryPatient(p)}
                                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white border border-blue-200 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105"
                                        >
                                            📋 History
                                        </button>
                                        <button
                                            onClick={() => setEditingPatient(p)}
                                            className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105"
                                        >
                                            ✏ Edit
                                        </button>
                                        <button
                                            onClick={() => onSelectPatient(p.id)}
                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-700/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105"
                                        >
                                            Open 360 →
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {filtered.length === 0 && (
                    <div className="text-center py-16">
                        <UsersIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No patients match your search</p>
                        <button onClick={onRegisterPatient} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                            Register First Patient
                        </button>
                    </div>
                )}
                {paginatedPatients.map((p) => {
                    const age = calcAge(p.dob);
                    const admNo = getPatientAdmNo(p, users, enrollments);
                    const grade = getPatientGrade(p, users);
                    const stream = getPatientStream(p, users);
                    const contact = getPatientContact(p, users, enrollments) || p.contact;
                    return (
                        <div key={p.id} className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 shadow-xl">
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0">
                                        {p.fullName[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black uppercase italic text-slate-900 dark:text-white">{p.fullName}</h4>
                                        <div className="flex gap-2 items-center mt-1">
                                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                {admNo || (isEdu ? 'No Adm No' : 'No File No')}
                                            </span>
                                            {grade && (
                                                <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-300 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                                    {grade} {stream ? `• ${stream}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${genderColor(p.gender)}`}>
                                    {p.gender}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Age</p>
                                    <p className="text-[11px] font-black">{age !== null ? `${age} yrs` : '—'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Blood Group</p>
                                    <p className="text-[11px] font-black text-rose-600">{p.bloodGroup || '—'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl col-span-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                                    <p className="text-[11px] font-black">{contact || '—'}</p>
                                </div>
                            </div>

                            {p.allergies && (
                                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200/50 dark:border-rose-800/30">
                                    <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                        ⚠ Known Allergies: {p.allergies}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                <button
                                    onClick={() => onSelectPatient(p.id)}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center shadow-md shadow-indigo-600/20"
                                >
                                    Select Patient
                                </button>
                                <button
                                    onClick={() => setHistoryPatient(p)}
                                    className="px-3 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    title="View Medical Dossier"
                                >
                                    Dossier
                                </button>
                                <button
                                    onClick={() => setEditingPatient(p)}
                                    className="px-3 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    title="Edit Patient Details"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 disabled:opacity-40 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            ◄ Prev
                        </button>
                        {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            // Show first, last, and current +/- 1
                            if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-xl text-[9px] font-black uppercase transition-all ${
                                            currentPage === pageNum
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            }
                            if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                return <span key={pageNum} className="text-slate-400 text-xs">...</span>;
                            }
                            return null;
                        })}
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 disabled:opacity-40 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            Next ►
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingPatient && (
                <EditPatientModal
                    patient={editingPatient}
                    users={users}
                    enrollments={enrollments}
                    isEdu={isEdu}
                    onClose={() => setEditingPatient(null)}
                    onSave={handleSaveEdit}
                />
            )}

            {/* History Modal */}
            {historyPatient && (
                <PatientHistoryModal
                    patient={historyPatient}
                    institutionId={institutionId}
                    institutionData={institutionData}
                    users={users}
                    enrollments={enrollments}
                    isEdu={isEdu}
                    onPreviewPdf={onPreviewPdf}
                    onClose={() => setHistoryPatient(null)}
                />
            )}

            {/* Smart Excel Importer Modal */}
            {isExcelImportOpen && (
                <SmartHISPatientImporterModal
                    onClose={() => setIsExcelImportOpen(false)}
                    onImportCompleted={() => {
                        if (onPatientUpdated) onPatientUpdated();
                        setNotification('Excel patients successfully imported into registry.');
                        setTimeout(() => setNotification(''), 4000);
                    }}
                    institutionId={institutionId}
                    existingPatients={patients}
                />
            )}
        </div>
    );
};

export default EduPulsePatientsList;
