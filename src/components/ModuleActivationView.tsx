import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ShieldIcon as ShieldCheckIcon } from './icons/ShieldIcon';
import { ZapIcon } from './icons/ZapIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';


interface ModuleActivationViewProps {
    moduleId: string;
    moduleName: string;
    description: string;
    onActivateTrial: () => void;
    isLoading?: boolean;
    status?: 'inactive' | 'expired';
}

export const ModuleActivationView: React.FC<ModuleActivationViewProps> = ({ 
    moduleId, 
    moduleName, 
    description, 
    onActivateTrial, 
    isLoading,
    status = 'inactive'
}) => {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>

            <div className="relative z-10 max-w-2xl text-center space-y-8">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl transform -rotate-6">
                        <ZapIcon className="w-10 h-10 text-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Unlock <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">{moduleName}</span>
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <SparklesIcon className="w-6 h-6 text-indigo-500 mb-2" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Full Features</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Get access to all premium tools in this module.</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <ShieldCheckIcon className="w-6 h-6 text-emerald-500 mb-2" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Safe & Secure</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enterprise-grade data protection and backups.</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <ZapIcon className="w-6 h-6 text-amber-500 mb-2" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Instant Setup</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start working in seconds with zero configuration.</p>
                    </div>
                </div>

                <div className="pt-4">
                    {status === 'inactive' ? (
                        <button
                            onClick={onActivateTrial}
                            disabled={isLoading}
                            className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Activating...' : 'Start 14-Day Free Trial'}
                            <ArrowRightIcon className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-black uppercase tracking-widest border border-red-200 dark:border-red-800">
                                Trial Expired
                            </div>
                            <button
                                onClick={onActivateTrial}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                            >
                                {isLoading ? 'Extending Subscription...' : 'Upgrade to Premium'}
                            </button>
                        </div>
                    )}
                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest">
                        {status === 'inactive' ? "No credit card required to start trial." : "Keep all your data by upgrading today."}
                    </p>
                </div>
            </div>
        </div>
    );
};

