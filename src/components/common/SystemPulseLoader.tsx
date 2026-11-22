
import React from 'react';
import { EduAiAvatar } from './EduAiAvatar';

export const EduAiBannerFlyover: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
    <div
        className={`relative w-full overflow-hidden pointer-events-none select-none ${
            compact ? 'h-14 my-2' : 'h-20 mb-6 max-w-2xl'
        }`}
        aria-hidden="true"
    >
        <style>{`
            @keyframes eduai-fly-ltr {
                0% { transform: translateX(-340px); opacity: 0; }
                8% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateX(calc(100% + 60px)); opacity: 0; }
            }
            @keyframes eduai-banner-wave {
                0%, 100% { transform: skewY(-1.5deg) translateY(0px); }
                50% { transform: skewY(1.8deg) translateY(-2.5px); }
            }
            @keyframes eduai-bob {
                0%, 100% { transform: translateY(0px) rotate(6deg); }
                50% { transform: translateY(-4px) rotate(9deg); }
            }
        `}</style>

        <div
            className="absolute inset-y-0 left-0 w-full flex items-center"
            style={{
                animation: `eduai-fly-ltr ${compact ? '7.5s' : '8.5s'} linear infinite`,
            }}
        >
            <div className="inline-flex items-center shrink-0">
                {/* Trailing Waving Banner: "FEEL THE POWER" */}
                <div
                    className="relative flex items-center"
                    style={{ animation: 'eduai-banner-wave 1.5s ease-in-out infinite' }}
                >
                    {/* Ribbon Forked Tail (Left) */}
                    <svg
                        width={compact ? '14' : '18'}
                        height={compact ? '28' : '36'}
                        viewBox="0 0 18 36"
                        className="-mr-[1px] drop-shadow"
                    >
                        <polygon points="0,0 18,0 18,36 0,36 8,18" fill="#4F46E5" />
                    </svg>

                    {/* Banner Body */}
                    <div
                        className={`relative flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-500 text-white font-black uppercase tracking-[0.22em] shadow-[0_0_24px_rgba(34,211,238,0.45)] border-y border-white/30 ${
                            compact ? 'px-3.5 py-1 text-[10px]' : 'px-5 py-1.5 text-xs'
                        }`}
                    >
                        <span className="text-amber-200">⚡</span>
                        <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">FEEL THE POWER</span>
                        <span className="text-amber-200">⚡</span>
                    </div>
                </div>

                {/* Glowing Tow Ropes connecting Banner to Avatar */}
                <svg
                    width={compact ? '26' : '34'}
                    height={compact ? '28' : '36'}
                    viewBox="0 0 34 36"
                    className="-mx-1"
                >
                    <line x1="0" y1="7" x2="34" y2="16" stroke="#38BDF8" strokeWidth="1.6" strokeDasharray="3 2" />
                    <line x1="0" y1="29" x2="34" y2="21" stroke="#34D399" strokeWidth="1.6" strokeDasharray="3 2" />
                </svg>

                {/* Leading Flying EduAI Avatar */}
                <div style={{ animation: 'eduai-bob 1.2s ease-in-out infinite' }}>
                    <EduAiAvatar
                        size={compact ? 42 : 56}
                        mood="celebrating"
                        showOrbit={false}
                        interactive={false}
                    />
                </div>
            </div>
        </div>
    </div>
);

export const SystemPulseLoader: React.FC<{ message: string; onRetry?: () => void; status?: string }> = ({ message, onRetry, status }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 animate-mesh opacity-40"></div>
        
        {/* Decorative Glowing Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">
            {/* Logo Container with Neural Pulse */}
            <div className="relative mb-6">
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

            {/* EduAI Avatar Flying Left-to-Right Pulling "FEEL THE POWER" Banner */}
            <EduAiBannerFlyover />

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
