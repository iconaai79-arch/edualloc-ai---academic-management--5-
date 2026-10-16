
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
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { isPlaceholderEmail } from '../utils/academicUtils';

interface MandatoryUpdateViewProps {
    user: User;
    onUpdate: (profile: ProfileUpdateData & { email?: string }, password: PasswordUpdateData) => Promise<void>;
    onLogout: () => void;
    logoUrl: string | null;
}

export const MandatoryUpdateView: React.FC<MandatoryUpdateViewProps> = ({ user, onUpdate, onLogout, logoUrl }) => {
    const isInitialPlaceholder = isPlaceholderEmail(user.email);
    const [name, setName] = useState(user.name);
    // If the account has a synthetic system placeholder (@eduai.local), clear it so the user sees the real email prompt
    const [email, setEmail] = useState(isInitialPlaceholder ? '' : (user.email || ''));
    const [phone, setPhone] = useState(user.phoneNumber || '');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(user.gender || 'Male');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Real-time phone parsing & guidance
    const phoneClean = phone.trim().replace(/[\s\-\(\)\.]/g, '');
    const phoneDigits = phoneClean.replace(/[^\d]/g, '');

    let phoneFeedback: { status: 'valid' | 'invalid' | 'neutral'; message: string; normalized?: string } = {
        status: 'neutral',
        message: 'e.g. 0725272487, 725272487, or +254...'
    };

    if (phoneDigits) {
        if (phoneDigits.length === 9 && (phoneDigits.startsWith('7') || phoneDigits.startsWith('1'))) {
            phoneFeedback = {
                status: 'valid',
                message: `✓ Valid Kenyan format (saves as 0${phoneDigits})`,
                normalized: `0${phoneDigits}`
            };
        } else if (phoneDigits.length === 10 && (phoneDigits.startsWith('07') || phoneDigits.startsWith('01'))) {
            phoneFeedback = {
                status: 'valid',
                message: `✓ Valid local format (${phoneDigits})`,
                normalized: phoneDigits
            };
        } else if (phoneDigits.length === 12 && (phoneDigits.startsWith('2547') || phoneDigits.startsWith('2541'))) {
            phoneFeedback = {
                status: 'valid',
                message: `✓ Valid Kenyan format (saves as 0${phoneDigits.substring(3)})`,
                normalized: `0${phoneDigits.substring(3)}`
            };
        } else if (phoneDigits.length === 13 && (phoneDigits.startsWith('25407') || phoneDigits.startsWith('25401'))) {
            phoneFeedback = {
                status: 'valid',
                message: `✓ Valid Kenyan format (saves as 0${phoneDigits.substring(4)})`,
                normalized: `0${phoneDigits.substring(4)}`
            };
        } else if (phoneDigits.length >= 9 && phoneDigits.length <= 15) {
            phoneFeedback = {
                status: 'valid',
                message: `✓ Valid international phone (${phoneClean.startsWith('+') ? phoneClean : phoneDigits})`,
                normalized: phoneClean.startsWith('+') ? phoneClean : phoneDigits
            };
        } else {
            phoneFeedback = {
                status: 'invalid',
                message: 'Incomplete or invalid phone format'
            };
        }
    }

    // Real-time email parsing & guidance
    const trimmedEmail = email.trim();
    const isCurrentPlaceholder = isPlaceholderEmail(trimmedEmail);
    const isEmailValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    let emailFeedback: { status: 'valid' | 'invalid' | 'warning' | 'neutral'; message: string } = {
        status: 'neutral',
        message: 'Active email required for password recovery and notifications'
    };

    if (trimmedEmail) {
        if (isCurrentPlaceholder) {
            emailFeedback = {
                status: 'warning',
                message: '⚠️ Temporary system placeholder detected. Please enter your real email (e.g. yourname@gmail.com).'
            };
        } else if (!isEmailValidFormat) {
            emailFeedback = {
                status: 'invalid',
                message: '⚠️ Please enter a complete valid email address (e.g. yourname@gmail.com).'
            };
        } else {
            emailFeedback = {
                status: 'valid',
                message: '✓ Valid email address — account recovery links will be sent here.'
            };
        }
    } else if (isInitialPlaceholder) {
        emailFeedback = {
            status: 'warning',
            message: '⚠️ Please enter your real personal or work email (e.g. yourname@gmail.com).'
        };
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) return setError('Legal full name is required.');

        // Email validation & protection against placeholder emails
        const finalEmail = email.trim();
        if (!finalEmail) {
            return setError('Official email is required. Please provide your active personal or work email address.');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
            return setError('Please enter a valid official email address (e.g., yourname@gmail.com).');
        }
        if (isPlaceholderEmail(finalEmail)) {
            return setError('Please replace the temporary placeholder email (@eduai.local) with your real email address (e.g., yourname@gmail.com) so you can receive password resets and security alerts.');
        }

        // Phone normalization: supports 9-digit (725272487), 10-digit (0725272487), 12-digit (254725272487), +254...
        let normalizedPhone = phone.trim().replace(/[\s\-\(\)\.]/g, '');
        const digits = normalizedPhone.replace(/[^\d]/g, '');

        if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
            normalizedPhone = `0${digits}`;
        } else if (digits.length === 12 && (digits.startsWith('2547') || digits.startsWith('2541'))) {
            normalizedPhone = `0${digits.substring(3)}`;
        } else if (digits.length === 13 && (digits.startsWith('25407') || digits.startsWith('25401'))) {
            normalizedPhone = `0${digits.substring(4)}`;
        }

        if (!digits || digits.length < 9) {
            return setError('Please confirm a valid mobile phone number (e.g. 0725272487, 725272487, or +254...) for account recovery.');
        }

        if (newPassword.length < 6) return setError('Secure password must be at least 6 characters.');
        if (newPassword !== confirmPassword) return setError('Passwords do not match.');
        if (newPassword === 'password123') return setError('Security Policy: You cannot use the default system password.');

        setIsSaving(true);
        try {
            await onUpdate(
                { name: name.trim(), gender, phoneNumber: normalizedPhone, email: finalEmail, expertise: [] },
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
                    <div className="text-center mb-6">
                        {(() => {
                            const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
                            const isPortal = hostname === 'portal.eduai.co.ke' || hostname === 'eduai.co.ke' || hostname === 'www.eduai.co.ke';
                            const effectiveLogo = isPortal ? '/eduai_logo_3d.png' : (logoUrl || '/eduai_logo_3d.png');
                            return (
                                <img 
                                    loading="lazy" 
                                    src={effectiveLogo} 
                                    alt="Logo" 
                                    className="mx-auto h-16 w-auto mb-4 object-contain" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/eduai_logo_3d.png'; }}
                                />
                            );
                        })()}
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Account Activation</h2>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Security Protocol: Please confirm your contact details and set a secure personal password to unlock your portal.
                        </p>
                    </div>

                    {isInitialPlaceholder && (
                        <div className="mb-6 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 text-xs shadow-sm animate-pulse-subtle">
                            <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-black uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300">
                                    Action Required: Provide Your Active Email
                                </p>
                                <p className="text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
                                    Your account was initialized with a temporary ID (<span className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[10px]">{user.email}</span>). Please enter your real email (e.g. <strong>yourname@gmail.com</strong>) to receive password recovery codes and official notifications.
                                </p>
                            </div>
                        </div>
                    )}

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
                                        <input 
                                            type="tel" 
                                            value={phone} 
                                            onChange={e => setPhone(e.target.value)} 
                                            className={`form-input-custom pl-10 ${
                                                phoneFeedback.status === 'valid' ? 'border-emerald-500/50 focus:border-emerald-500' :
                                                phoneFeedback.status === 'invalid' ? 'border-rose-400 focus:border-rose-500' : ''
                                            }`} 
                                            required 
                                            disabled={isSaving} 
                                            placeholder="e.g. 725272487 or 0725..." 
                                        />
                                    </div>
                                    <p className={`mt-1 text-[10px] font-semibold tracking-tight ${
                                        phoneFeedback.status === 'valid' ? 'text-emerald-600 dark:text-emerald-400' :
                                        phoneFeedback.status === 'invalid' ? 'text-rose-500' :
                                        'text-slate-400'
                                    }`}>
                                        {phoneFeedback.message}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Official Email</label>
                                <div className="relative">
                                    <EnvelopeIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        className={`form-input-custom pl-10 ${
                                            emailFeedback.status === 'warning' ? 'border-amber-400 focus:border-amber-500 bg-amber-50/20' :
                                            emailFeedback.status === 'valid' ? 'border-emerald-500/50 focus:border-emerald-500' :
                                            emailFeedback.status === 'invalid' ? 'border-rose-400 focus:border-rose-500' : ''
                                        }`} 
                                        required 
                                        disabled={isSaving} 
                                        placeholder="e.g. yourname@gmail.com or official@school.edu"
                                    />
                                </div>
                                <p className={`mt-1 text-[10px] font-semibold tracking-tight ${
                                    emailFeedback.status === 'valid' ? 'text-emerald-600 dark:text-emerald-400' :
                                    emailFeedback.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                    emailFeedback.status === 'invalid' ? 'text-rose-500' :
                                    'text-slate-400'
                                }`}>
                                    {emailFeedback.message}
                                </p>
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

