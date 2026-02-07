
import React, { useState } from 'react';
import type { User, Institution, InstitutionRegistrationData, Course, AcademicLevel, StudentRegistrationData, CompanyDetails } from '../types';
import { CalendarDaysIcon, StarIcon, UserIcon, AcademicCapIcon, CheckCircleIcon, XIcon, PhoneIcon, ChatBubbleLeftRightIcon, SparklesIcon, CheckIcon, PaperAirplaneIcon } from './icons/index';

interface LoginViewProps {
    // FIXED: Added 'suspended' to return types of onLogin to match implementation in App.tsx
    onLogin: (email: string, password: string) => 'success' | 'expired' | 'failed' | 'suspended';
    onInstitutionRegister: (data: InstitutionRegistrationData) => Promise<{ success: boolean; message: string; credentials?: { email: string; password: string; } }>;
    onStudentRegister: (data: StudentRegistrationData) => Promise<{ success: boolean; message: string; credentials?: { email: string; password: string; } }>;
    users: User[];
    institutions: Institution[];
    courses: Course[];
    academicLevels: AcademicLevel[];
    logoUrl: string | null;
    applicationTitle?: string;
    registrationProgress: number | null;
    registrationMessage: string;
    onOpenGuestPortal: () => void;
    onOpenGuestFeedback: () => void;
    themeColor: string;
    onParentRequestOtp: (phone: string) => { success: boolean; message: string };
    onParentVerifyOtp: (phone: string, code: string) => { success: boolean; message: string };
    companyDetails: CompanyDetails;
}

