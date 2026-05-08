
import React, { useState, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { generateFullSqlScript } from '../../utils/sqlGenerator';
import { ArrowPathIcon, SparklesIcon } from '../icons';

export const SchemaInitializationView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isRepairing, setIsRepairing] = useState(false);
    const sqlScript = useMemo(() => generateFullSqlScript(), []);

    const handleAutoRepair = async () => {
        if (!window.confirm("Initialize registry tables? Proceed?")) return;
        setIsRepairing(true);
        try {
            const result = await apiService.runMigration(sqlScript);
            if (result.success) onComplete();
            else alert("Auto-setup failed. Please run the SQL manually in Supabase editor.");
        } catch (e: any) { alert("An error occurred during registry initialization."); }
            finally { setIsRepairing(false); }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden text-center">
            {/* Background Effects */}
            <div className="absolute inset-0 animate-mesh opacity-30"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_70%)]"></div>

            <div className="max-w-2xl w-full relative z-10">
                <div className="glass-morphism rounded-[3rem] p-12 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -ml-16 -mb-16"></div>

                    <div className="relative text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-8 shadow-2xl shadow-indigo-500/20 animate-float border border-white/20 overflow-hidden relative">
                            <img loading="lazy" 
                                src="/eduai_logo_3d.png" 
                                alt="EduAI Logo" 
                                className="w-16 h-16 object-contain" 
                            />
                            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-scan"></div>
                        </div>

                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 text-glow">
                            Registry <span className="text-indigo-400">Connection</span>
                        </h2>
                        
                        <p className="text-slate-400 font-medium mb-12 max-w-md mx-auto leading-relaxed">
                            Connection established with the central EduAI registry. 
                            The cloud environment requires table initialization to proceed.
                        </p>

                        <div className="grid grid-cols-1 gap-6">
                            <button 
                                onClick={handleAutoRepair} 
                                disabled={isRepairing} 
                                className="group relative w-full bg-white text-slate-950 font-black py-5 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <span className="relative flex items-center justify-center gap-3">
                                    {isRepairing ? (
                                        <>
                                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            Initializing Infrastructure...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Initialize Registry Link
                                        </>
                                    )}
                                </span>
                            </button>

                            <div className="flex items-center justify-center gap-8 py-4 opacity-50">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cloud Online</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Link</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Technical Footnote */}
                <div className="mt-8 text-center">
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                        System v.4.0 • Neural Integration Protocol Active
                    </p>
                </div>
            </div>
        </div>
    );
};
