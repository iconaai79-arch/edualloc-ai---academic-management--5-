
import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import type { User, Institution, InstitutionRegistrationData, CountyRegistrationData, Course, AcademicLevel, StudentRegistrationData, CompanyDetails } from '../types';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { StarIcon } from './icons/StarIcon';
import { UserIcon } from './icons/UserIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';

interface LoginViewProps {
    onLogin: (email: string, password: string) => Promise<'success' | 'expired' | 'failed' | 'suspended' | 'otp_required'>;
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
    onOpenMarketplace: () => void;
    onOpenShowcase?: () => void;
    themeColor: string;
    onParentRequestOtp: (phone: string) => { success: boolean; message: string };
    onParentVerifyOtp: (phone: string, code: string) => { success: boolean; message: string };
    companyDetails: CompanyDetails;
    onResetPassword?: (token: string, pass: string) => Promise<{ success: boolean; message: string }>;
    onForgotPassword?: (identifier: string, method: 'email' | 'phone') => Promise<{ success: boolean; message: string }>;
    onVerifyResetOtp?: (phone: string, code: string) => Promise<{ success: boolean; message: string; resetToken?: string }>;
    schoolRegistry?: any[];
    initialView?: 'login' | 'register' | 'reset_password';
    prefillModuleId?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
    onLogin, onInstitutionRegister, onCountyRegister, logoUrl, applicationTitle,
    onOpenGuestPortal, onOpenGuestFeedback, onOpenMarketplace, onOpenShowcase, companyDetails, onForgotPassword, onResetPassword,
    onVerifyOtp, onResendOtp, onVerifyResetOtp, schoolRegistry = [], initialView = 'login', prefillModuleId, users = []
}) => {
    const superAdmin = (users || []).find(u => u.role === 'super_admin') || {
        name: 'System Super Admin',
        email: 'super@app.com',
        role: 'super_admin' as const,
        profilePhotoUrl: null
    };
    const [view, setView] = useState<'login' | 'register' | 'forgot_password' | 'recovery_otp' | 'reg_success' | 'reset_sent' | 'reset_password' | 'otp'>(initialView);
    const [identifier, setIdentifier] = useState('');
    const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify' | 'reset'>('request');
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string } | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password');
    const [scanningProgress, setScanningProgress] = useState(0);
    const [scanningStatus, setScanningStatus] = useState('Align your face within the frame.');
    const [isScanning, setIsScanning] = useState(false);

    const [regType, setRegType] = useState<'institution' | 'county'>('institution');

    const [regData, setRegData] = useState<InstitutionRegistrationData>({
        institutionName: '',
        institutionEmail: '',
        institutionPhone: '',
        institutionType: 'Education',
        adminName: '',
        adminEmail: '',
        loadDemoData: false,
        businessSubType: '',
        category: 'Primary',
        termsAccepted: false,
    });

    const [countyRegData, setCountyRegData] = useState<CountyRegistrationData>({
        countyName: '',
        countyCode: '',
        countyEmail: '',
        countyPhone: '',
        adminName: '',
        adminEmail: '',
        termsAccepted: false,
    });

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('resetToken');
        if (token) {
            setView('reset_password');
        }

        const resellerId = urlParams.get('resellerId');
        if (resellerId) {
            setRegData(prev => ({ ...prev, resellerId }));
            setView('register');
        }

        const claimSchoolId = urlParams.get('claimSchoolId');
        if (claimSchoolId && schoolRegistry.length > 0) {
            const school = schoolRegistry.find(s => s.id === claimSchoolId);
            if (school) {
                setRegData(prev => ({ 
                    ...prev, 
                    institutionName: school.name,
                    institutionType: 'Education',
                    category: 'Alumni Network'
                }));
                setView('register');
            }
        }

        if (prefillModuleId) {
            const MODULE_REG_MAPPING: Record<string, Partial<InstitutionRegistrationData>> = {
                'property': { institutionType: 'Business', category: 'Property Management', businessSubType: 'Property Management' },
                'coop': { institutionType: 'Cooperative', category: '', businessSubType: '' },
                'his': { institutionType: 'HIS', category: 'Hospital/Clinic', businessSubType: 'Hospital/Clinic' },
                'retail': { institutionType: 'Business', category: 'Retail Agency', businessSubType: 'Retail Agency' },
                'autoservice': { institutionType: 'Business', category: 'Car Wash', businessSubType: 'Car Wash' },
                'edu': { institutionType: 'Education', category: 'Primary', businessSubType: 'Primary' },
                'campaign': { institutionType: 'Political Campaign', category: 'Political Campaign Management', businessSubType: 'Political Campaign Management' },
                'legal': { institutionType: 'Law Firm', category: 'Law Firm', businessSubType: 'Law Firm' },
                'ds': { institutionType: 'Education', category: 'Driving School', businessSubType: 'Driving School' },
                'logistics': { institutionType: 'Logistics', category: 'Cargo & Delivery', businessSubType: 'Cargo & Delivery' },
                'showroom': { institutionType: 'Business', category: 'Automotive Marketplace', businessSubType: 'Automotive Marketplace' },
                'tourism': { institutionType: 'Hospitality', category: 'Travel Agency', businessSubType: 'Travel Agency' },
                'community': { institutionType: 'Community', category: 'Chama/Savings Group', businessSubType: 'Chama/Savings Group' },
                'alumni': { institutionType: 'Education', category: 'Alumni Network', businessSubType: 'Alumni Network' },
                'pharmacy': { institutionType: 'Pharmacy', category: '', businessSubType: '' },
                'fuel': { institutionType: 'Fuel Station', category: 'Fuel Station', businessSubType: 'Fuel Station' },
                'civil': { institutionType: 'Construction', category: 'Construction', businessSubType: 'Construction' },
                'events': { institutionType: 'Education', category: 'Sports & Athletics', businessSubType: 'Sports & Athletics' },
                'milling': { institutionType: 'Maize Miller', category: 'Commercial Maize Miller', businessSubType: 'Commercial Maize Miller' },
                'maize_miller': { institutionType: 'Maize Miller', category: 'Commercial Maize Miller', businessSubType: 'Commercial Maize Miller' }
            };

            const prefill = MODULE_REG_MAPPING[prefillModuleId];
            if (prefill) {
                setRegData(prev => ({ ...prev, ...prefill }));
            }
        }
    }, [schoolRegistry, prefillModuleId]);

    const handleStartFaceScan = () => {
        setIsScanning(true);
        setScanningProgress(0);
        setScanningStatus('Initializing webcam stream and mapping markers...');
        setError('');

        let progress = 0;
        const interval = setInterval(async () => {
            progress += 10;
            setScanningProgress(progress);

            if (progress === 30) {
                setScanningStatus('Extracting facial landmark descriptors...');
            } else if (progress === 60) {
                setScanningStatus('Comparing embeddings with student databases...');
            } else if (progress === 90) {
                setScanningStatus('Validating secure handshake and tokens...');
            } else if (progress >= 100) {
                clearInterval(interval);
                
                // Scan completed - Find student user
                const studentUser = (users || []).find(u => u && u.role === 'student');
                if (studentUser) {
                    setScanningStatus(`Match Found! Authenticating ${studentUser.name}...`);
                    try {
                        const result = await onLogin(studentUser.email || 'student@app.com', studentUser.password || 'password123');
                        if (result === 'failed') {
                            setError('Face ID verification failed.');
                            setIsScanning(false);
                        } else if (result === 'otp_required') {
                            setView('otp');
                            setIsScanning(false);
                        }
                    } catch (err: any) {
                        setError(err.message || 'Biometric login error.');
                        setIsScanning(false);
                    }
                } else {
                    // Fallback to demo user if no students found
                    setScanningStatus('Match Found! Authenticating demo student...');
                    try {
                        const result = await onLogin('student@app.com', 'password123');
                        if (result === 'failed') {
                            setError('Face ID verification failed.');
                            setIsScanning(false);
                        } else if (result === 'otp_required') {
                            setView('otp');
                            setIsScanning(false);
                        }
                    } catch (err: any) {
                        setError('No registered student profiles matched this face.');
                        setIsScanning(false);
                    }
                }
            }
        }, 300);
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const cleanIdentifier = identifier.trim();
            const result = await onLogin(cleanIdentifier, password);
            if (result === 'failed') {
                setError('Invalid email or password.');
            } else if (result === 'suspended') {
                setError('This institution account is suspended. Redirecting to billing...');
            } else if (result === 'expired') {
                setError('Your session or access has expired.');
            } else if (result === 'otp_required') {
                setView('otp');
            }
        } catch (err: any) {
            setError(err.message || 'Login system encountered an error.');
        } finally {
            setIsSubmitting(false);
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

    const handleForgotPassword = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        if (!onForgotPassword) {
            setError('Password recovery is not available.');
            return;
        }
        
        if (recoveryMethod === 'email') {
            const cleanEmail = identifier.trim().toLowerCase();
            if (!cleanEmail) {
                setError("Please enter your registered email address.");
                return;
            }
            setIsSubmitting(true);
            try {
                const res = await onForgotPassword(cleanEmail, 'email');
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
        } else {
            const cleanPhone = phoneNumber.trim();
            if (!cleanPhone) {
                setError("Please enter your registered phone number.");
                return;
            }
            
            const isResend = view === 'recovery_otp';
            if (isResend) setIsResending(true);
            else setIsSubmitting(true);

            try {
                const res = await onForgotPassword(cleanPhone, 'phone');
                if (res.success) {
                    if (isResend) {
                        alert("A new verification code has been sent to your phone.");
                        setOtpCode('');
                    } else {
                        setView('recovery_otp');
                    }
                } else {
                    setError(res.message);
                }
            } catch (err: any) {
                setError(err.message || "Recovery failure.");
            } finally {
                setIsSubmitting(false);
                setIsResending(false);
            }
        }
    };

    const handleVerifyResetOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!otpCode) {
            setError("Please enter the verification code sent to your phone.");
            return;
        }
        setIsSubmitting(true);
        try {
            if (!onVerifyResetOtp) throw new Error("OTP verification not available.");
            const res = await onVerifyResetOtp(phoneNumber, otpCode);
            if (res.success && res.resetToken) {
                setResetToken(res.resetToken);
                setView('reset_password');
            } else {
                setError(res.message || "Invalid or expired code.");
            }
        } catch (err: any) {
            setError(err.message || "Verification failed.");
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
            const token = resetToken || new URLSearchParams(window.location.search).get('resetToken');
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
            setError(err.message || "Registration failed.");
        } finally {
            setIsRegistering(false);
        }
    };

    const inputClasses = "shadow-sm appearance-none border rounded-2xl w-full py-3 px-4 text-slate-700 dark:text-white leading-tight focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:bg-slate-700 dark:border-slate-600 outline-none";
    const labelClasses = "block text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-1.5 ml-1";

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans">
            <div className="flex-grow flex items-center justify-center py-6 md:py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-6 md:space-y-8 bg-white dark:bg-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-center">
                        {(() => {
                            const isPortalEduAi = typeof window !== 'undefined' && (
                                window.location.hostname === 'portal.eduai.co.ke' ||
                                window.location.hostname === 'eduai.co.ke' ||
                                window.location.hostname === 'www.eduai.co.ke'
                            );
                            const effectiveLogo = isPortalEduAi ? '/eduai_logo_3d.png' : (logoUrl || '/eduai_logo_3d.png');
                            return (
                                <img 
                                    loading="lazy" 
                                    className="mx-auto h-16 w-auto mb-4 object-contain" 
                                    src={effectiveLogo} 
                                    alt="EduAI Logo" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/eduai_logo_3d.png'; }}
                                />
                            );
                        })()}
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tighter uppercase">
                            {(() => {
                                const isPortalEduAi = typeof window !== 'undefined' && (
                                    window.location.hostname === 'portal.eduai.co.ke' ||
                                    window.location.hostname === 'eduai.co.ke' ||
                                    window.location.hostname === 'www.eduai.co.ke'
                                );
                                return isPortalEduAi ? 'EduAi' : (applicationTitle || 'EduAi');
                            })()}
                        </h2>
                        <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-widest">Automation Management Hub</p>
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
                            {/* Login Method Tabs */}
                            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setLoginMethod('password'); setError(''); }}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMethod === 'password' ? 'bg-white dark:bg-slate-650 shadow-sm text-blue-650' : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'}`}
                                >
                                    Password Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setLoginMethod('face'); setError(''); }}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMethod === 'face' ? 'bg-white dark:bg-slate-650 shadow-sm text-blue-655' : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'}`}
                                >
                                    Face ID Login
                                </button>
                            </div>

                            {loginMethod === 'face' ? (
                                <div className="space-y-4 text-center">
                                    <div className="relative w-60 h-60 mx-auto rounded-full overflow-hidden border-4 border-dashed border-blue-500 flex items-center justify-center bg-slate-900 shadow-inner">
                                        {/* Scanner Overlay Line */}
                                        {isScanning && (
                                            <div 
                                                className="absolute left-0 right-0 h-1 bg-green-500 shadow-[0_0_8px_#22c55e] z-20"
                                                style={{
                                                    top: '0%',
                                                    animation: 'scanline 2s infinite linear'
                                                }}
                                            />
                                        )}
                                        
                                        {/* Scanning Grid Indicator */}
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_100%)] opacity-30 pointer-events-none z-10 animate-pulse" />

                                        {/* Webcam stream */}
                                        <Webcam
                                            audio={false}
                                            height={240}
                                            width={240}
                                            screenshotFormat="image/jpeg"
                                            videoConstraints={{
                                                width: 240,
                                                height: 240,
                                                facingMode: "user"
                                            }}
                                            className="absolute inset-0 w-full h-full object-cover z-0"
                                        />
                                    </div>
                                    
                                    {/* Scan Progress Bar */}
                                    {isScanning && (
                                        <div className="w-full bg-slate-100 dark:bg-slate-750 rounded-full h-2 mt-4 relative overflow-hidden">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                                style={{ width: `${scanningProgress}%` }}
                                            />
                                        </div>
                                    )}

                                    <div className="p-3 bg-slate-50 dark:bg-slate-750/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scanner Status</p>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">{scanningStatus}</p>
                                        {isScanning && <p className="text-xs text-indigo-550 font-extrabold mt-1">{scanningProgress}% Complete</p>}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleStartFaceScan}
                                        disabled={isScanning}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                                    >
                                        {isScanning ? 'Scanning Landmarks...' : 'Verify Face ID'}
                                    </button>
                                </div>
                            ) : (
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
                                            <button type="button" onClick={() => setView('forgot_password')} className="text-[10px] uppercase font-bold text-blue-650 hover:text-blue-700 tracking-tighter transition-colors">Forgot?</button>
                                        </div>
                                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******************" className={inputClasses} required />
                                    </div>
                                    <button 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2" 
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
                                    </button>
                                </form>
                            )}
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button type="button" onClick={onOpenGuestPortal} title="Guest Portal" className="flex items-center md:flex-col justify-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 transition-all hover:bg-white hover:shadow-md group">
                                    <CalendarDaysIcon className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Visit</span>
                                </button>
                                <button type="button" onClick={onOpenMarketplace} title="Marketplace" className="flex items-center md:flex-col justify-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30 transition-all hover:bg-white hover:shadow-md group">
                                    <ShoppingCartIcon className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform shrink-0" />
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Market</span>
                                </button>
                                <button type="button" onClick={onOpenShowcase} title="Showcase" className="flex items-center md:flex-col justify-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 transition-all hover:bg-white hover:shadow-md group">
                                    <SparklesIcon className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Showcase</span>
                                </button>
                                <button type="button" onClick={onOpenGuestFeedback} title="Feedback" className="flex items-center md:flex-col justify-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 transition-all hover:bg-white hover:shadow-md group">
                                    <StarIcon className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform shrink-0" />
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Feedback</span>
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
                                <p className="text-sm text-slate-500 mt-1">Choose your preferred recovery method.</p>
                            </div>

                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                                <button 
                                    type="button" 
                                    onClick={() => setRecoveryMethod('email')} 
                                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'email' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Email Address
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setRecoveryMethod('phone')} 
                                    className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'phone' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Phone Number
                                </button>
                            </div>

                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                {recoveryMethod === 'email' ? (
                                    <div>
                                        <label className={labelClasses}>Official Email</label>
                                        <div className="relative">
                                            <PaperAirplaneIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 rotate-45" />
                                            <input type="email" value={identifier} onChange={e => setIdentifier(e.target.value)} className={`${inputClasses} pl-12`} placeholder="name@institution.edu" required autoFocus />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className={labelClasses}>Registered Phone</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className={`${inputClasses} pl-12`} placeholder="07xx xxx xxx" required autoFocus />
                                        </div>
                                    </div>
                                )}
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isSubmitting ? 'Syncing...' : recoveryMethod === 'email' ? 'Send Recovery Link' : 'Request Reset OTP'}
                                </button>
                                <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-2 transition-colors">Return to Login</button>
                            </form>
                        </div>
                    )}

                    {view === 'recovery_otp' && (
                        <div className="animate-fade-in-up space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <ShieldExclamationIcon className="w-10 h-10" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Verify Reset Code</h3>
                                <p className="text-sm text-slate-500 mt-1">Check your phone <span className="font-bold text-slate-700 dark:text-slate-300">{phoneNumber}</span> for a recovery code.</p>
                            </div>
                            <form onSubmit={handleVerifyResetOtp} className="space-y-6">
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
                                    Verify Recovery Code
                                </button>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        disabled={isResending}
                                        onClick={() => handleForgotPassword()}
                                        className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isResending ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                Resending...
                                            </>
                                        ) : "Resend Code"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot_password')}
                                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-2"
                                    >
                                        Change Phone Number
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('login')}
                                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:opacity-80 py-1"
                                    >
                                        Return to Login
                                    </button>
                                </div>
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
                                            <label className={labelClasses}>Institution Group / Type</label>
                                            <select 
                                                className={inputClasses} 
                                                value={regData.institutionType} 
                                                onChange={e => {
                                                    const type = e.target.value;
                                                    let cat = '';
                                                    if (type === 'Education') cat = 'Primary';
                                                    if (type === 'Beauty College') cat = 'beauty college';
                                                    if (type === 'Business') cat = 'Agrovet';
                                                    if (type === 'HIS') cat = 'Hospital/Clinic';
                                                    if (type === 'Law Firm') cat = 'Law Firm';
                                                    if (type === 'Logistics') cat = 'Cargo & Delivery';
                                                    if (type === 'Community') cat = 'Chama/Savings Group';
                                                    if (type === 'Political Campaign') cat = 'Political Campaign Management';
                                                    if (type === 'Fuel Station') cat = 'Fuel Station';
                                                    if (type === 'Construction') cat = 'Construction';
                                                    if (type === 'Constituency') cat = 'Constituency';
                                                    if (type === 'Driving School') cat = 'Driving School';
                                                    if (type === 'Restaurant') cat = 'Restaurant & Cafe POS';
                                                    if (type === 'IELTS Academy') cat = 'IELTS & Language Academy';
                                                    if (type === 'Maize Miller' || type === 'Milling') cat = 'Commercial Maize Miller';
                                                    if (type === 'Invoicing' || type === 'Billing Services') cat = 'Commercial Invoicing & Billing';
                                                    setRegData({ ...regData, institutionType: type as any, category: cat, businessSubType: cat });
                                                }}
                                            >
                                                <option value="Invoicing">💼 Corporate Invoicing &amp; Billing Services</option>
                                                <option value="Education">Education Sector</option>
                                                <option value="IELTS Academy">IELTS & Language Training Academy</option>
                                                <option value="Beauty College">Beauty & Cosmetology College</option>
                                                <option value="HIS">Health Sector (HIS)</option>
                                                <option value="Pharmacy">Pharmacy / Chemist</option>
                                                <option value="Business">Business Ecosystem</option>
                                                <option value="Maize Miller">Maize Milling & Grain Processing</option>
                                                <option value="Cooperative">Agriculture / Cooperative</option>
                                                <option value="SACCO">Financial / SACCO</option>
                                                <option value="Law Firm">Legal / Law Firm</option>
                                                <option value="Logistics">Transport & Logistics</option>
                                                <option value="Community">Community & Welfare</option>
                                                <option value="Political Campaign">Political / Election Campaign Hub</option>
                                                <option value="Church">Religious / Church</option>
                                                <option value="Broadcaster">Media / Broadcaster</option>
                                                <option value="Reseller">Reseller Agency</option>
                                                <option value="Hospitality">Tourism & Hospitality</option>
                                                <option value="Fuel Station">Energy / Fuel Station</option>
                                                <option value="Construction">Engineering / Construction Hub</option>
                                                <option value="Driving School">Driving School</option>
                                                <option value="Restaurant">Restaurant & Cafe POS</option>
                                                <option value="Constituency">Constituency (NG-CDF)</option>
                                            </select>

                                            {(regData.institutionType === 'Invoicing' || (regData.institutionType as any) === 'Billing Services') && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Invoicing Business Category</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || 'Commercial Invoicing & Billing'}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Commercial Invoicing & Billing">Commercial Invoicing &amp; Billing</option>
                                                        <option value="Consultancy & Professional Services">Consultancy &amp; Professional Services</option>
                                                        <option value="General Supplier & Trade">General Supplier &amp; Trade</option>
                                                        <option value="Contractor & Technical Services">Contractor &amp; Technical Services</option>
                                                        <option value="Freelance & Creative Agency">Freelance &amp; Creative Agency</option>
                                                        <option value="SME Business Billing">SME Business Invoicing</option>
                                                    </select>
                                                </div>
                                            )}

                                            {(regData.institutionType === 'Maize Miller' || (regData.institutionType as any) === 'Milling') && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Milling & Grain Processing Category</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || 'Commercial Maize Miller'}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Commercial Maize Miller">Commercial Maize Miller (Roller Mill / Sifted Grade 1 & 2)</option>
                                                        <option value="Posho & Roller Mill">Posho & Roller Mill (Medium & Custom Milling)</option>
                                                        <option value="Grain Aggregator & Feeds Manufacturer">Grain Aggregator & Feeds Manufacturer (Intake + Feeds)</option>
                                                        <option value="Agro-Processing Cooperative">Agro-Processing Cooperative (Farmer Grain Intake)</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.institutionType === 'HIS' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Health Sector Category</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || 'Hospital/Clinic'}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Hospital/Clinic">Hospital / Clinic (Standard)</option>
                                                        <option value="Dental">Dental Clinic</option>
                                                        <option value="Eye">Eye Care / Ophthalmology</option>
                                                        <option value="Ear">Ear, Nose & Throat (ENT)</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.institutionType === 'Education' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Education Level / Category</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || 'Primary'}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Kindergarten">Kindergarten / Playgroup</option>
                                                        <option value="ECD">ECD Center</option>
                                                        <option value="Primary">Primary School</option>
                                                        <option value="Secondary">Secondary School</option>
                                                        <option value="International">International School</option>
                                                        <option value="College">College</option>
                                                        <option value="TVET">TVET / Vocational</option>
                                                        <option value="Institute">Institute</option>
                                                        <option value="Polytechnic">Polytechnic</option>
                                                        <option value="Driving School">Driving School</option>
                                                        <option value="beauty college">Beauty & Cosmetology College</option>
                                                        <option value="University">University</option>
                                                        <option value="Alumni Network">Alumni Network / Alumna Association</option>
                                                        <option value="Sports & Athletics">Sports & Athletics / Events Hub</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.category === 'Alumni Network' && (
                                                <div className="mt-3 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 animate-fade-in">
                                                    <label className="block text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] mb-2">Associate School / Institution</label>
                                                    <p className="text-[10px] text-slate-500 mb-3">Alumni will choose their specific school when registering on your portal.</p>
                                                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-indigo-100">
                                                        <span className="text-lg">🎓</span>
                                                        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Schools will be pulled from the platform database automatically.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {regData.institutionType === 'Logistics' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Logistics Niche / Focus</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || ''}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Focus --</option>
                                                        <option value="Cargo & Delivery">Logistics & Cargo Delivery</option>
                                                        <option value="Staff Shuttle">Corporate / Staff Shuttle</option>
                                                        <option value="Educational Transport">Educational Transport</option>
                                                        <option value="Public Transport SACCO">Public Transport (SACCO)</option>
                                                        <option value="SACCO Savings">SACCO Savings & Transport</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.institutionType === 'Community' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Community Focus Area</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || ''}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Focus --</option>
                                                        <option value="Chama/Savings Group">Self Help / Savings Group (Chama)</option>
                                                        <option value="Estate/Neighborhood">Estate / Neighborhood Management</option>
                                                        <option value="NGO/Foundation">NGO / Social Foundation</option>
                                                        <option value="Resource Center">Community Hub / Resource Center</option>
                                                        <option value="Relief/Social Work">Social Work / Welfare Relief</option>
                                                        <option value="Family Heritage">Family & Heritage Preservation</option>
                                                        <option value="Political Strategy">Political & Campaign Strategy</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.institutionType === 'Political Campaign' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Campaign Strategy Focus</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || ''}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Campaign Focus --</option>
                                                        <option value="Political Campaign Management">Campaign Strategy Hub</option>
                                                        <option value="Voter Outreach Hub">Voter Outreach & Field Hub</option>
                                                        <option value="Lead Scouting AI">AI Prospect & Lead Scouting</option>
                                                        <option value="Campaign Fundraising">Fundraising & Donor Hub</option>
                                                    </select>
                                                </div>
                                            )}

                                            {(regData.institutionType === 'Business' || regData.institutionType === 'Business Ecosystem') && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Business Niche / Category</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || ''}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Business Type --</option>
                                                        <option value="Maize Miller">Maize Miller & Grain Processing</option>
                                                        <option value="Agrovet">Agrovet (Agricultural Supplies)</option>
                                                        <option value="Property Management">Property Management (Rent/Leases)</option>
                                                        <option value="Retail Agency">Retail Agency (Commission Based)</option>
                                                        <option value="Car Wash">Car Wash / Service Center</option>
                                                        <option value="Automotive Marketplace">Car Sales / Showroom</option>
                                                        <option value="Restaurant & Cafe POS">Restaurant & Cafe POS</option>
                                                        <option value="Hardware">Hardware Store</option>
                                                        <option value="Pharmacy">Pharmacy / Chemist</option>
                                                        <option value="General">General Retail / Business</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.institutionType === 'Church' && (
                                                <div className="animate-fade-in-up mt-3">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 select-none">Select Church Tradition</label>
                                                    <select
                                                        className={inputClasses + " border-2 border-indigo-200"}
                                                        value={regData.businessSubType || ''}
                                                        onChange={e => setRegData({ ...regData, businessSubType: e.target.value as any, category: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Choose Tradition --</option>
                                                        <option value="Catholic">Catholic (Sacramental/SCC)</option>
                                                        <option value="Protestant">Protestant (Evangelical/Cell Groups)</option>
                                                        <option value="Orthodox">Orthodox (Holy Mysteries/Fasting Calendar)</option>
                                                    </select>
                                                </div>
                                            )}

                                            {regData.institutionType === 'Hospitality' && (
                                                <div className="mt-3 animate-fade-in">
                                                    <label className={labelClasses}>Hospitality Niche</label>
                                                    <select
                                                        className={inputClasses}
                                                        value={regData.category || ''}
                                                        onChange={e => setRegData({ ...regData, category: e.target.value, businessSubType: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">-- Select Focus Area --</option>
                                                        <option value="Travel Agency">Travel Agency (Local & Int'l)</option>
                                                        <option value="Tours & Safaris">Tours, Safaris & Expeditions</option>
                                                        <option value="Hotels & Resorts">Hotels, Lodges & Resorts</option>
                                                        <option value="Airbnb/Apartments">Airbnb & Short-term Rentals</option>
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

                                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={regType === 'institution' ? regData.termsAccepted : countyRegData.termsAccepted}
                                                onChange={e => {
                                                    if (regType === 'institution') setRegData({ ...regData, termsAccepted: e.target.checked });
                                                    else setCountyRegData({ ...countyRegData, termsAccepted: e.target.checked });
                                                }}
                                                className="peer h-5 w-5 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 appearance-none bg-white dark:bg-slate-800 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                                            />
                                            <CheckIcon className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Accept Terms & Conditions</span>
                                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">I agree to the platform usage policies and data processing terms.</p>
                                        </div>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isRegistering || (regType === 'institution' ? !regData.termsAccepted : !countyRegData.termsAccepted)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 mt-4"
                                >
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
                            <p className="text-sm text-slate-500 font-medium">Your login credentials have been sent to your registered phone number and email address. Please check your inbox and messages.</p>
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
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100/50 dark:border-indigo-800/30 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
                            {superAdmin.profilePhotoUrl ? (
                                <img src={superAdmin.profilePhotoUrl} alt={superAdmin.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                    {superAdmin.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Super Admin</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{superAdmin.name}</p>
                        </div>
                    </div>
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
                        <span className="text-xs font-black text-indigo-600/50 uppercase tracking-tighter">EduAi Automation</span>
                    </div>
                </div>
            </footer>
            <style>{`
                @keyframes scanline {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                }
            `}</style>
        </div>
    );
};

