
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
    ChevronLeft,
    Flag,
    Zap
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface CampaignLoginViewProps {
    onLoginSuccess: (member: any) => void;
    onBack?: () => void;
}

export const CampaignLoginView: React.FC<CampaignLoginViewProps> = ({ onLoginSuccess, onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Operational credentials required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Using a generic member lookup for now, can be hardened later
            const results = await apiService.fetchModuleRecords('campaign_members', {
                email: email.toLowerCase().trim()
            });

            const member = results.find((m: any) => m.email?.toLowerCase() === email.toLowerCase().trim());

            if (!member) throw new Error('Command Identity not recognized.');
            if (member.password !== password) throw new Error('Secure access denied.');

            onLoginSuccess(member);
        } catch (e: any) {
            setError(e.message || 'War Room authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#020617] overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Cinematic Left Side (3D Branding) */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-20 relative border-r border-white/5 bg-gradient-to-br from-slate-950 via-[#0a0f1e] to-slate-950">
                <div className="relative group cursor-default">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-700"></div>
                    <img loading="lazy" 
                        src="/campaign_command_3d_logo_1777007425977.png" 
                        alt="Campaign Command Emblem"
                        className="w-[450px] h-auto relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] animate-float"
                    />
                </div>
                
                <div className="mt-12 text-center max-w-lg relative z-10">
                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-6">
                        Campaign <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-400 italic">Command Circle</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
                        The ultimate war-room infrastructure for modern political strategy. Access your campaign's inner circle.
                    </p>
                    <div className="flex gap-8 justify-center opacity-40">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-red-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modern Glassmorphic Right Side (Login Form) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-right-12 duration-1000">
                    <div className="lg:hidden flex flex-col items-center mb-12 text-center">
                        <img loading="lazy" src="/campaign_command_3d_logo_1777007425977.png" className="w-40 h-auto mb-6 drop-shadow-2xl" />
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Command <span className="text-blue-500">Circle</span></h2>
                    </div>

                    <div className="bg-white/5 backdrop-blur-2xl p-10 sm:p-14 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-700 group-hover:scale-150"></div>
                        
                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">Identify <br /> <span className="italic text-blue-400">Strategist</span></h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">War Room Access Gateway</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Strategic Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="commander@campaign.com"
                                        className="w-full h-16 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Command Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-16 pl-14 pr-14 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
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
                                className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-500 transition-all duration-500 disabled:opacity-50 group/btn shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flag className="w-5 h-5" />}
                                Enter War Room
                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-white/5 text-center">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">New Strategist?</p>
                            <button 
                                onClick={() => window.location.href = '/?view=community&filter=Political%20Campaign'}
                                className="text-xs font-black text-blue-400 uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-3 mx-auto"
                            >
                                Join a Campaign <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between items-center px-4">
                        <button onClick={onBack} className="text-slate-500 hover:text-white flex items-center gap-2 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Return Home</span>
                        </button>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">EduAI Command Auth v1.1</span>
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
            `}</style>
        </div>
    );
};

