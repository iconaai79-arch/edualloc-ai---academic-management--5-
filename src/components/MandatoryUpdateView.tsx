
import React, { useState } from 'react';
import type { User, ProfileUpdateData, PasswordUpdateData } from '../types';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface MandatoryUpdateViewProps {
    user: User;
    onUpdate: (profile: ProfileUpdateData & { email?: string }, password: PasswordUpdateData) => Promise<void>;
    onLogout: () => void;
    logoUrl: string | null;
}

export const MandatoryUpdateView: React.FC<MandatoryUpdateViewProps> = ({ user, onUpdate, onLogout, logoUrl }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [phone, setPhone] = useState(user.phoneNumber);
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user.gender || 'Male');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) return setError('Legal full name is required.');
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return setError('Please enter a valid official email address.');
        }
        if (!phone.trim() || phone.length < 10) {
            return setError('Please confirm a valid phone number for account recovery.');
        }
        if (newPassword.length < 6) return setError('Secure password must be at least 6 characters.');
        if (newPassword !== confirmPassword) return setError('Passwords do not match.');
        if (newPassword === 'password123') return setError('Security Policy: You cannot use the default system password.');

        setIsSaving(true);
        try {
            await onUpdate(
                { name, gender, phoneNumber: phone, email },
                { newPassword }
            );
        } catch (err: any) {
            console.error("Account activation failed:", err);
            setError(err.message || 'Registry sync failed. Verify your cloud connection or try again in a moment.');
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                <div className="p-8 sm:p-10">
                    <div className="text-center mb-8">
                        {logoUrl ? (
                            <img loading="lazy" src={logoUrl} alt="Logo" className="mx-auto h-16 w-auto mb-4" />
                        ) : (
                            <img loading="lazy" src="/eduai_logo_3d.png" alt="EduAI Logo" className="mx-auto h-16 w-auto mb-4" />
                        )}
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Account Activation</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Security Protocol: Please confirm your contact details and set a secure personal password to unlock your portal.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-xs font-bold rounded-r-xl animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Legal Full Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input-custom pl-10" required disabled={isSaving} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Gender</label>
                                    <select value={gender} onChange={e => setGender(e.target.value as any)} className="form-input-custom" disabled={isSaving}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Mobile Phone</label>
                                    <div className="relative">
                                        <PhoneIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="form-input-custom pl-10" required disabled={isSaving} placeholder="For account recovery" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Official Email</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input-custom pl-10" required disabled={isSaving} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">New Secure Password</label>
                                <div className="relative">
                                    <LockClosedIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input-custom pl-10" placeholder="Min 6 characters" required disabled={isSaving} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <CheckCircleIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="form-input-custom pl-10" placeholder="Repeat new password" required disabled={isSaving} />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-6">
                            <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]">
                                {isSaving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : null}
                                {isSaving ? 'Updating Registry...' : 'Secure & Activate Account'}
                            </button>
                            <button type="button" onClick={onLogout} className="w-full text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest py-2 transition-colors" disabled={isSaving}>
                                Cancel & Log Out
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>{`
                .form-input-custom {
                    display: block;
                    width: 100%;
                    padding: 0.625rem 0.875rem;
                    border-radius: 0.75rem;
                    border: 1px solid #e2e8f0;
                    background-color: #f8fafc;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    outline: none;
                }
                .dark .form-input-custom {
                    border-color: #334155;
                    background-color: #0f172a;
                    color: white;
                }
                .form-input-custom:focus {
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
                }
            `}</style>
        </div>
    );
};

