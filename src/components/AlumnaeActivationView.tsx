
import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    Mail, 
    Smartphone, 
    CheckCircle2, 
    ArrowRight, 
    Globe, 
    Zap,
    Sparkles,
    Lock,
    QrCode,
    MessageSquare,
    Bell
} from 'lucide-react';

interface AlumnaeActivationViewProps {
    onFinish: () => void;
}

export const AlumnaeActivationView: React.FC<AlumnaeActivationViewProps> = ({ onFinish }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Initializing Secure Sync...');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const steps = [
            { p: 20, m: 'Encrypting Profile Identity...' },
            { p: 45, m: 'Syncing with Institutional Registry...' },
            { p: 70, m: 'Configuring Neural Notification Node...' },
            { p: 90, m: 'Generating Legacy Access Token...' },
            { p: 100, m: 'Activation Sequence Complete!' }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setProgress(steps[currentStep].p);
                setStatus(steps[currentStep].m);
                currentStep++;
            } else {
                clearInterval(interval);
                setIsComplete(true);
            }
        }, 800);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-12 relative overflow-hidden text-center">
                
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                {!isComplete ? (
                    <div className="space-y-10 animate-fade-in relative z-10">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                            <div 
                                className="absolute inset-0 rounded-full border-4 border-indigo-600 transition-all duration-500 ease-out"
                                style={{ 
                                    clipPath: `inset(${(100 - progress)}% 0 0 0)`,
                                    transform: `rotate(${progress * 3.6}deg)`
                                }}
                            ></div>
                            <div className="absolute inset-4 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600">
                                <Zap className="w-10 h-10 animate-pulse" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Portal <span className="text-indigo-600 italic">Activation</span></h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 animate-pulse">{status}</p>
                        </div>

                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-bounce-in relative z-10">
                        <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/30">
                            <ShieldCheck className="w-12 h-12" />
                        </div>

                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Identity <span className="text-emerald-500 italic">Activated</span></h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4 leading-relaxed">Your professional legacy is now synced. Follow the steps below to finalize your portal access.</p>
                        </div>

                        <div className="grid gap-4 text-left">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center gap-6 border border-slate-100 dark:border-white/5 group hover:bg-white dark:hover:bg-slate-700 transition-all hover:shadow-xl cursor-pointer">
                                <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 dark:border-white/5">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Verify Email Address</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Check your inbox for the link</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center gap-6 border border-slate-100 dark:border-white/5 group hover:bg-white dark:hover:bg-slate-700 transition-all hover:shadow-xl cursor-pointer">
                                <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 dark:border-white/5">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Set Multi-Factor Auth</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Enhance profile security</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center gap-6 border border-slate-100 dark:border-white/5 group hover:bg-white dark:hover:bg-slate-700 transition-all hover:shadow-xl cursor-pointer">
                                <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 dark:border-white/5">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Enable Smart Alerts</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Get university updates & jobs</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>

                        <button 
                            onClick={onFinish}
                            className="w-full h-20 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100 mt-6 active:scale-95 group"
                        >
                            Enter The Hub <Sparkles className="inline-block ml-2 w-4 h-4 group-hover:rotate-12 transition-all" />
                        </button>
                    </div>
                )}
            </div>

            {/* Support Help */}
            <p className="mt-12 text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-fade-in" style={{ animationDelay: '1s' }}>
                <QrCode className="w-4 h-4" /> Having trouble? Contact <span className="text-indigo-600 underline">System Support</span>
            </p>
        </div>
    );
};
