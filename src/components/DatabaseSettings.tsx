import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseConfig } from '../types';
import {
    ShieldIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XIcon,
    InformationCircleIcon,
    LockClosedIcon,
    CommandLineIcon,
    SparklesIcon
} from './icons/index';
import { apiService, initSupabaseClient } from '../services/apiService';

interface DatabaseSettingsProps {
    dbConfig: DatabaseConfig;
    onSave: (config: DatabaseConfig) => void;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({ 
    dbConfig, 
    onSave,
    onGenerateDemoData,
    onClearDemoData,
    isGeneratingDemoData,
    demoDataGenerationProgress,
    demoDataGenerationMessage
}) => {
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

            {/* Demo Data Management for Super Admin */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                        <ArrowPathIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Institutional Demo Data</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Data Simulation & Reset Tools</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                    <button
                        onClick={async () => {
                            if (window.confirm('Initialize HIS Cluster: This will create all necessary clinical registry tables if they do not exist. Continue?')) {
                                setIsMigrating(true);
                                setMigrationMsg('Initializing clinical registry...');
                                try {
                                    const hisSql = `
-- HIS CLUSTER INITIALIZATION
CREATE TABLE IF NOT EXISTS his_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    specialty TEXT,
    status TEXT DEFAULT 'Available',
    contact TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_patients (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    dob DATE,
    gender TEXT,
    blood_group VARCHAR(10),
    allergies TEXT[],
    chronic_conditions TEXT[],
    surgical_history TEXT,
    sha_number VARCHAR(100),
    member_verification_status VARCHAR(50) DEFAULT 'Pending',
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    preferred_language VARCHAR(50),
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_wards (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ward_type VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    floor_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_beds (
    id TEXT PRIMARY KEY,
    ward_id TEXT REFERENCES his_wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Vacant',
    is_smart_bed BOOLEAN DEFAULT FALSE,
    current_patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_admissions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    bed_id TEXT REFERENCES his_beds(id) ON DELETE SET NULL,
    admitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discharge_date TIMESTAMP WITH TIME ZONE,
    reason_for_admission TEXT,
    admission_status VARCHAR(50) DEFAULT 'Active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    doctor_id TEXT REFERENCES his_staff(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    type TEXT,
    reason TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_staff_attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES his_staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_dental_charts (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    tooth_number INTEGER NOT NULL,
    procedure_code VARCHAR(50),
    condition_notes TEXT,
    image_url TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_eye_prescriptions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    visit_id TEXT,
    od_sphere DECIMAL(5,2),
    od_cylinder DECIMAL(5,2),
    od_axis INTEGER,
    od_add DECIMAL(5,2),
    od_acuity_visual VARCHAR(20),
    os_sphere DECIMAL(5,2),
    os_cylinder DECIMAL(5,2),
    os_axis INTEGER,
    os_add DECIMAL(5,2),
    os_acuity_visual VARCHAR(20),
    lens_type VARCHAR(100),
    frame_specifications TEXT,
    prescribed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_medication_logs (
    id TEXT PRIMARY KEY,
    admission_id TEXT REFERENCES his_admissions(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    route VARCHAR(100),
    frequency VARCHAR(100),
    administered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    administered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Administered',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS his_financial_records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    department TEXT,
    payment_method TEXT,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_broadcasts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    broadcast_type VARCHAR(50) DEFAULT 'Info',
    priority VARCHAR(20) DEFAULT 'Medium',
    is_active BOOLEAN DEFAULT TRUE,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE his_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_dental_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_eye_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_broadcasts ENABLE ROW LEVEL SECURITY;
                                    `;
                                    const result = await apiService.runMigration(hisSql);
                                    if (result.success) {
                                        alert("HIS Module Initialized Successfully.");
                                    } else {
                                        alert("Initialization Failed: " + result.message);
                                    }
                                } catch (err: any) {
                                    alert(`Gateway Error: ${err.message}`);
                                } finally {
                                    setIsMigrating(false);
                                    setMigrationMsg('');
                                }
                            }
                        }}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <LockClosedIcon className="w-4 h-4" /> Initialize HIS Registry
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm('CRITICAL ACTION: This will delete ALL HIS module data. This cannot be undone. Proceed?')) {
                                onClearDemoData?.();
                            }
                        }}
                        disabled={isGeneratingDemoData}
                        className="bg-white hover:bg-red-50 text-red-600 border border-red-100 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <XIcon className="w-4 h-4" /> Clear HIS Demo Data
                    </button>
                </div>

                {isGeneratingDemoData && (
                    <div className="mt-8 space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2">
                                <ArrowPathIcon className="w-3 h-3 animate-spin" /> {demoDataGenerationMessage || 'Processing Registry...'}
                            </span>
                            <span className="text-[10px] font-black text-slate-400">{demoDataGenerationProgress}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                style={{ width: `${demoDataGenerationProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};