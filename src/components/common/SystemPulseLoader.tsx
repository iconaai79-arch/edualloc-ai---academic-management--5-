
import React from 'react';

export const SystemPulseLoader: React.FC<{ message: string; onRetry?: () => void; status?: string }> = ({ message, onRetry, status }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 animate-mesh opacity-40"></div>
        
        {/* Decorative Glowing Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 flex flex-col items-center">
            {/* Logo Container with Neural Pulse */}
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-indigo-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-white shadow-2xl relative border border-white/10 animate-float overflow-hidden">
                    <img loading="lazy" 
                        src="/eduai_logo_3d.png" 
                        alt="EduAI Logo" 
                        className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(79,70,229,0.4)]" 
                    />
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-scan"></div>
                </div>
                
                {/* Orbital Ring */}
                <div className="absolute -inset-4 border border-indigo-500/30 rounded-[2.5rem] animate-spin-slow"></div>
            </div>

            <div className="text-center space-y-4">
                <h2 className="text-white font-black uppercase tracking-[0.4em] text-lg text-glow">
                    Powered by <span className="text-indigo-400">EduAI</span> Automation Network
                </h2>
                <div className="flex flex-col items-center gap-6">
                    <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
                        {message}
                    </p>
                    
                    {status && (
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{status}</p>
                    )}

                    {onRetry && (
                        <button 
                            onClick={onRetry}
                            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-2 px-6 rounded-lg transition-all border border-white/10 mt-2"
                        >
                            Retry Connection
                        </button>
                    )}
                    
                    {/* Premium Progress Indicator */}
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full animate-shimmer"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Branding */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Connecting to Automation Core</p>
        </div>
    </div>
);
