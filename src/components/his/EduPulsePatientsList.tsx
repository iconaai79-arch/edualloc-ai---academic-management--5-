import React, { useState, useMemo } from 'react';
import { UsersIcon } from '../icons/UsersIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { HeartIcon, CalendarIcon, IdentificationIcon } from './HealthIcons';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { apiService } from '../../services/apiService';

interface Patient {
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
}

interface EduPulsePatientsListProps {
    patients: Patient[];
    onRegisterPatient: () => void;
    onSelectPatient: (patientId: string) => void;
    onPatientUpdated: () => void;
    institutionId?: string;
}

/* ─── Inline Edit Modal ─── */
const EditPatientModal: React.FC<{
    patient: Patient;
    onClose: () => void;
    onSave: (updated: Patient) => Promise<void>;
}> = ({ patient, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        ...patient,
        admissionNumber: patient.admissionNumber || (patient as any).admission_number || '',
        gradeLevel: patient.gradeLevel || (patient as any).grade_level || '',
        stream: patient.stream || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white placeholder-slate-400";
    const labelCls = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2";

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="p-7 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                            Edit <span className="text-indigo-200">Student Record</span>
                        </h2>
                        <p className="text-[9px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">
                            Adm No: {patient.admissionNumber || (patient as any).admission_number || 'N/A'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-7 space-y-5">
                    
                    {/* Row 1: Name & Adm No */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Full Name</label>
                            <input type="text" required placeholder="STUDENT FULL NAME" value={formData.fullName}
                                onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Admission Number</label>
                            <input type="text" placeholder="ADM-0001" value={formData.admissionNumber || ''}
                                onChange={e => setFormData(p => ({ ...p, admissionNumber: e.target.value }))}
                                className={inputCls} />
                        </div>
                    </div>

                    {/* Row: Grade Level & Stream */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Grade Level / Class</label>
                            <input type="text" placeholder="FORM 3" value={formData.gradeLevel || ''}
                                onChange={e => setFormData(p => ({ ...p, gradeLevel: e.target.value }))}
                                className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Stream</label>
                            <input type="text" placeholder="BLUE" value={formData.stream || ''}
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
                            <label className={labelCls}>Contact / Parent Phone</label>
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
                        {isSaving ? 'SAVING CHANGES...' : 'SAVE STUDENT RECORD'} <SparklesIcon className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
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

/* ─── Main Component ─── */
export const EduPulsePatientsList: React.FC<EduPulsePatientsListProps> = ({
    patients,
    onRegisterPatient,
    onSelectPatient,
    onPatientUpdated,
    institutionId,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
    const [selectedGrade, setSelectedGrade] = useState<string>('All');
    const [selectedStream, setSelectedStream] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'name' | 'adm' | 'recent'>('name');
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
    const [notification, setNotification] = useState('');

    const gradeOptions = useMemo(() => {
        const grades = new Set<string>();
        patients.forEach(p => {
            const grade = p.gradeLevel || (p as any).grade_level;
            if (grade) grades.add(grade);
        });
        return ['All', ...Array.from(grades).sort()];
    }, [patients]);

    const streamOptions = useMemo(() => {
        const streams = new Set<string>();
        patients.forEach(p => {
            if (p.stream) streams.add(p.stream);
        });
        return ['All', ...Array.from(streams).sort()];
    }, [patients]);

    const filtered = useMemo(() => {
        return patients
            .filter(p => {
                const q = searchTerm.toLowerCase();
                const adm = p.admissionNumber || (p as any).admission_number || '';
                const grade = p.gradeLevel || (p as any).grade_level || '';
                const matchesSearch = !q
                    || p.fullName.toLowerCase().includes(q)
                    || adm.toLowerCase().includes(q)
                    || (p.contact || '').includes(q);
                const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
                const matchesGrade = selectedGrade === 'All' || grade === selectedGrade;
                const matchesStream = selectedStream === 'All' || p.stream === selectedStream;
                return matchesSearch && matchesGender && matchesGrade && matchesStream;
            })
            .sort((a, b) => {
                if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
                if (sortBy === 'adm') {
                    const admA = a.admissionNumber || (a as any).admission_number || '';
                    const admB = b.admissionNumber || (b as any).admission_number || '';
                    return admA.localeCompare(admB);
                }
                if (sortBy === 'recent') return (b.createdAt || '').localeCompare(a.createdAt || '');
                return 0;
            });
    }, [patients, searchTerm, genderFilter, selectedGrade, selectedStream, sortBy]);

    const handleSaveEdit = async (updated: Patient) => {
        await apiService.saveModuleRecord('his_patients', { ...updated, institutionId });
        onPatientUpdated();
        setNotification(`${updated.fullName} record updated successfully.`);
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
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Student <span className="text-indigo-400">Health Registry</span></h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {patients.length} student{patients.length !== 1 ? 's' : ''} registered in wellness programme
                    </p>
                </div>
                <button
                    onClick={onRegisterPatient}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 flex-shrink-0">
                    <PlusIcon className="w-4 h-4" /> Register New Student
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME, ADM NO OR CONTACT..."
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

                {/* Class filter */}
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
                    className="bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white appearance-none min-w-[120px]">
                    <option value="All">All Classes</option>
                    {gradeOptions.filter(g => g !== 'All').map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>

                {/* Stream filter */}
                <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)}
                    className="bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white appearance-none min-w-[120px]">
                    <option value="All">All Streams</option>
                    {streamOptions.filter(s => s !== 'All').map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none dark:text-white appearance-none">
                    <option value="name">Sort: A–Z</option>
                    <option value="adm">Sort: Adm No</option>
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
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                            <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Adm No</th>
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
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No students match your search</p>
                                    <button onClick={onRegisterPatient} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                        Register First Student
                                    </button>
                                </td>
                            </tr>
                        )}
                        {filtered.map((p) => {
                            const age = calcAge(p.dob);
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
                                                    {(p.gradeLevel || (p as any).grade_level) && (
                                                        <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/30 inline-block">
                                                            {p.gradeLevel || (p as any).grade_level} {p.stream ? `• ${p.stream}` : ''}
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

                                    {/* Adm No */}
                                    <td className="px-7 py-5">
                                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/30">
                                            {p.admissionNumber || (p as any).admission_number || '—'}
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
                                        {p.contact || '—'}
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
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No students match your search</p>
                        <button onClick={onRegisterPatient} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                            Register First Student
                        </button>
                    </div>
                )}
                {filtered.map((p) => {
                    const age = calcAge(p.dob);
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
                                                {p.admissionNumber || (p as any).admission_number || 'No Adm No'}
                                            </span>
                                            {(p.gradeLevel || (p as any).grade_level) && (
                                                <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-300 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                                    {p.gradeLevel || (p as any).grade_level} {p.stream ? `• ${p.stream}` : ''}
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
                                    <p className="text-[11px] font-black">{p.contact || '—'}</p>
                                </div>
                            </div>

                            {p.allergies && (
                                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200/50 dark:border-rose-800/30">
                                    <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                        ⚠ Known Allergies: {p.allergies}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 flex-wrap mt-4">
                                <button onClick={() => setHistoryPatient(p)}
                                    className="flex-1 min-w-[70px] py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all animate-pulse-subtle">
                                    📋 History
                                </button>
                                <button onClick={() => setEditingPatient(p)}
                                    className="flex-1 min-w-[70px] py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                    ✏ Edit
                                </button>
                                <button onClick={() => onSelectPatient(p.id)}
                                    className="flex-1 min-w-[70px] py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                    Open 360 →
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit Modal */}
            {editingPatient && (
                <EditPatientModal
                    patient={editingPatient}
                    onClose={() => setEditingPatient(null)}
                    onSave={handleSaveEdit}
                />
            )}

            {/* History Modal */}
            {historyPatient && (
                <PatientHistoryModal
                    patient={historyPatient}
                    institutionId={institutionId}
                    onClose={() => setHistoryPatient(null)}
                />
            )}
        </div>
    );
};

/* ─── Patient History Modal ─── */
const PatientHistoryModal: React.FC<{
    patient: Patient;
    institutionId?: string;
    onClose: () => void;
}> = ({ patient, institutionId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [vitals, setVitals] = useState<any[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'timeline' | 'prescriptions'>('timeline');

    useEffect(() => {
        const loadHistory = async () => {
            if (!patient.id || !institutionId) return;
            setLoading(true);
            try {
                // Fetch clinical events
                const evData = await apiService.fetchModuleRecords('his_clinical_events', institutionId, undefined, {
                    filter: { patient_id: patient.id },
                    order: 'created_at.desc'
                });
                
                // Fetch vitals
                const vtData = await apiService.fetchModuleRecords('his_vital_statistics', institutionId, undefined, {
                    filter: { patient_id: patient.id },
                    order: 'recorded_at.desc'
                });

                // Fetch prescriptions
                const rxData = await apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, {
                    filter: { patient_id: patient.id },
                    order: 'created_at.desc'
                });

                // Fetch prescription items for each prescription
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

    // Group vitals by their recordedAt string
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

    // Combine all history events chronologically
    const timelineItems = useMemo(() => {
        const items: any[] = [];

        // 1. Add visits (clinical events)
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

        // 2. Add vitals
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

        // 3. Add prescriptions
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

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-7 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                            📋 Clinical History <span className="text-blue-200">Dossier</span>
                        </h2>
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mt-1 opacity-80">
                            Patient: {patient.fullName} · {patient.admissionNumber || (patient as any).admission_number || 'No Adm No'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Patient Overview Details Strip */}
                <div className="bg-slate-50 dark:bg-white/5 px-7 py-4 border-b border-slate-100 dark:border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <div>
                        <span className="text-slate-400 block mb-0.5">Demographics</span>
                        <span className="text-slate-900 dark:text-white">{patient.gender} · {age ? `${age} Yrs` : 'DOB: ' + (patient.dob || '—')}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">Class / Stream</span>
                        <span className="text-slate-900 dark:text-white">
                            {patient.gradeLevel || (patient as any).grade_level || '—'} {patient.stream ? `• ${patient.stream}` : ''}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">Blood Group</span>
                        <span className="text-slate-900 dark:text-white">{patient.bloodGroup || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">Allergies</span>
                        <span className={patient.allergies ? 'text-rose-500' : 'text-slate-900 dark:text-white'}>
                            {patient.allergies ? `⚠ ${patient.allergies}` : 'No known allergies'}
                        </span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-100 dark:border-white/5 px-7 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                            activeTab === 'timeline'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
                        }`}
                    >
                        Timeline Flow
                    </button>
                    <button
                        onClick={() => setActiveTab('prescriptions')}
                        className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                            activeTab === 'prescriptions'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
                        }`}
                    >
                        Prescriptions Dossier
                    </button>
                </div>

                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto p-7 bg-slate-50/50 dark:bg-slate-950/20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling medical history...</span>
                        </div>
                    ) : activeTab === 'timeline' ? (
                        timelineItems.length === 0 ? (
                            <div className="text-center py-20">
                                <svg className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No clinical logs recorded yet.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-slate-200 dark:border-white/5 pl-8 ml-4 space-y-8">
                                {timelineItems.map((item) => (
                                    <div key={item.id} className="relative group">
                                        
                                        {/* Timeline Dot & Icon */}
                                        <div className={`absolute -left-[50px] top-0 w-9 h-9 rounded-2xl flex items-center justify-center border shadow-md transition-transform group-hover:scale-110 ${
                                            item.type === 'visit'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400'
                                                : item.type === 'vitals'
                                                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400'
                                                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-700/30 text-blue-600 dark:text-blue-400'
                                        }`}>
                                            {item.type === 'visit' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            )}
                                            {item.type === 'vitals' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            )}
                                            {item.type === 'prescription' && (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547" />
                                                </svg>
                                            )}
                                        </div>

                                        {/* Card content */}
                                        <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.displayDate}</span>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                                                    item.type === 'visit'
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : item.type === 'vitals'
                                                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                        : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </div>

                                            <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white">{item.title}</h3>
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-0.5">{item.subtitle}</p>

                                            {/* Details inside cards */}
                                            {item.type === 'visit' && (
                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observation / Diagnosis</p>
                                                    <p className="text-xs text-slate-900 dark:text-slate-200 font-bold bg-slate-50 dark:bg-white/5 p-3 rounded-xl italic">
                                                        {item.raw.event}
                                                    </p>
                                                </div>
                                            )}

                                            {item.type === 'vitals' && (
                                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {item.raw.map((v: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
                                                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{v.label}</span>
                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                                {v.value} <span className="text-[9px] font-bold text-slate-400">{v.unit}</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {item.type === 'prescription' && (
                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-3">
                                                    {item.raw.notes && (
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Clinician Notes</p>
                                                            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 italic">"{item.raw.notes}"</p>
                                                        </div>
                                                    )}
                                                    
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Prescribed Medications</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {item.raw.items && item.raw.items.map((med: any, idx: number) => (
                                                                <div key={idx} className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{med.drugName}</p>
                                                                        <p className="text-[9px] text-slate-400 mt-0.5">{med.dosage} · {med.frequency} · {med.duration}</p>
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                                                                        QTY: {med.quantity}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // Prescriptions Dossier list
                        prescriptions.length === 0 ? (
                            <div className="text-center py-20">
                                <svg className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547" />
                                </svg>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">No medication prescriptions given.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {prescriptions.map((rx) => (
                                    <div key={rx.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-7 shadow-md">
                                        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2 border-b border-slate-100 dark:border-white/5 pb-4 mb-4">
                                            <div>
                                                <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Prescription Reference: {rx.id}</h3>
                                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                                                    Issued on {rx.createdAt || rx.created_at ? new Date(rx.createdAt || rx.created_at).toLocaleString() : '—'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200/50 dark:border-white/10">
                                                    Dr. {rx.doctorName || 'Physician'}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                    rx.status === 'dispensed'
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {rx.status}
                                                </span>
                                            </div>
                                        </div>

                                        {rx.notes && (
                                            <div className="mb-4">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prescription Notes</span>
                                                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5">
                                                    "{rx.notes}"
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Medication Line Items</span>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {rx.items && rx.items.map((med: any, idx: number) => (
                                                    <div key={idx} className="bg-slate-50 dark:bg-white/5 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{med.drugName}</p>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                                                    Dosage: {med.dosage}
                                                                </span>
                                                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                                                                    {med.frequency}
                                                                </span>
                                                                <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                                                                    {med.duration}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-slate-900 dark:text-white block">QTY: {med.quantity}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-7 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex justify-end">
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
};
