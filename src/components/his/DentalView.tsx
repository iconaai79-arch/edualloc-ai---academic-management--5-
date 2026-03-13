import React, { useState } from 'react';
import { 
    PlusIcon, 
    SparklesIcon,
    ArrowPathIcon,
    SearchIcon,
    ActivityIcon
} from '../icons/index';
import { ScissorsIcon } from './HealthIcons';

interface Tooth {
    id: number;
    status: 'Healthy' | 'Decayed' | 'Filled' | 'Missing' | 'Crowned';
    history: string[];
}

export const DentalView: React.FC = () => {
    const [selectedTooth, setSelectedTooth] = useState<Tooth | null>(null);
    const [teeth, setTeeth] = useState<Tooth[]>(
        Array.from({ length: 32 }, (_, i) => ({ 
            id: i + 1, 
            status: i % 7 === 0 ? 'Decayed' : i % 10 === 0 ? 'Filled' : 'Healthy',
            history: [] 
        }))
    );

    const getToothColor = (status: Tooth['status']) => {
        switch (status) {
            case 'Healthy': return 'text-slate-200';
            case 'Decayed': return 'text-rose-500';
            case 'Filled': return 'text-blue-400';
            case 'Missing': return 'text-slate-800';
            case 'Crowned': return 'text-amber-400';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Digital <span className="text-teal-400">Odontogram</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Precision Oral Mapping & Procedure Logging</p>
                </div>
                <div className="flex gap-4">
                    <button className="glass-morphism px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all bg-white text-slate-950">
                        <PlusIcon className="w-4 h-4" /> New Exam
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 3D-Like Odontogram Board */}
                <div className="md:col-span-2 glass-morphism p-12 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    
                    <div className="flex flex-col gap-12 relative z-10">
                        {/* Upper Arch */}
                        <div className="flex justify-center gap-3">
                            {teeth.slice(0, 16).map(tooth => (
                                <button 
                                    key={tooth.id}
                                    onClick={() => setSelectedTooth(tooth)}
                                    className={`w-12 h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all transform hover:scale-110 active:scale-95 ${
                                        selectedTooth?.id === tooth.id ? 'bg-teal-500/20 border-teal-500/50 scale-110 shadow-lg shadow-teal-500/20' : 'bg-white/5 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <span className={`text-[8px] font-black ${selectedTooth?.id === tooth.id ? 'text-teal-400' : 'text-slate-500'}`}>{tooth.id}</span>
                                    <div className={`w-6 h-8 rounded-full border-2 ${getToothColor(tooth.status)} border-current opacity-80`}></div>
                                </button>
                            ))}
                        </div>

                        {/* Mid-Line Indicator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full"></div>

                        {/* Lower Arch */}
                        <div className="flex justify-center flex-row-reverse gap-3">
                            {teeth.slice(16, 32).map(tooth => (
                                <button 
                                    key={tooth.id}
                                    onClick={() => setSelectedTooth(tooth)}
                                    className={`w-12 h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all transform hover:scale-110 active:scale-95 ${
                                        selectedTooth?.id === tooth.id ? 'bg-teal-500/20 border-teal-500/50 scale-110 shadow-lg shadow-teal-500/20' : 'bg-white/5 border-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <span className={`text-[8px] font-black ${selectedTooth?.id === tooth.id ? 'text-teal-400' : 'text-slate-500'}`}>{tooth.id}</span>
                                    <div className={`w-6 h-8 rounded-full border-2 ${getToothColor(tooth.status)} border-current opacity-80 transform rotate-180`}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-16 flex justify-center gap-6">
                        {['Healthy', 'Decayed', 'Filled', 'Missing', 'Crowned'].map(status => (
                            <div key={status} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border-2 ${getToothColor(status as any)} border-current`}></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tooth Detail & Action Panel */}
                <div className="space-y-6">
                    {selectedTooth ? (
                        <div className="glass-morphism p-8 rounded-[2.5rem] border border-white/5 animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center border border-teal-500/20">
                                    <span className="text-2xl font-black text-teal-400">{selectedTooth.id}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Tooth <span className="text-teal-400">Details</span></h3>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status: {selectedTooth.status}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Diagnosis</p>
                                    <p className="text-xs font-bold">{selectedTooth.status === 'Healthy' ? 'No pathologies detected.' : `Class ${selectedTooth.id % 4 + 1} ${selectedTooth.status.toLowerCase()} noted.`}</p>
                                </div>
                                
                                <button className="w-full bg-white text-slate-950 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">
                                    Log Procedure
                                </button>
                                <button className="w-full border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
                                    Upload X-Ray
                                </button>
                            </div>

                            <div className="mt-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Procedure History</p>
                                <div className="space-y-3 opacity-60">
                                    <div className="flex gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1"></div>
                                        <p className="text-[10px] font-bold">Scaling & Polishing (12th Oct 2025)</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1"></div>
                                        <p className="text-[10px] font-bold">Composite Filling - Distal (3rd Feb 2024)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-morphism p-12 rounded-[2.5rem] border border-white/5 text-center flex flex-col items-center justify-center h-full opacity-40 grayscale">
                            <ActivityIcon className="w-12 h-12 text-slate-700 mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Select a tooth to analyze</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
