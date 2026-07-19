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
    const [formData, setFormData] = useState({ ...patient });
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
                            Adm No: {patient.admissionNumber || 'N/A'}
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
    const [notification, setNotification] = useState('');

    const gradeOptions = useMemo(() => {
        const grades = new Set<string>();
        patients.forEach(p => {
            if (p.gradeLevel) grades.add(p.gradeLevel);
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
                const matchesSearch = !q
                    || p.fullName.toLowerCase().includes(q)
                    || (p.admissionNumber || '').toLowerCase().includes(q)
                    || (p.contact || '').includes(q);
                const matchesGender = genderFilter === 'All' || p.gender === genderFilter;
                const matchesGrade = selectedGrade === 'All' || p.gradeLevel === selectedGrade;
                const matchesStream = selectedStream === 'All' || p.stream === selectedStream;
                return matchesSearch && matchesGender && matchesGrade && matchesStream;
            })
            .sort((a, b) => {
                if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
                if (sortBy === 'adm') return (a.admissionNumber || '').localeCompare(b.admissionNumber || '');
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
                                                    {p.gradeLevel && (
                                                        <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/30 inline-block">
                                                            {p.gradeLevel} {p.stream ? `• ${p.stream}` : ''}
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
                                            {p.admissionNumber || '—'}
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
                                                {p.admissionNumber || 'No Adm No'}
                                            </span>
                                            {p.gradeLevel && (
                                                <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-300 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                                    {p.gradeLevel} {p.stream ? `• ${p.stream}` : ''}
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

                            <div className="flex gap-3">
                                <button onClick={() => setEditingPatient(p)}
                                    className="flex-1 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                    ✏ Edit
                                </button>
                                <button onClick={() => onSelectPatient(p.id)}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all">
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
        </div>
    );
};
