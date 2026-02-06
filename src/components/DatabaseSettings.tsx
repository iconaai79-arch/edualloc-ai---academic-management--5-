
import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseConfig } from '../types.ts';
import { 
    ShieldIcon, 
    ArrowPathIcon, 
    CheckCircleIcon, 
    XIcon, 
    InformationCircleIcon,
    LockClosedIcon,
    CommandLineIcon,
    EyeIcon,
    ExclamationTriangleIcon
} from './icons/index.ts';
import { apiService, initSupabaseClient } from '../services/apiService.ts';

interface DatabaseSettingsProps {
    dbConfig: DatabaseConfig;
    onSave: (config: DatabaseConfig) => void;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({ dbConfig, onSave }) => {
    const [config, setConfig] = useState<DatabaseConfig>(dbConfig);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error' | 'setup_required'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [lastCheck, setLastCheck] = useState<string | null>(null);
    const [showEnvKey, setShowEnvKey] = useState(false);
    const [activeConfig, setActiveConfig] = useState(apiService.getActiveConfig());

    useEffect(() => {
        if (dbConfig) {
            setConfig(dbConfig);
        }
    }, [dbConfig]);

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            // FIXED: Signature now correctly accepts credentials as updated in apiService
            const result = await apiService.testDatabaseConnection(config.supabaseUrl, config.supabaseAnonKey);
            setLastCheck(result.timestamp);
            if (result.success) {
                setTestStatus(result.status === 'setup_required' ? 'setup_required' : 'success');
                setTestMessage(result.message);
                // FIXED: getActiveConfig now exists on apiService as updated in apiService
                setActiveConfig(apiService.getActiveConfig());
            } else {
                setTestStatus('error');
                setTestMessage(result.message);
            }
        } catch (err: any) {
            setTestStatus('error');
            setTestMessage(err.message || 'Network error while testing connection.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
        // Reset status on change to force re-validation
        if (testStatus !== 'idle') setTestStatus('idle');
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (testStatus !== 'success' && testStatus !== 'setup_required') {
            alert("Validation required: Please perform a successful 'Ping Registry' test before syncing to the cloud database.");
            return;
        }
        onSave(config);
    };

    const maskKey = (key?: string | null) => {
        if (!key) return "Not detected";
        return key.substring(0, 8) + "•".repeat(24) + key.substring(key.length - 8);
    };

    const isDirty = useMemo(() => {
        return config.supabaseUrl !== dbConfig.supabaseUrl || config.supabaseAnonKey !== dbConfig.supabaseAnonKey;
    }, [config, dbConfig]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Live Monitor Card */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                        <CommandLineIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Live Connection Monitor</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry parameters currently loaded in the application runtime.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                        <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 ml-1">Active Endpoint</label>
                        <p className="font-mono text-xs font-black text-indigo-600 truncate bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-indigo-50">
                            {activeConfig.url || "Uninitialized"}
                        </p>
                    </div>
                    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Active Auth Key</label>
                            <button 
                                onClick={() => setShowEnvKey(!showEnvKey)}
                                className="text-[9px] font-black uppercase text-indigo-500 hover:underline"
                            >
                                {showEnvKey ? 'Hide Secret' : 'View Key'}
                            </button>
                        </div>
                        <p className="font-mono text-[10px] font-black text-slate-600 dark:text-slate-300 break-all bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                            {showEnvKey ? activeConfig.key : maskKey(activeConfig.key)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Configurator Card */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none text-white">
                            <ShieldIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter">Registry Connector Control</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Database Interface Override</p>
                        </div>
                    </div>
                    {lastCheck && (
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-400">Heartbeat:</span>
                            <span className="text-[10px] font-mono text-indigo-600 font-black">{new Date(lastCheck).toLocaleTimeString()}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Database Engine</label>
                            <select 
                                name="dbType" 
                                value={config.dbType} 
                                onChange={handleChange}
                                className="form-select w-full h-14 font-bold"
                            >
                                <option value="postgresql">Supabase Cloud (PostgreSQL Optimized)</option>
                                <option value="mysql">Direct MySQL (Legacy Support)</option>
                                <option value="none">Offline Cache Fallback (Testing Mode)</option>
                            </select>
                        </div>

                        {config.dbType !== 'none' && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Registry Service URL</label>
                                    <input 
                                        type="url" 
                                        name="supabaseUrl"
                                        value={config.supabaseUrl || ''} 
                                        onChange={handleChange}
                                        placeholder="https://xyz.supabase.co"
                                        className="form-input w-full font-mono text-xs h-14"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1 flex items-center gap-2">
                                        Authorization Key
                                        <LockClosedIcon className="w-3 h-3" />
                                    </label>
                                    <input 
                                        type="password" 
                                        name="supabaseAnonKey"
                                        value={config.supabaseAnonKey || ''} 
                                        onChange={handleChange}
                                        placeholder="Enter full public anon key..."
                                        className="form-input w-full font-mono text-xs h-14"
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <button 
                                type="button"
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing' || config.dbType === 'none'}
                                className="h-12 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 shadow-xl"
                            >
                                {testStatus === 'testing' ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowPathIcon className="w-5 h-5" />}
                                Ping Registry
                            </button>

                            <div className="flex items-center gap-2">
                                {testStatus === 'success' && (
                                    <span className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest animate-fade-in">
                                        <CheckCircleIcon className="w-6 h-6" /> Cluster Online
                                    </span>
                                )}

                                {testStatus === 'setup_required' && (
                                    <span className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest animate-fade-in">
                                        <InformationCircleIcon className="w-6 h-6" /> Tables Missing
                                    </span>
                                )}

                                {testStatus === 'error' && (
                                    <span className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-widest animate-fade-in">
                                        <XIcon className="w-6 h-6" /> Auth Failure
                                    </span>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={testStatus !== 'success' && testStatus !== 'setup_required'}
                            className="h-14 px-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                        >
                            Sync to Cloud Registry
                        </button>
                    </div>
                </form>

                {testMessage && (
                    <div className={`mt-8 p-5 rounded-[1.5rem] flex items-start gap-4 border-2 transition-all animate-fade-in ${
                        testStatus === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 
                        testStatus === 'setup_required' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                        'bg-green-50 border-green-100 text-green-700'
                    }`}>
                        <div className="mt-0.5"><InformationCircleIcon className="w-6 h-6 shrink-0" /></div>
                        <p className="text-xs font-bold leading-relaxed">{testMessage}</p>
                    </div>
                )}
            </div>
            
            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex gap-6">
                <ShieldIcon className="w-8 h-8 text-slate-300 mt-1 shrink-0" />
                <div className="text-xs text-slate-500 leading-relaxed font-medium">
                    <p className="font-black uppercase text-[10px] tracking-widest mb-2 text-slate-600">Administrative Governance</p>
                    Changes to the Cloud Registry affect all tenant sessions immediately. Successfully validated parameters are cached in your local browser storage to maintain session continuity during deployment shifts.
                </div>
            </div>
        </div>
    );
};
