import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

interface PatientItem {
    id: string;
    name?: string;
    fullName?: string;
    full_name?: string;
    role?: string;
    metadata?: { gradeLevel?: string; class?: string; admissionNumber?: string; [key: string]: any };
    admissionNumber?: string;
    admission_number?: string;
    patientNumber?: string;
    patient_number?: string;
    customPatientId?: string;
    custom_patient_id?: string;
    opNumber?: string;
    op_number?: string;
    gradeLevel?: string;
    grade_level?: string;
    stream?: string;
    [key: string]: any;
}

interface AddAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (appointmentData: any) => Promise<void>;
    /** Pass true when rendering inside EduPulse school context */
    isEdu?: boolean;
    /** Pre-fill referred-by field with the logged-in teacher's name */
    referredBy?: string;
    /** List of students/users the teacher can select on behalf of */
    students?: PatientItem[];
    /** List of clinic/hospital patients */
    patients?: PatientItem[];
    /** Pre-selected patient if opened from a specific row */
    initialPatient?: PatientItem | null;
    selectedPatient?: PatientItem | null;
    doctorName?: string;
}

export function AddAppointmentModal({
    isOpen,
    onClose,
    onAdd,
    isEdu = false,
    referredBy = '',
    students = [],
    patients = [],
    initialPatient = null,
    selectedPatient = null,
    doctorName = '',
}: AddAppointmentModalProps) {
    const defaultDoctor = isEdu ? 'School Nurse' : (doctorName || 'Medical Officer on Duty');

    const [formData, setFormData] = useState({
        patientName: '',
        patientId: '',
        studentClass: '',
        admissionNumber: '',
        doctorName: defaultDoctor,
        referredByTeacher: referredBy,
        specialty: isEdu ? 'General Wellness' : 'General Medicine',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        type: isEdu ? 'Health Check' : 'Initial Consultation',
        reason: '',
        status: 'Scheduled',
        paymentMethod: 'Cash',
        insuranceProvider: '',
        insurancePolicyNumber: '',
        // MCH fields
        mchClinicType: 'ANC' as 'ANC' | 'CWC' | 'PNC' | 'NBU' | 'FP' | 'Other',
        gestationWeeks: 20,
        targetVaccine: 'Penta 1 + Rota 1 (6 Wks)',
        gravidaPara: 'G1 P0+0',
        eddDate: '',
        mchNotes: '',
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Combine any passed student/patient pools
    const candidateList = (students && students.length > 0)
        ? students
        : (patients && patients.length > 0 ? patients : []);

    // Sync selected patient on open or prop change
    useEffect(() => {
        if (!isOpen) return;

        const target = initialPatient || selectedPatient || (candidateList.length === 1 ? candidateList[0] : null);
        if (target) {
            const name = target.fullName || target.name || target.full_name || '';
            const id = target.id || (name ? name.toLowerCase().replace(/\s+/g, '_') : '');
            const adm = target.admissionNumber || target.admission_number || target.customPatientId || target.custom_patient_id || target.patientNumber || target.patient_number || target.opNumber || target.op_number || '';
            const cls = target.metadata?.gradeLevel || target.metadata?.class || target.gradeLevel || target.grade_level || target.stream || '';

            setFormData(prev => ({
                ...prev,
                patientName: name || prev.patientName,
                patientId: id || prev.patientId,
                admissionNumber: adm || prev.admissionNumber,
                studentClass: cls || prev.studentClass,
                doctorName: prev.doctorName || defaultDoctor,
                referredByTeacher: referredBy || prev.referredByTeacher,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                doctorName: prev.doctorName || defaultDoctor,
                referredByTeacher: referredBy || prev.referredByTeacher,
            }));
        }
    }, [isOpen, initialPatient, selectedPatient, candidateList, defaultDoctor, referredBy]);

    if (!isOpen) return null;

    // Filtered patient list for autocomplete dropdown
    const filteredCandidates = candidateList.filter(s => {
        const name = (s.fullName || s.name || s.full_name || '').toLowerCase();
        const adm = (s.admissionNumber || s.admission_number || s.customPatientId || s.custom_patient_id || s.patientNumber || s.patient_number || s.opNumber || s.metadata?.admissionNumber || '').toLowerCase();
        const cls = (s.metadata?.gradeLevel || s.gradeLevel || s.grade_level || s.role || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || adm.includes(query) || cls.includes(query);
    });

    const handleSelectCandidate = (cand: PatientItem) => {
        const name = cand.fullName || cand.name || cand.full_name || '';
        const id = cand.id || name.toLowerCase().replace(/\s+/g, '_');
        const adm = cand.admissionNumber || cand.admission_number || cand.customPatientId || cand.custom_patient_id || cand.patientNumber || cand.patient_number || cand.opNumber || cand.metadata?.admissionNumber || '';
        const cls = cand.metadata?.gradeLevel || cand.metadata?.class || cand.gradeLevel || cand.grade_level || '';

        setFormData(prev => ({
            ...prev,
            patientName: name,
            patientId: id,
            admissionNumber: adm,
            studentClass: cls,
        }));
        setSearchQuery('');
    };

    const handleClearSelectedPatient = () => {
        setFormData(prev => ({
            ...prev,
            patientName: '',
            patientId: '',
            studentClass: '',
            admissionNumber: '',
        }));
        setSearchQuery('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const finalPatName = formData.patientName.trim() || (searchQuery.trim() || 'Walk-in Patient');
        const finalPatId = formData.patientId || (finalPatName ? finalPatName.toLowerCase().replace(/\s+/g, '_') : `his_p_${Date.now()}`);
        const finalDocName = formData.doctorName.trim() || defaultDoctor;

        try {
            await onAdd({
                ...formData,
                patientName: finalPatName,
                patient_name: finalPatName,
                patientId: finalPatId,
                patient_id: finalPatId,
                doctorName: finalDocName,
                doctor_name: finalDocName,
                admissionNumber: formData.admissionNumber,
                admission_number: formData.admissionNumber,
                // Include referral info in the saved record if in school context
                ...(isEdu ? { referredByTeacher: formData.referredByTeacher || referredBy } : {}),
            });
            onClose();
            // Reset form
            setFormData({
                patientName: '',
                patientId: '',
                studentClass: '',
                admissionNumber: '',
                doctorName: defaultDoctor,
                referredByTeacher: referredBy,
                specialty: isEdu ? 'General Wellness' : 'General Medicine',
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                type: isEdu ? 'Health Check' : 'Initial Consultation',
                reason: '',
                status: 'Scheduled',
                paymentMethod: 'Cash',
                insuranceProvider: '',
                insurancePolicyNumber: '',
                mchClinicType: 'ANC',
                gestationWeeks: 20,
                targetVaccine: 'Penta 1 + Rota 1 (6 Wks)',
                gravidaPara: 'G1 P0+0',
                eddDate: '',
                mchNotes: '',
            });
            setSearchQuery('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-zoom-in max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className={`p-8 border-b border-white/5 flex justify-between items-center ${isEdu ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-indigo-600'}`}>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                            {isEdu ? <>Book <span className="text-indigo-200">Student Visit</span></> : <>Schedule <span className="text-indigo-200">Patient Visit</span></>}
                        </h2>
                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">
                            {isEdu ? 'Referred by Class Teacher on behalf of Student' : 'Synchronizing Clinical Timeline'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all flex-shrink-0">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">

                    {/* ── Patient Identity / Selector ── */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <UsersIcon className="w-3 h-3 text-indigo-500" /> {isEdu ? 'Select Student' : 'Patient Identity'}
                        </label>

                        {formData.patientName ? (
                            /* Selected patient card badge */
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md">
                                    {formData.patientName[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                        {formData.patientName}
                                    </p>
                                    <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                        {formData.admissionNumber && <span className="font-mono bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">OP: {formData.admissionNumber}</span>}
                                        {formData.studentClass && <span>• {formData.studentClass}</span>}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearSelectedPatient}
                                    className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl text-slate-400 hover:text-rose-500 transition-all flex-shrink-0"
                                    title="Clear / Change Patient"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            /* Search / Autocomplete input */
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={isEdu ? "SEARCH STUDENT BY NAME OR ADM NO..." : "PATIENT NAME OR REGISTRY ID..."}
                                    value={searchQuery}
                                    onChange={e => {
                                        setSearchQuery(e.target.value);
                                        setFormData(prev => ({ ...prev, patientName: e.target.value, patientId: e.target.value.toLowerCase().replace(/\s+/g, '_') }));
                                    }}
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                                />

                                {/* Dropdown matching results */}
                                {searchQuery && filteredCandidates.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                                        {filteredCandidates.map((cand, idx) => {
                                            const cName = cand.fullName || cand.name || cand.full_name || 'Patient';
                                            const cAdm = cand.admissionNumber || cand.admission_number || cand.customPatientId || cand.custom_patient_id || cand.patientNumber || cand.patient_number || cand.opNumber || cand.metadata?.admissionNumber || '';
                                            const cCls = cand.metadata?.gradeLevel || cand.gradeLevel || cand.grade_level || cand.role || '';
                                            return (
                                                <button
                                                    key={cand.id || idx}
                                                    type="button"
                                                    onClick={() => handleSelectCandidate(cand)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-left border-b border-slate-50 dark:border-white/5 last:border-0"
                                                >
                                                    <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs flex-shrink-0">
                                                        {cName[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{cName}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                                            {cAdm && <span className="font-mono text-indigo-600 dark:text-indigo-400">OP: {cAdm}</span>}
                                                            {cCls && <span>• {cCls}</span>}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── EduPulse: Referred by Teacher (read-only) ── */}
                    {isEdu && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3 text-indigo-500" /> Referred by (Class Teacher)
                            </label>
                            <input
                                type="text"
                                value={formData.referredByTeacher}
                                onChange={e => setFormData(prev => ({ ...prev, referredByTeacher: e.target.value }))}
                                placeholder="TEACHER NAME..."
                                className="w-full bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-800/30 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all text-indigo-700 dark:text-indigo-300"
                            />
                        </div>
                    )}

                    {/* ── Practitioner / Health Area ── */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UsersIcon className="w-3 h-3 text-indigo-500" /> {isEdu ? 'Seen By' : 'Attending Practitioner'}
                            </label>
                            <input
                                type="text"
                                placeholder={isEdu ? 'E.G. SCHOOL NURSE' : 'E.G. DR. SMITH'}
                                value={formData.doctorName}
                                onChange={e => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3 text-indigo-500" /> {isEdu ? 'Health Area' : 'Specialty / Department'}
                            </label>
                            <select
                                value={formData.specialty}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        specialty: val,
                                        doctorName: val.includes('MCH') || val.includes('Maternity') || val.includes('CWC')
                                            ? 'Nurse Midwife Faith / Clinical Officer'
                                            : prev.doctorName,
                                        type: val.includes('MCH')
                                            ? 'Antenatal Care (ANC Visit 1 - 8 / MOH 405)'
                                            : val.includes('CWC')
                                            ? 'Child Welfare & Immunization (KEPI CWC)'
                                            : prev.type
                                    }));
                                }}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white appearance-none"
                            >
                                {isEdu ? (
                                    <>
                                        <option value="General Wellness">General Wellness</option>
                                        <option value="Mental Health">Mental Health</option>
                                        <option value="First Aid">First Aid / Injury</option>
                                        <option value="Dental">Dental Check</option>
                                        <option value="Eye Check">Eye Check</option>
                                        <option value="Nutrition">Nutrition & Diet</option>
                                        <option value="Referral">External Referral</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="General Medicine">General OPD</option>
                                        <option value="MCH / ANC & Maternity Hub">🤰 MCH / ANC &amp; Maternity Hub</option>
                                        <option value="Child Welfare Clinic (CWC & Immunization)">🍼 Child Welfare (CWC &amp; KEPI)</option>
                                        <option value="Postnatal Care (PNC) & Family Planning">🌺 Postnatal (PNC) &amp; Family Planning</option>
                                        <option value="Newborn Unit (NBU / KMC)">👶 Newborn Unit (NBU / KMC)</option>
                                        <option value="Dental">Dental Hub</option>
                                        <option value="Ophthalmology">Eye / Ocular</option>
                                        <option value="Diagnostics">Lab / Imaging</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* ── Date & Time ── */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <CalendarDaysIcon className="w-3 h-3 text-indigo-500" /> {isEdu ? 'Visit Date' : 'Target Date'}
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-xs font-bold outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ClockIcon className="w-3 h-3 text-indigo-500" /> Time
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-xs font-bold outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    {/* ── Payment Method (Cash vs Cover) ── */}
                    {!isEdu && (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                Payment Method for Visit
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, paymentMethod: 'Cash', insuranceProvider: '' }))}
                                    className={`py-3 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                                        formData.paymentMethod === 'Cash'
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'
                                    }`}
                                >
                                    💵 Cash / Cash Rate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, paymentMethod: 'Cover', insuranceProvider: p.insuranceProvider || 'SHA (Social Health Authority)' }))}
                                    className={`py-3 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                                        formData.paymentMethod === 'Cover'
                                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border-transparent text-slate-400'
                                    }`}
                                >
                                    🛡️ Cover / Insurance Rate
                                </button>
                            </div>

                            {formData.paymentMethod === 'Cover' && (
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <input
                                        type="text"
                                        placeholder="INSURANCE / SCHEME (E.G. SHA, CIC, JUBILEE)"
                                        value={formData.insuranceProvider}
                                        onChange={e => setFormData(p => ({ ...p, insuranceProvider: e.target.value }))}
                                        className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest outline-none dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="POLICY / MEMBER NUMBER"
                                        value={formData.insurancePolicyNumber}
                                        onChange={e => setFormData(p => ({ ...p, insurancePolicyNumber: e.target.value }))}
                                        className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest outline-none dark:text-white font-mono"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Visit Category ── */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <SparklesIcon className="w-3 h-3 text-indigo-500" /> Visit Category
                        </label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white appearance-none"
                        >
                            {isEdu ? (
                                <>
                                    <option value="Health Check">Routine Health Check</option>
                                    <option value="Triage">Acute Illness / Triage</option>
                                    <option value="First Aid">First Aid Treatment</option>
                                    <option value="Counselling">Guidance & Counselling</option>
                                    <option value="Follow-up">Medical Follow-up</option>
                                </>
                            ) : (
                                <>
                                    <option value="Initial Consultation">Initial Consultation</option>
                                    <option value="Antenatal Care (ANC Visit 1 - 8 / MOH 405)">🤰 Antenatal Care (ANC Visit / MOH 405)</option>
                                    <option value="Child Welfare & Immunization (KEPI CWC)">🍼 Child Welfare &amp; Immunization (KEPI CWC)</option>
                                    <option value="Postnatal Care (PNC 48h / 2wk / 6wk)">🌺 Postnatal Care (PNC 48h / 2wk / 6wk)</option>
                                    <option value="Newborn Unit (NBU / Incubator / KMC)">👶 Newborn Unit (NBU / KMC Follow-up)</option>
                                    <option value="PMTCT / High-Risk Antenatal Care">🧬 PMTCT / High-Risk Antenatal</option>
                                    <option value="Family Planning & Reproductive Health">🌸 Family Planning &amp; Reproductive Health</option>
                                    <option value="Follow-up Visit">Follow-up Visit</option>
                                    <option value="Specialist Review">Specialist Review</option>
                                    <option value="Emergency Triage">Emergency / Triage</option>
                                    <option value="Routine Checkup">Routine Checkup</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* ── 🤰 MCH / ANC / CWC Dynamic Parameters Card ── */}
                    {!isEdu && (formData.specialty.includes('MCH') || formData.specialty.includes('Maternity') || formData.specialty.includes('CWC') || formData.specialty.includes('Newborn') || formData.type.includes('ANC') || formData.type.includes('Child Welfare') || formData.type.includes('Postnatal') || formData.type.includes('Newborn') || formData.type.includes('PMTCT')) && (
                        <div className="p-5 bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-indigo-950/40 border-2 border-pink-500/40 rounded-3xl space-y-4 shadow-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🤰</span>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-300">
                                        MCH Clinical Scheduling Parameters
                                    </h4>
                                </div>
                                <span className="px-2.5 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full text-[8px] font-black uppercase tracking-widest">
                                    MOH 405 / KEPI
                                </span>
                            </div>

                            {/* MCH Sub-clinic Selector Pills */}
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'ANC', label: '🤰 ANC (Antenatal)' },
                                    { id: 'CWC', label: '🍼 CWC (Child)' },
                                    { id: 'PNC', label: '🌺 PNC (Postnatal)' },
                                    { id: 'NBU', label: '👶 NBU (Newborn)' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, mchClinicType: t.id as any }))}
                                        className={`py-2 px-1 text-center rounded-xl text-[8px] font-black uppercase tracking-wider transition-all ${
                                            formData.mchClinicType === t.id
                                                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                                                : 'bg-white/5 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Dynamic Fields by MCH Sub-clinic */}
                            {formData.mchClinicType === 'ANC' && (
                                <div className="grid grid-cols-3 gap-3 pt-1">
                                    <div>
                                        <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block mb-1">Gestation (Weeks)</label>
                                        <input
                                            type="number"
                                            min="4"
                                            max="42"
                                            value={formData.gestationWeeks}
                                            onChange={e => setFormData(p => ({ ...p, gestationWeeks: Number(e.target.value) }))}
                                            className="w-full bg-black/40 border border-pink-500/30 focus:border-pink-400 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block mb-1">Gravida / Parity</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. G2 P1+0"
                                            value={formData.gravidaPara}
                                            onChange={e => setFormData(p => ({ ...p, gravidaPara: e.target.value }))}
                                            className="w-full bg-black/40 border border-pink-500/30 focus:border-pink-400 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block mb-1">Expected Delivery (EDD)</label>
                                        <input
                                            type="date"
                                            value={formData.eddDate}
                                            onChange={e => setFormData(p => ({ ...p, eddDate: e.target.value }))}
                                            className="w-full bg-black/40 border border-pink-500/30 focus:border-pink-400 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.mchClinicType === 'CWC' && (
                                <div className="space-y-2 pt-1">
                                    <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block">Target KEPI Immunization Dose / Schedule</label>
                                    <select
                                        value={formData.targetVaccine}
                                        onChange={e => setFormData(p => ({ ...p, targetVaccine: e.target.value }))}
                                        className="w-full bg-black/50 border border-pink-500/30 focus:border-pink-400 rounded-xl p-2.5 text-xs font-bold text-pink-200 outline-none"
                                    >
                                        <option value="BCG + OPV 0 (At Birth)">BCG + Oral Polio (OPV 0) — At Birth</option>
                                        <option value="OPV 1 + Penta 1 + Rota 1 + PCV 1 (6 Weeks)">OPV 1 + Penta 1 + Rota 1 + PCV 1 (6 Weeks)</option>
                                        <option value="OPV 2 + Penta 2 + Rota 2 + PCV 2 (10 Weeks)">OPV 2 + Penta 2 + Rota 2 + PCV 2 (10 Weeks)</option>
                                        <option value="OPV 3 + Penta 3 + IPV + PCV 3 (14 Weeks)">OPV 3 + Penta 3 + IPV + PCV 3 (14 Weeks)</option>
                                        <option value="Vitamin A + Growth Monitoring (6 Months)">Vitamin A 100,000 IU + Growth Monitoring (6 Mos)</option>
                                        <option value="Measles-Rubella 1 + Yellow Fever (9 Months)">Measles-Rubella 1 (MR 1) + Yellow Fever (9 Mos)</option>
                                        <option value="Measles-Rubella 2 + Vitamin A (18 Months)">Measles-Rubella 2 (MR 2) + Deworming (18 Mos)</option>
                                    </select>
                                </div>
                            )}

                            {formData.mchClinicType === 'NBU' && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block mb-1">NBU Care Area</label>
                                        <select
                                            value={formData.targetVaccine}
                                            onChange={e => setFormData(p => ({ ...p, targetVaccine: e.target.value }))}
                                            className="w-full bg-black/50 border border-pink-500/30 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                                        >
                                            <option value="Incubator Bay 01">Incubator Bay 01 (Preterm Care)</option>
                                            <option value="Phototherapy Unit (Jaundice)">Phototherapy Unit (Neonatal Jaundice)</option>
                                            <option value="Kangaroo Mother Care (KMC)">Kangaroo Mother Care (KMC Bay)</option>
                                            <option value="Neonatal Resuscitation Review">Neonatal Resuscitation Review</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block mb-1">Birth Weight / Current (Grams)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1850g (Gain +35g/day)"
                                            value={formData.mchNotes}
                                            onChange={e => setFormData(p => ({ ...p, mchNotes: e.target.value }))}
                                            className="w-full bg-black/40 border border-pink-500/30 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.mchClinicType === 'PNC' && (
                                <div className="space-y-2 pt-1">
                                    <label className="text-[8px] font-black text-pink-300 uppercase tracking-widest block">Postnatal Milestone / Family Planning Method</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PNC 6-Week Mother & Baby Dyad Check, Progestin-only Implant"
                                        value={formData.mchNotes}
                                        onChange={e => setFormData(p => ({ ...p, mchNotes: e.target.value }))}
                                        className="w-full bg-black/40 border border-pink-500/30 rounded-xl p-2.5 text-xs font-bold text-white outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Notes / Reason ── */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <DocumentTextIcon className="w-3 h-3 text-indigo-500" /> {isEdu ? 'Teacher\'s Notes' : 'Notes / Reason'}
                        </label>
                        <textarea
                            rows={3}
                            placeholder={isEdu ? 'E.G. STUDENT COMPLAINED OF HEADACHE DURING CLASS...' : 'REASON FOR VISIT...'}
                            value={formData.reason}
                            onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white resize-none"
                        />
                    </div>

                    {/* ── EduPulse: Teacher referral notice ── */}
                    {isEdu && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                            <SparklesIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider leading-relaxed">
                                This appointment is being booked by a class teacher on behalf of the student. The school nurse/clinician will be notified.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-5 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 italic ${
                            isEdu
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-500/20'
                                : 'bg-indigo-600 shadow-indigo-500/20'
                        }`}
                    >
                        {isSubmitting
                            ? 'BOOKING VISIT...'
                            : isEdu
                                ? 'BOOK STUDENT VISIT'
                                : 'QUEUE APPOINTMENT'
                        }
                        <SparklesIcon className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddAppointmentModal;
