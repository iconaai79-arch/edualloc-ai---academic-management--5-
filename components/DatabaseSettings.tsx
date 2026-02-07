import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseConfig } from '../types.ts';
import {
    ShieldIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XIcon,
    InformationCircleIcon,
    LockClosedIcon,
    CommandLineIcon
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
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationMsg, setMigrationMsg] = useState('');

    useEffect(() => { if (dbConfig) setConfig(dbConfig); }, [dbConfig]);

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            const result = await apiService.testDatabaseConnection(config.supabaseUrl, config.supabaseAnonKey);
            setLastCheck(result.timestamp);
            if (result.success) {
                setTestStatus(result.status === 'setup_required' ? 'setup_required' : 'success');
                setTestMessage(result.message);
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

    const handleMigrateData = async () => {
        if (!window.confirm("This will push all locally stored data (institutions, users, etc.) to your Supabase cloud instance. Existing records with same IDs will be overwritten. Proceed?")) return;

        setIsMigrating(true);
        setMigrationMsg('Initializing migration...');
        try {
            const result = await apiService.migrateLocalDataToCloud((msg) => setMigrationMsg(msg));
            alert(result.message);
            if (result.success) {
                // Force a reload or notify App to reload data
                window.location.reload();
            }
        } catch (err: any) {
            alert(`Migration failed: ${err.message}`);
        } finally {
            setIsMigrating(false);
            setMigrationMsg('');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig((prev: DatabaseConfig) => ({ ...prev, [name]: value }));
        if (testStatus !== 'idle') setTestStatus('idle');
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (testStatus !== 'success' && testStatus !== 'setup_required') {
            alert("Validation required: Please perform a successful 'Ping Registry' test before syncing.");
            return;
        }
        initSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
        onSave(config);
    };

    const maskKey = (key?: string | null) => {
        if (!key) return "Not detected";
        return key.substring(0, 8) + "•".repeat(24) + key.substring(key.length - 8);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
                            <CommandLineIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Live Monitor</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry parameters currently loaded in the application runtime.</p>
                        </div>
                    </div>
                    {testStatus === 'success' && (
                        <button
                            onClick={handleMigrateData}
                            disabled={isMigrating}
                            className="h-10 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isMigrating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ShieldIcon className="w-4 h-4" />}
                            {isMigrating ? `Migrating: ${migrationMsg}` : 'Migrate Local Data to Cloud'}
                        </button>
                    )}
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
                            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Auth Key</label>
                            <button onClick={() => setShowEnvKey(!showEnvKey)} className="text-[9px] font-black uppercase text-indigo-500 hover:underline">{showEnvKey ? 'Hide' : 'View'}</button>
                        </div>
                        <p className="font-mono text-[10px] font-black text-slate-600 dark:text-slate-300 break-all bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                            {showEnvKey ? activeConfig.key : maskKey(activeConfig.key)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Registry URL</label><input type="url" name="supabaseUrl" value={config.supabaseUrl || ''} onChange={handleChange} placeholder="https://xyz.supabase.co" className="form-input font-mono text-xs h-14" required /></div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1 flex items-center gap-2">Auth Key <LockClosedIcon className="w-3 h-3" /></label><input type="password" name="supabaseAnonKey" value={config.supabaseAnonKey || ''} onChange={handleChange} placeholder="Enter anon key..." className="form-input font-mono text-xs h-14" required /></div>
                    </div>
                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={handleTestConnection} disabled={testStatus === 'testing'} className="h-12 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 shadow-xl">
                                {testStatus === 'testing' ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ArrowPathIcon className="w-5 h-5" />} Ping
                            </button>
                            {testStatus === 'success' && <span className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest animate-fade-in"><CheckCircleIcon className="w-6 h-6" /> Cluster Online</span>}
                            {testStatus === 'setup_required' && <span className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-widest animate-fade-in"><InformationCircleIcon className="w-6 h-6" /> Setup Needed</span>}
                        </div>
                        <button type="submit" disabled={testStatus !== 'success' && testStatus !== 'setup_required'} className="h-14 px-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50">Sync to Registry</button>
                    </div>
                </form>
                {testMessage && <div className={`mt-8 p-5 rounded-[1.5rem] flex items-start gap-4 border-2 animate-fade-in ${testStatus === 'error' ? 'bg-red-50 border-red-100 text-red-700' : testStatus === 'setup_required' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-green-50 border-green-100 text-green-700'}`}><InformationCircleIcon className="w-6 h-6 shrink-0" /><p className="text-xs font-bold leading-relaxed">{testMessage}</p></div>}
            </div>
        </div>
    );
};