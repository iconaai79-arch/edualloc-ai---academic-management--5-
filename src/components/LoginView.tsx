
import React, { useState } from 'react';
import type { User, Institution, InstitutionRegistrationData, CountyRegistrationData, Course, AcademicLevel, StudentRegistrationData, CompanyDetails } from '../types';
import { CalendarDaysIcon, StarIcon, UserIcon, AcademicCapIcon, CheckCircleIcon, XIcon, PhoneIcon, ChatBubbleLeftRightIcon, SparklesIcon, CheckIcon, PaperAirplaneIcon, BuildingOfficeIcon, ShieldExclamationIcon } from './icons/index';

interface LoginViewProps {
    // FIXED: Added 'suspended' to return types of onLogin to match implementation in App.tsx
    onLogin: (email: string, password: string) => 'success' | 'expired' | 'failed' | 'suspended' | 'otp_required';
    onVerifyOtp: (code: string) => boolean;
    onResendOtp: () => void;
    onInstitutionRegister: (data: InstitutionRegistrationData) => Promise<{ success: boolean; message: string; credentials?: { email: string; password: string; } }>;
    onCountyRegister: (data: CountyRegistrationData) => Promise<{ success: boolean; message: string; credentials?: { email: string; password: string; } }>;
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
    onForgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
    onResetPassword?: (token: string, pass: string) => Promise<{ success: boolean; message: string }>;
}