export const LoginView: React.FC<LoginViewProps> = ({
    onLogin, onInstitutionRegister, logoUrl, applicationTitle,
    onOpenGuestPortal, onOpenGuestFeedback, companyDetails
}) => {
    const [view, setView] = useState<'login' | 'register' | 'forgot_password' | 'reg_success' | 'reset_sent'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string } | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);

    const [regData, setRegData] = useState<InstitutionRegistrationData>({
        institutionName: '',
        institutionEmail: '',
        institutionPhone: '',
        institutionType: 'University',
        adminName: '',
        adminEmail: '',
        loadDemoData: false,
    });

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = onLogin(email, password);
        if (result === 'failed') {
            setError('Invalid email or password.');
        }
    };

    const handleForgotPassword = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) {
            setError("Please enter your registered email address.");
            return;
        }
        setIsSubmitting(true);
        setTimeout(() => {
            setView('reset_sent');
            setIsSubmitting(false);
        }, 1000);
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsRegistering(true);
        try {
            const result = await onInstitutionRegister(regData);
            if (result.success) {
                setGeneratedCreds(result.credentials || { email: regData.adminEmail, password: 'password123' });
                setView('reg_success');
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError("Registration failed. Please verify connection to the central registry.");
        } finally {
            setIsRegistering(false);
        }
    };

    const inputClasses = "shadow-sm appearance-none border rounded-2xl w-full py-3 px-4 text-slate-700 dark:text-white leading-tight focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:bg-slate-700 dark:border-slate-600 outline-none";
    const labelClasses = "block text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1";

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans">
            <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-center">
                        {logoUrl ? (
                            <img className="mx-auto h-16 w-auto mb-4" src={logoUrl} alt="Logo" />
                        ) : (
                            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg bg-blue-600">
                                <AcademicCapIcon className="w-10 h-10" />
                            </div>
                        )}
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter uppercase">
                            {applicationTitle || 'EduAi'}
                        </h2>
                        <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Academic Management Hub</p>
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-xs text-left animate-shake">
                                <div className="flex gap-2">
                                    <XIcon className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {view === 'login' && (
                        <div className="animate-fade-in space-y-6">
                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                                <div>
                                    <label className={labelClasses} htmlFor="email">Email Address</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="official@institution.edu" className={`${inputClasses} pl-10`} required />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-baseline">
                                        <label className={labelClasses} htmlFor="password">Password</label>
                                        <button type="button" onClick={() => setView('forgot_password')} className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 tracking-tighter transition-colors">Forgot?</button>
                                    </div>
                                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******************" className={inputClasses} required />
                                </div>
                                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-2xl transition-all shadow-lg active:scale-95" type="submit">Sign In to Portal</button>
                            </form>
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                                <button type="button" onClick={onOpenGuestPortal} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600 transition-all hover:bg-white hover:shadow-md group">
                                    <CalendarDaysIcon className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase text-slate-500">Book Visit</span>
                                </button>
                                <button type="button" onClick={onOpenGuestFeedback} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600 transition-all hover:bg-white hover:shadow-md group">
                                    <StarIcon className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase text-slate-500">Feedback</span>
                                </button>
                            </div>
                            <div className="mt-8 text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    New institution? <button onClick={() => setView('register')} className="text-blue-600 font-bold hover:underline">Register Platform</button>
                                </p>
                            </div>
                        </div>
                    )}

                    {view === 'forgot_password' && (
                        <div className="animate-fade-in-up space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Recover Access</h3>
                                <p className="text-sm text-slate-500 mt-1">We'll send a reset link to your email.</p>
                            </div>
                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                <div>
                                    <label className={labelClasses}>Official Email</label>
                                    <div className="relative">
                                        <PaperAirplaneIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 rotate-45" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClasses} pl-12`} placeholder="name@institution.edu" required autoFocus />
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? 'Syncing...' : 'Send Recovery Link'}
                                </button>
                                <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-2 transition-colors">Return to Login</button>
                            </form>
                        </div>
                    )}

                    {view === 'register' && (
                        <div className="animate-fade-in-up space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">New Tenant</h3>
                                <button onClick={() => setView('login')} className="text-xs font-bold text-slate-400 hover:opacity-80 flex items-center gap-1 uppercase tracking-widest transition-colors">
                                    <XIcon className="w-4 h-4" /> Cancel
                                </button>
                            </div>
                            <form onSubmit={handleRegisterSubmit} className="space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClasses}>Institution Name</label>
                                        <input type="text" className={inputClasses} value={regData.institutionName} onChange={e => setRegData({ ...regData, institutionName: e.target.value })} placeholder="e.g. Global Tech University" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Official Email</label>
                                            <input type="email" className={inputClasses} value={regData.institutionEmail} onChange={e => setRegData({ ...regData, institutionEmail: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Phone</label>
                                            <input type="tel" className={inputClasses} value={regData.institutionPhone} onChange={e => setRegData({ ...regData, institutionPhone: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Institution Type</label>
                                        <select className={inputClasses} value={regData.institutionType} onChange={e => setRegData({ ...regData, institutionType: e.target.value })}>
                                            <option value="Primary">Primary School</option>
                                            <option value="Secondary">Secondary School</option>
                                            <option value="University">University</option>
                                            <option value="College">College</option>
                                            <option value="Institute">Institute</option>
                                            <option value="Polytechnic">Polytechnic</option>
                                        </select>
                                    </div>
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                                        <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-3 flex items-center gap-2">
                                            <SparklesIcon className="w-4 h-4" /> Demo Configuration
                                        </h4>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input type="checkbox" checked={regData.loadDemoData} onChange={e => setRegData({ ...regData, loadDemoData: e.target.checked })} className="peer h-5 w-5 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 appearance-none bg-white dark:bg-slate-800 transition-all checked:bg-indigo-600 checked:border-indigo-600" />
                                                <CheckIcon className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Load Sample Demo Data</span>
                                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Pre-populate all modules with dummy records for evaluation.</p>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="pt-2">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 mb-3">Primary Administrator</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Name</label>
                                                <input type="text" className={inputClasses} value={regData.adminName} onChange={e => setRegData({ ...regData, adminName: e.target.value })} required />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Email</label>
                                                <input type="email" className={inputClasses} value={regData.adminEmail} onChange={e => setRegData({ ...regData, adminEmail: e.target.value })} required />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={isRegistering} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50">
                                    {isRegistering ? 'Provisioning Infrastructure...' : 'Register Portal'}
                                </button>
                            </form>
                        </div>
                    )}

                    {view === 'reg_success' && (
                        <div className="text-center space-y-6 animate-fade-in-up">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Setup Complete</h2>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-left space-y-4 shadow-inner">
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest">Login Username</p>
                                    <p className="font-mono text-sm font-bold text-blue-600 select-all">{generatedCreds?.email || regData.adminEmail}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest">Initial PIN</p>
                                    <p className="font-mono text-sm font-bold text-blue-600 select-all">{generatedCreds?.password || 'password123'}</p>
                                </div>
                            </div>
                            <button onClick={() => setView('login')} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                                <PaperAirplaneIcon className="w-5 h-5" />
                                Enter Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <footer className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 p-6 no-print">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-start gap-8">
                    <div className="flex items-center gap-3 group">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <PhoneIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Support</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{companyDetails?.phone || '+254 700 123 456'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Help Desk Email</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{companyDetails?.email || 'info@eduai.co.ke'}</p>
                        </div>
                    </div>
                    <div className="ml-auto hidden sm:flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Powered by</span>
                        <span className="text-xs font-black text-indigo-600/50 uppercase tracking-tighter">EduAi Academic Management</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
