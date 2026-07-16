import React, { useState, useMemo } from 'react';
import { XIcon } from '../icons/XIcon';
import { UserIcon } from '../icons/UserIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { HeartIcon, IdentificationIcon, ShieldCheckIcon, CalendarIcon } from './HealthIcons';
import { HISPatient, User } from '../../types';

interface RegisterPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRegister: (patient: Omit<HISPatient, 'id' | 'institutionId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    users?: User[];
    isEdu?: boolean;
}

export const RegisterPatientModal: React.FC<RegisterPatientModalProps> = ({ isOpen, onClose, onRegister, users = [], isEdu = false }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        gender: 'Male',
        bloodGroup: '',
        contact: '',
        insuranceProvider: '',
        shaNumber: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        admissionNumber: '',
    });

    const [directorySearch, setDirectorySearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!isEdu || !directorySearch.trim()) return [];
        return (users || []).filter(u => {
            const isClinicApplicable = ['student', 'teacher', 'boarding_master', 'staff', 'parent', 'librarian'].includes(u.role);
            if (!isClinicApplicable) return false;
            const adm = u.admissionNumber || u.admission_number || u.metadata?.admissionNumber || u.metadata?.admission_number || '';
            return (
                u.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(directorySearch.toLowerCase()) ||
                (u.phoneNumber || '').includes(directorySearch) ||
                adm.toLowerCase().includes(directorySearch.toLowerCase())
            );
        });
    }, [directorySearch, users, isEdu]);

    const handleSelectUser = (user: User) => {
        setFormData({
            fullName: user.name,
            dob: user.metadata?.dob || '',
            gender: (user.metadata?.gender === 'Female' ? 'Female' : 'Male'),
            bloodGroup: user.metadata?.bloodGroup || '',
            contact: user.phoneNumber || user.email || '',
            insuranceProvider: 'School Coverage',
            shaNumber: user.metadata?.shaNumber || '',
            emergencyContactName: user.metadata?.emergencyContactName || '',
            emergencyContactPhone: user.metadata?.emergencyContactPhone || '',
            admissionNumber: user.admissionNumber || user.admission_number || user.metadata?.admissionNumber || user.metadata?.admission_number || '',
        });
        setDirectorySearch('');
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onRegister({
                ...formData,
                gender: formData.gender as 'Male' | 'Female' | 'Other'
            });
            onClose();
        } catch (error) {
            console.error("Registration failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Decorative Background Glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

                <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic">Register <span className="text-indigo-600 dark:text-indigo-400">New Patient</span></h2>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">H.I.S Intake Module</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-red-500 transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 relative z-10 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Auto-fill Search from Directory */}
                    {isEdu && (
                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black uppercase text-indigo-500 ml-1">Auto-fill from School Directory</label>
                            <div className="relative group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="SEARCH STUDENTS, TEACHERS, OR STAFF..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-800 dark:text-slate-100"
                                    value={directorySearch}
                                    onChange={e => setDirectorySearch(e.target.value)}
                                />
                            </div>
                            {directorySearch && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-[200] max-h-48 overflow-y-auto no-scrollbar">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(u => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => handleSelectUser(u)}
                                                className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-wider border-b border-slate-50 dark:border-white/5 last:border-0 flex justify-between items-center text-slate-800 dark:text-slate-200"
                                            >
                                                <span>{u.name} ({u.role})</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">Select</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase">No matching directory records</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Basic Information */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Personal Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Identity Name</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="E.G. JOHN DOE"
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
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
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                        value={formData.dob}
                                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner appearance-none"
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {isEdu && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Admission Number</label>
                                    <div className="relative group">
                                        <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="E.G. ADM-1234"
                                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                            value={formData.admissionNumber}
                                            onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Blood Registry Group</label>
                                <div className="relative group">
                                    <HeartIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="E.G. O+"
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                        value={formData.bloodGroup}
                                        onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Insurance */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Communication & Coverage</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Primary Contact Unit</label>
                                <div className="relative group">
                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        required
                                        type="tel"
                                        placeholder="+254..."
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
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
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                        value={formData.shaNumber}
                                        onChange={e => setFormData({ ...formData, shaNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Insurance Provider Unit</label>
                                <div className="relative group">
                                    <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="E.G. APA, NHIF, SHA..."
                                        className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                        value={formData.insuranceProvider}
                                        onChange={e => setFormData({ ...formData, insuranceProvider: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Critical Emergency Link</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kin Full Identity</label>
                                <input
                                    type="text"
                                    placeholder="NEXT OF KIN NAME"
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                    value={formData.emergencyContactName}
                                    onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kin Emergency Line</label>
                                <input
                                    type="tel"
                                    placeholder="KIN PHONE NUMBER"
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner"
                                    value={formData.emergencyContactPhone}
                                    onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 relative z-10 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg"
                    >
                        Abandon Registry
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <PlusIcon className="w-4 h-4" />
                        )}
                        Finalize Intake
                    </button>
                </div>
            </div>
        </div>
    );
};

