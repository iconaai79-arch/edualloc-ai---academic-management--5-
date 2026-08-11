import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';

interface Student {
    id: string;
    name: string;
    role?: string;
    metadata?: { gradeLevel?: string; class?: string; admissionNumber?: string; [key: string]: any };
    admissionNumber?: string;
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
    students?: Student[];
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    isEdu = false,
    referredBy = '',
    students = [],
}) => {
    const [formData, setFormData] = useState({
        patientName: '',
        patientId: '',
        studentClass: '',
        admissionNumber: '',
        doctorName: isEdu ? 'School Nurse' : '',
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
    });

    const [studentSearch, setStudentSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Filtered student list for the dropdown
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.admissionNumber || s.metadata?.admissionNumber || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.metadata?.gradeLevel || '').toLowerCase().includes(studentSearch.toLowerCase())
    );

    const handleSelectStudent = (student: Student) => {
        setFormData(prev => ({
            ...prev,
            patientName: student.name,
            patientId: student.id,
            admissionNumber: student.admissionNumber || student.metadata?.admissionNumber || '',
            studentClass: student.metadata?.gradeLevel || student.metadata?.class || '',
        }));
        setStudentSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onAdd({
                ...formData,
                // Include referral info in the saved record
                ...(isEdu ? { referredByTeacher: formData.referredByTeacher || referredBy } : {}),
            });
            onClose();
            // Reset form
            setFormData({
                patientName: '',
                patientId: '',
                studentClass: '',
                admissionNumber: '',
                doctorName: isEdu ? 'School Nurse' : '',
                referredByTeacher: referredBy,
                specialty: isEdu ? 'General Wellness' : 'General Medicine',
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                type: isEdu ? 'Health Check' : 'Initial Consultation',
                reason: '',
                status: 'Scheduled',
            });
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

                    {/* ── EduPulse: Student Picker ── */}
                    {isEdu ? (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UsersIcon className="w-3 h-3" /> Select Student
                            </label>

                            {/* Selected student badge */}
                            {formData.patientName ? (
                                <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                        {formData.patientName[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{formData.patientName}</p>
                                        <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                            {formData.studentClass && `Class: ${formData.studentClass}`}
                                            {formData.admissionNumber && ` • Adm: ${formData.admissionNumber}`}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, patientName: '', patientId: '', studentClass: '', admissionNumber: '' }))}
                                        className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH STUDENT BY NAME OR ADM NO..."
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                                    />
                                    {/* Dropdown */}
                                    {studentSearch && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                            {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => handleSelectStudent(s)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-left border-b border-slate-50 dark:border-white/5 last:border-0"
                                                >
                                                    <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs flex-shrink-0">
                                                        {s.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{s.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                            {s.metadata?.gradeLevel || s.role || 'Student'}
                                                            {(s.admissionNumber || s.metadata?.admissionNumber) && ` • ${s.admissionNumber || s.metadata?.admissionNumber}`}
                                                        </p>
                                                    </div>
                                                </button>
                                            )) : (
                                                <div className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No students found</div>
                                            )}
                                        </div>
                                    )}
                                    {/* Manual entry fallback */}
                                    {!studentSearch && students.length === 0 && (
                                        <input
                                            type="text"
                                            required
                                            placeholder="TYPE STUDENT NAME..."
                                            value={formData.patientName}
                                            onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value, patientId: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                            className="w-full mt-2 bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Hidden required input to enforce student selection */}
                            <input type="text" required value={formData.patientName} onChange={() => {}} className="sr-only" tabIndex={-1} />
                        </div>
                    ) : (
                        /* ── Standard HIS: Patient Text Input ── */
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UsersIcon className="w-3 h-3" /> Patient Identity
                            </label>
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="PATIENT NAME OR REGISTRY ID..."
                                    value={formData.patientName}
                                    onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value, patientId: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── EduPulse: Referred by Teacher (read-only) ── */}
                    {isEdu && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" /> Referred by (Class Teacher)
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
                                <UsersIcon className="w-3 h-3" /> {isEdu ? 'Seen By' : 'Attending Practitioner'}
                            </label>
                            <input
                                type="text"
                                required
                                placeholder={isEdu ? 'E.G. SCHOOL NURSE' : 'E.G. DR. SMITH'}
                                value={formData.doctorName}
                                onChange={e => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" /> {isEdu ? 'Health Area' : 'Specialty'}
                            </label>
                            <select
                                value={formData.specialty}
                                onChange={e => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
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
                                <CalendarDaysIcon className="w-3 h-3" /> {isEdu ? 'Visit Date' : 'Target Date'}
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
                                <ClockIcon className="w-3 h-3" /> Time
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
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Insurance Provider</label>
                                        <select
                                            value={formData.insuranceProvider}
                                            onChange={e => setFormData(p => ({ ...p, insuranceProvider: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider outline-none dark:text-white"
                                        >
                                            <option value="SHA (Social Health Authority)">SHA (Social Health Authority)</option>
                                            <option value="Jubilee Insurance">Jubilee Insurance</option>
                                            <option value="UAP Old Mutual">UAP Old Mutual</option>
                                            <option value="AAR Insurance">AAR Insurance</option>
                                            <option value="APA Insurance">APA Insurance</option>
                                            <option value="Britam Health">Britam Health</option>
                                            <option value="CIC Africa Group">CIC Africa Group</option>
                                            <option value="Other Commercial Cover">Other Commercial Cover</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Policy / Card ID</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. SHA-94820"
                                            value={formData.insurancePolicyNumber}
                                            onChange={e => setFormData(p => ({ ...p, insurancePolicyNumber: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider outline-none dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Visit Type ── */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <SparklesIcon className="w-3 h-3" /> {isEdu ? 'Visit Reason' : 'Visit Category'}
                        </label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white appearance-none"
                        >
                            {isEdu ? (
                                <>
                                    <option value="Health Check">Routine Health Check</option>
                                    <option value="Sick Bay">Sick Bay Visit</option>
                                    <option value="Injury">Injury / Accident</option>
                                    <option value="Follow-up">Follow-up Visit</option>
                                    <option value="Mental Health">Mental Health Support</option>
                                    <option value="Medication">Medication Administration</option>
                                    <option value="Referral">External Referral</option>
                                    <option value="Immunization">Immunization / Vaccination</option>
                                </>
                            ) : (
                                <>
                                    <option value="Initial Consultation">Initial Consultation</option>
                                    <option value="Follow-up">Follow-up Visit</option>
                                    <option value="Emergency">Urgent Care</option>
                                    <option value="Procedure">Surgical/Minor Procedure</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* ── Notes / Reason ── */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <DocumentTextIcon className="w-3 h-3" /> {isEdu ? 'Teacher\'s Notes' : 'Notes / Reason'}
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
                        disabled={isSubmitting || (isEdu && !formData.patientName)}
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