export const LoginView: React.FC<LoginViewProps> = ({
    onLogin, onInstitutionRegister, onCountyRegister, logoUrl, applicationTitle,
    onOpenGuestPortal, onOpenGuestFeedback, companyDetails, onForgotPassword, onResetPassword,
    onVerifyOtp, onResendOtp
}) => {
    const [view, setView] = useState<'login' | 'register' | 'forgot_password' | 'reg_success' | 'reset_sent' | 'reset_password' | 'otp'>('login');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string } | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    // New State for County Registration Toggle
    const [regType, setRegType] = useState<'institution' | 'county'>('institution');

    const [regData, setRegData] = useState<InstitutionRegistrationData>({
        institutionName: '',
        institutionEmail: '',
        institutionPhone: '',
        institutionType: 'University',
        adminName: '',
        adminEmail: '',
        loadDemoData: false,
        businessSubType: '',
    });

    const [countyRegData, setCountyRegData] = useState<CountyRegistrationData>({
        countyName: '',
        countyCode: '',
        countyEmail: '',
        countyPhone: '',
        adminName: '',
        adminEmail: ''
    });

    // Check for reset token on mount
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('resetToken');
        if (token) {
            setView('reset_password');
        }
    }, []);

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = onLogin(identifier, password);
        if (result === 'failed') {
            setError('Invalid email or password.');
        } else if (result === 'suspended') {
            setError('This institution account is suspended. Redirecting to billing...');
        } else if (result === 'expired') {
            setError('Your session or access has expired.');
        } else if (result === 'otp_required') {
            setView('otp');
        }
    };

    const handleOtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = onVerifyOtp(otpCode);
        if (!success) {
            setError('Invalid verification code. Please try again.');
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const cleanEmail = identifier.trim().toLowerCase();
        if (!cleanEmail) {
            setError("Please enter your registered email address.");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await onForgotPassword(cleanEmail);
            if (res.success) {
                setView('reset_sent');
            } else {
                setError(res.message);
            }
        } catch (err: any) {
            setError(err.message || "Recovery failure.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = new URLSearchParams(window.location.search).get('resetToken');
            if (!token) throw new Error("Missing reset token.");

            const res = await onResetPassword?.(token, password);
            if (res?.success) {
                alert("Password reset successfully! Please log in.");
                window.history.replaceState({}, document.title, window.location.pathname);
                setPassword('');
                setConfirmPassword('');
                setView('login');
            } else {
                setError(res?.message || "Failed to reset password.");
            }
        } catch (err: any) {
            setError(err.message || "Reset failure.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsRegistering(true);
        try {
            let result;
            if (regType === 'institution') {
                result = await onInstitutionRegister(regData);
                if (result.success) {
                    setGeneratedCreds(result.credentials || { email: regData.adminEmail, password: 'password123' });
                }
            } else {
                result = await onCountyRegister(countyRegData);
                if (result.success) {
                    setGeneratedCreds(result.credentials || { email: countyRegData.adminEmail, password: 'password123' });
                }
            }

            if (result.success) {
                setView('reg_success');
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            // setError("Registration failed. Please verify connection to the central registry.");
            setError(err.message || "Registration failed.");
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
                                    <label className={labelClasses} htmlFor="identifier">Email or Phone Number</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="07xx... or official@institution.edu" className={`${inputClasses} pl-10`} required />
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

                    {view === 'otp' && (
                        <div className="animate-fade-in-up space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ShieldExclamationIcon className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Two-Factor Security</h3>
                                <p className="text-sm text-slate-500 mt-1">Check your registered Email and Phone for a verification code.</p>
                            </div>
                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                <div>
                                    <label className={labelClasses}>Verification Code</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                            className={`${inputClasses} text-center text-3xl font-black tracking-[0.5em] caret-blue-600`}
                                            placeholder="······"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all">
                                    Verify 2FA Identity
                                </button>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onResendOtp();
                                        }}
                                        className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700"
                                    >
                                        Resend Verification Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('login')}
                                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-2"
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            </form>
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
                                        <input type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} className={`${inputClasses} pl-12`} placeholder="name@institution.edu" required autoFocus />
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? 'Syncing...' : 'Send Recovery Link'}
                                </button>
                                <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-2 transition-colors">Return to Login</button>
                            </form>
                        </div>
                    )}

                    {view === 'reset_sent' && (
                        <div className="text-center space-y-6 animate-fade-in-up">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Request Received</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                If an account exists for <span className="font-bold text-slate-700 dark:text-slate-300">{identifier}</span>,
                                you will receive an email with recovery instructions shortly.
                            </p>
                            <button onClick={() => setView('login')} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl shadow-xl transition-all">
                                Return to Login
                            </button>
                        </div>
                    )}

                    {view === 'reset_password' && (
                        <div className="animate-fade-in-up space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Set New Password</h3>
                                <p className="text-sm text-slate-500 mt-1">Please enter your new portal access PIN.</p>
                            </div>
                            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                                <div>
                                    <label className={labelClasses}>New Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} placeholder="Min 6 characters" required autoFocus />
                                </div>
                                <div>
                                    <label className={labelClasses}>Confirm Password</label>
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClasses} placeholder="Repeat password" required />
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50">
                                    {isSubmitting ? 'Updating...' : 'Update Password'}
                                </button>
                                <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-2 transition-colors">Cancel Reset</button>
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
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-6">
                                <button type="button" onClick={() => setRegType('institution')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${regType === 'institution' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <AcademicCapIcon className="w-4 h-4 inline mr-2" /> Institution
                                </button>
                                <button type="button" onClick={() => setRegType('county')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${regType === 'county' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <BuildingOfficeIcon className="w-4 h-4 inline mr-2" /> County Govt
                                </button>
                            </div>

                            <form onSubmit={handleRegisterSubmit} className="space-y-5">
                                {regType === 'institution' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClasses}>Institution Name</label>
                                            <input type="text" className={inputClasses} value={regData.institutionName} onChange={e => setRegData({ ...regData, institutionName: e.target.value })} placeholder="e.g. Global Tech University" required={regType === 'institution'} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Official Email</label>
                                                <input type="email" className={inputClasses} value={regData.institutionEmail} onChange={e => setRegData({ ...regData, institutionEmail: e.target.value })} required={regType === 'institution'} />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Phone</label>
                                                <input type="tel" className={inputClasses} value={regData.institutionPhone} onChange={e => setRegData({ ...regData, institutionPhone: e.target.value })} required={regType === 'institution'} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Institution Type</label>
                                            <select className={inputClasses} value={regData.institutionType} onChange={e => setRegData({ ...regData, institutionType: e.target.value, businessSubType: '' })}>
                                                <option value="Primary">Primary School</option>
                                                <option value="Secondary">Secondary School</option>
                                                <option value="University">University</option>
                                                <option value="College">College</option>
                                                <option value="Institute">Institute</option>
                                                <option value="Polytechnic">Polytechnic</option>
                                                <option value="ECD">ECD Center</option>
                                                <option value="International">International School</option>
                                                <option value="Business">Business</option>
                                            </select>
                                            {regData.institutionType === 'Business' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Business Category</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.businessSubType || ''}
                                                        onChange={e => setRegData({ ...regData, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Business Type --</option>
                                                        <option value="Car Wash">Car Wash</option>
                                                        <option value="Agrovet">Agrovet</option>
                                                        <option value="Salon/Kinyozi">Salon / Kinyozi</option>
                                                        <option value="Pharmacy">Pharmacy</option>
                                                        <option value="Retail Shop">Retail Shop</option>
                                                        <option value="Law Firm">Law Firm</option>
                                                    </select>
                                                </div>
                                            )}
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
                                                    <input type="text" className={inputClasses} value={regData.adminName} onChange={e => setRegData({ ...regData, adminName: e.target.value })} required={regType === 'institution'} />
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Email</label>
                                                    <input type="email" className={inputClasses} value={regData.adminEmail} onChange={e => setRegData({ ...regData, adminEmail: e.target.value })} required={regType === 'institution'} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-fade-in-up">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 mb-2">
                                            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium leading-relaxed">
                                                Register your County Government to oversee and manage education institutions within your jurisdiction.
                                            </p>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>County Name</label>
                                            <input type="text" className={inputClasses} value={countyRegData.countyName} onChange={e => setCountyRegData({ ...countyRegData, countyName: e.target.value })} placeholder="e.g. Nairobi County" required={regType === 'county'} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>County Code</label>
                                                <input type="text" className={inputClasses} value={countyRegData.countyCode} onChange={e => setCountyRegData({ ...countyRegData, countyCode: e.target.value })} placeholder="e.g. 047" required={regType === 'county'} />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Phone</label>
                                                <input type="tel" className={inputClasses} value={countyRegData.countyPhone} onChange={e => setCountyRegData({ ...countyRegData, countyPhone: e.target.value })} required={regType === 'county'} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Official Email</label>
                                            <input type="email" className={inputClasses} value={countyRegData.countyEmail} onChange={e => setCountyRegData({ ...countyRegData, countyEmail: e.target.value })} required={regType === 'county'} />
                                        </div>

                                        <div className="pt-2">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 mb-3">County Administrator</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelClasses}>Full Name</label>
                                                    <input type="text" className={inputClasses} value={countyRegData.adminName} onChange={e => setCountyRegData({ ...countyRegData, adminName: e.target.value })} required={regType === 'county'} />
                                                </div>
                                                <div>
                                                    <label className={labelClasses}>Office Email</label>
                                                    <input type="email" className={inputClasses} value={countyRegData.adminEmail} onChange={e => setCountyRegData({ ...countyRegData, adminEmail: e.target.value })} required={regType === 'county'} />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">An administrator account will be created automatically.</p>
                                        </div>
                                    </div>
                                )}
                                <button type="submit" disabled={isRegistering} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 mt-4">
                                    {isRegistering ? 'Provisioning Infrastructure...' : (regType === 'institution' ? 'Register Institution' : 'Register County Portal')}
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
