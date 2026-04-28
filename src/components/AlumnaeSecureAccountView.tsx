
import React, { useState } from 'react';
import { 
    Lock, 
    ShieldCheck, 
    Eye, 
    EyeOff, 
    Loader2, 
    Sparkles, 
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface AlumnaeSecureAccountViewProps {
    alumna: any;
    onComplete: () => void;
}

export const AlumnaeSecureAccountView: React.FC<AlumnaeSecureAccountViewProps> = ({ alumna, onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSecure = async () => {
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            // 1. Update the alumnae_members record with the new password
            await apiService.updateModuleRecord('alumnae_members', alumna.id, {
                password: password
            });

            setIsSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (e: any) {
            setError(e.message || 'Failed to secure account');
        } finally {
            setIsSaving(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>
                <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl relative z-10">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-xl shadow-emerald-200/50">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Account <span className="text-emerald-500">Secured</span></h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] leading-loose">
                        Your professional legacy is now protected. Taking you to the alumnae circle...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>
            <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl relative z-10">
                <div className="p-12">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 dark:shadow-none">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Secure <span className="text-indigo-600">Account</span></h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hello, {alumna.fullName?.split(' ')[0]}</p>
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 font-medium leading-relaxed">
                        To protect your network access and professional profile, please create a secure password for your Alumnae Circle account.
                    </p>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Create Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 6 characters"
                                    className="w-full h-14 pl-12 pr-12 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat your password"
                                    className="w-full h-14 pl-12 pr-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-tight flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={handleSecure}
                            disabled={isSaving || !password || !confirmPassword}
                            className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-slate-200 dark:shadow-none"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            Complete Setup
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="px-12 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Grade</p>
                    <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`w-6 h-1 rounded-full ${password.length >= (i*2) ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
