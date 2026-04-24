
import React, { useState } from 'react';
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    Loader2, 
    ArrowRight, 
    Sparkles, 
    ShieldCheck,
    Users
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface AlumnaeLoginViewProps {
    onLoginSuccess: (alumna: any) => void;
    onSwitchToRegister: () => void;
}

export const AlumnaeLoginView: React.FC<AlumnaeLoginViewProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Find the alumna by email
            const results = await apiService.fetchModuleRecords('alumnae_members', {
                email: email.toLowerCase().trim()
            });

            const alumna = results.find((a: any) => 
                (a.email?.toLowerCase() === email.toLowerCase().trim()) || 
                (a.user_email?.toLowerCase() === email.toLowerCase().trim())
            );

            if (!alumna) {
                throw new Error('No account found with this email.');
            }

            // Verify password (in a real app, this would be a secure backend verify)
            // For now, we follow the platform's existing pattern
            if (alumna.password !== password) {
                throw new Error('Incorrect password. Please try again.');
            }

            // Success
            onLoginSuccess(alumna);
        } catch (e: any) {
            setError(e.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="p-12">
                    <div className="flex flex-col items-center text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-none mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Users className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Alumnae <span className="text-indigo-600 italic">Circle</span></h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3">Welcome Back to the Legacy</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full h-16 pl-14 pr-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-500 text-[10px] font-bold uppercase tracking-tight flex items-center gap-3 animate-in shake duration-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-slate-200 dark:shadow-none"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            Sign In
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">New to the Circle?</p>
                        <button 
                            onClick={onSwitchToRegister}
                            className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            Create Alumnae Account
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
