
import React, { useState } from 'react';
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    Loader2, 
    ArrowRight, 
    Sparkles, 
    Users,
    ChevronLeft,
    Globe,
    ShieldCheck,
    Send,
    KeyRound,
    Building2
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface AlumnaeLoginViewProps {
    onLoginSuccess: (alumna: any) => void;
    onSwitchToRegister: () => void;
    onBack?: () => void;
    onClaimOwnership: () => void;
}

export const AlumnaeLoginView: React.FC<AlumnaeLoginViewProps> = ({ onLoginSuccess, onSwitchToRegister, onBack, onClaimOwnership }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [matchingProfiles, setMatchingProfiles] = useState<any[]>([]);
    const [isSelectingProfile, setIsSelectingProfile] = useState(false);

    // Forgot Password Flow
    const [forgotPasswordStep, setForgotPasswordStep] = useState<'none' | 'email' | 'otp' | 'reset'>('none');
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetTargetProfile, setResetTargetProfile] = useState<any>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Verification credentials required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Discovery Phase: Search by primary email column
            let results = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                filter: { email: email.toLowerCase().trim() }
            });

            // Fallback: Search by legacy user_email column if no results found
            if (!results || results.length === 0) {
                results = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                    filter: { user_email: email.toLowerCase().trim() }
                });
            }

            // Filter for exact matches and valid password
            const validProfiles = (results || []).filter((a: any) => 
                ((a.email?.toLowerCase() === email.toLowerCase().trim()) || 
                 (a.user_email?.toLowerCase() === email.toLowerCase().trim())) &&
                a.password === password
            );

            if (validProfiles.length === 0) {
                throw new Error('Identity verification failed. Check credentials.');
            }

            if (validProfiles.length === 1) {
                onLoginSuccess(validProfiles[0]);
            } else {
                setMatchingProfiles(validProfiles);
                setIsSelectingProfile(true);
            }
        } catch (e: any) {
            setError(e.message || 'Identity verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) {
            setError('Please enter your registered email');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Discovery Phase: Search by primary email column
            let results = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                filter: { email: resetEmail.toLowerCase().trim() }
            });

            // Fallback: Search by legacy user_email column if no results found
            if (!results || results.length === 0) {
                results = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, {
                    filter: { user_email: resetEmail.toLowerCase().trim() }
                });
            }

            if (!results || results.length === 0) {
                throw new Error('No account found with this email.');
            }

            const profile = results[0];
            setResetTargetProfile(profile);

            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedOtp(otp);

            // Send OTP
            await apiService.sendEmail(
                resetEmail, 
                'Password Reset Code', 
                `Your password reset code for Alumnae Prestige Circle is: ${otp}. If you did not request this, please ignore this email.`
            );

            setForgotPasswordStep('otp');
        } catch (e: any) {
            setError(e.message || 'Failed to initiate reset');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        if (resetOtp === generatedOtp) {
            setForgotPasswordStep('reset');
            setError('');
        } else {
            setError('Invalid verification code');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await apiService.saveModuleRecord('alumnae_members', {
                ...resetTargetProfile,
                password: newPassword
            });
            
            alert('Password reset successful! Please login with your new password.');
            setForgotPasswordStep('none');
            setEmail(resetEmail);
            setResetEmail('');
            setResetOtp('');
            setGeneratedOtp('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            setError(e.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    if (forgotPasswordStep !== 'none') {
        return (
            <div className="min-h-screen w-full flex bg-[#020617] items-center justify-center p-6 relative overflow-hidden font-sans">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
                <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl p-10 sm:p-14 rounded-[4rem] border border-white/10 shadow-2xl relative z-10">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                            <ShieldCheck className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">
                            {forgotPasswordStep === 'email' ? 'Reset' : forgotPasswordStep === 'otp' ? 'Verify' : 'New'} <br /> 
                            <span className="italic text-indigo-400">Security Key</span>
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                            {forgotPasswordStep === 'email' ? 'Step 1: Account Recovery' : forgotPasswordStep === 'otp' ? 'Step 2: Identity Verification' : 'Step 3: Access Restoration'}
                        </p>
                    </div>

                    {forgotPasswordStep === 'email' && (
                        <form onSubmit={handleRequestReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Registered Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full h-16 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-16 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-400 hover:text-white transition-all disabled:opacity-50 shadow-xl"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Send Reset Code
                            </button>
                        </form>
                    )}

                    {forgotPasswordStep === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Verification Code</label>
                                <input 
                                    type="text"
                                    value={resetOtp}
                                    onChange={(e) => setResetOtp(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-center text-2xl font-black tracking-[0.5em] text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                                <p className="text-[9px] text-center text-slate-500 font-bold uppercase tracking-widest mt-2">Code sent to {resetEmail}</p>
                            </div>
                            <button 
                                type="submit"
                                className="w-full h-16 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-400 hover:text-white transition-all shadow-xl"
                            >
                                Verify Identity
                            </button>
                        </form>
                    )}

                    {forgotPasswordStep === 'reset' && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">New Password</label>
                                    <input 
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Confirm Password</label>
                                    <input 
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full h-16 px-6 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                Update Password
                            </button>
                        </form>
                    )}

                    {error && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-tight text-center">
                            {error}
                        </div>
                    )}

                    <div className="mt-10 pt-8 border-t border-white/5 flex justify-center">
                        <button 
                            onClick={() => {
                                setForgotPasswordStep('none');
                                setError('');
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isSelectingProfile) {
        return (
            <div className="min-h-screen w-full flex bg-[#020617] items-center justify-center p-6 relative overflow-hidden font-sans">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
                <div className="w-full max-w-2xl bg-white/5 backdrop-blur-3xl p-10 sm:p-14 rounded-[4rem] border border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-inner">
                            <Users className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-3">Multi-Network <br /> <span className="italic text-indigo-400">Identity Detected</span></h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Select which institution circle you wish to enter</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {matchingProfiles.map((profile) => (
                            <button
                                key={profile.id}
                                onClick={() => onLoginSuccess(profile)}
                                className="group flex items-center justify-between p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/10 hover:border-indigo-500/50 transition-all text-left relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 to-indigo-600/0 group-hover:to-indigo-600/5 transition-all"></div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-xl font-black text-indigo-400 group-hover:scale-110 transition-transform">
                                        {profile.institutionName?.charAt(0) || profile.full_name?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white uppercase tracking-tight text-lg leading-tight group-hover:text-indigo-300 transition-colors">
                                            {profile.institutionName || 'Legacy Institution'}
                                        </h4>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                                            Class of {profile.graduationYear || profile.class_year || 'N/A'} • {profile.profession || 'Verified Alumna'}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-2 transition-all" />
                            </button>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/5 flex justify-center">
                        <button 
                            onClick={() => setIsSelectingProfile(false)}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Cancel Selection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex bg-[#020617] overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Cinematic Left Side (3D Branding) */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-20 relative border-r border-white/5 bg-gradient-to-br from-slate-950 to-indigo-950/30">
                <div className="relative group cursor-default">
                    {/* Glow effect behind logo */}
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-700"></div>
                    <img 
                        src="/alumnae_logo_3d.png" 
                        alt="Alumnae 3D Emblem"
                        className="w-[450px] h-auto relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] animate-float"
                    />
                </div>
                
                <div className="mt-12 text-center max-w-lg relative z-10">
                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-6">
                        The Alumnae <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 italic">Prestige Circle</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
                        Connect with excellence. Access the official alumni social infrastructure of elite academic institutions.
                    </p>
                    <div className="flex gap-8 justify-center opacity-40">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Global</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modern Glassmorphic Right Side (Login Form) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-right-12 duration-1000">
                    {/* Mobile Branding (only visible on small screens) */}
                    <div className="lg:hidden flex flex-col items-center mb-12 text-center">
                        <img src="/alumnae_logo_3d.png" className="w-40 h-auto mb-6 drop-shadow-2xl" />
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Alumnae <span className="text-indigo-500">Circle</span></h2>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl p-10 sm:p-14 rounded-[3.5rem] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                        {/* Decorative internal glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-700 group-hover:scale-150"></div>
                        
                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">Welcome <br /> <span className="italic text-indigo-400">Back Member</span></h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Identity Verification Gateway</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registry Email</label>
                                </div>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full h-16 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="px-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Access Password</label>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-16 pl-14 pr-14 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-4 animate-in shake duration-300">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                                    {error}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-16 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-400 hover:text-white transition-all duration-500 disabled:opacity-50 group/btn shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                Authenticate
                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>

                            <div className="text-center pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setForgotPasswordStep('email')}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 mx-auto group"
                                >
                                    <KeyRound className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    Forgot Password?
                                </button>
                            </div>
                        </form>

                        <div className="mt-12 pt-8 border-t border-white/5 text-center space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Not a member yet?</p>
                                <button 
                                    onClick={onSwitchToRegister}
                                    className="text-xs font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-3 mx-auto group"
                                >
                                    Apply for Access <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4">Institution Representative?</p>
                                <button 
                                    onClick={onClaimOwnership}
                                    className="text-[10px] font-black text-white uppercase tracking-[0.2em] hover:text-indigo-400 transition-all flex items-center justify-center gap-3 mx-auto"
                                >
                                    <Building2 className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    Claim School Ownership
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between items-center px-4">
                        <button onClick={onBack} className="text-slate-500 hover:text-white flex items-center gap-2 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Return Home</span>
                        </button>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">EduAI Secure Auth v2.0</span>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out infinite;
                }
            `}</style>
        </div>

    );
};
