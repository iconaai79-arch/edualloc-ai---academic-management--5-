import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseConfig } from '../types';
import { ShieldIcon } from './icons/ShieldIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XIcon } from './icons/XIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { apiService, initSupabaseClient } from '../services/apiService';

interface DatabaseSettingsProps {
    dbConfig: DatabaseConfig;
    onSave: (config: DatabaseConfig) => void;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
    onRunAlumniMigration?: () => Promise<void>;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({ 
    dbConfig, 
    onSave,
    onGenerateDemoData,
    onClearDemoData,
    isGeneratingDemoData,
    demoDataGenerationProgress,
    demoDataGenerationMessage,
    onRunAlumniMigration
}) => {
    const [config, setConfig] = useState<DatabaseConfig>(dbConfig);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error' | 'setup_required'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [lastCheck, setLastCheck] = useState<string | null>(null);
    const [showEnvKey, setShowEnvKey] = useState(false);
    const [activeConfig, setActiveConfig] = useState(apiService.getActiveConfig());
    const [isMigrating, setIsMigrating] = useState(false);
    const [isRepairing, setIsRepairing] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
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

    const handleDebugSession = async () => {
        setDebugInfo(null);
        try {
            const result = await apiService.debugRLSSession();
            if (result.success) {
                // Formatting for the pre block
                const data = result.data ? JSON.stringify(result.data, null, 2) : result.message || "Operation completed successfully.";
                setDebugInfo(data);
            } else {
                const errorDetail = result.error || result.message || "Unknown error";
                const envStatus = result.env ? `\n\nEnvironment Diagnostics:\n${JSON.stringify(result.env, null, 2)}` : '';
                setDebugInfo(`Error: ${errorDetail}${envStatus}`);
            }
        } catch (err: any) {
            setDebugInfo(`Network error: ${err.message}`);
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
-- HIS Module Initialization with Ultra-Robust RLS
CREATE TABLE IF NOT EXISTS his_staff (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    user_id TEXT REFERENCES public.users(id),
    full_name TEXT NOT NULL,
    designation TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    specialization TEXT,
    license_number TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_patients (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_history JSONB,
    allergies JSONB,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_wards (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT, -- General, ICU, Pediatric, etc.
    capacity INTEGER,
    floor TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_beds (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    ward_id TEXT REFERENCES his_wards(id),
    bed_number TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_admissions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id),
    ward_id TEXT REFERENCES his_wards(id),
    bed_id TEXT REFERENCES his_beds(id),
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discharge_date TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    doctor_id TEXT REFERENCES his_staff(id),
    status TEXT DEFAULT 'Admitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_appointments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id),
    doctor_id TEXT REFERENCES his_staff(id),
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_staff_attendance (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    staff_id TEXT REFERENCES his_staff(id),
    check_in TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT, -- Present, Late, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_dental_charts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id),
    tooth_number INTEGER,
    condition TEXT,
    procedure TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_eye_prescriptions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id),
    od_sphere TEXT,
    od_cylinder TEXT,
    od_axis TEXT,
    os_sphere TEXT,
    os_cylinder TEXT,
    os_axis TEXT,
    add_power TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_medication_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id),
    medication_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    prescribed_by TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_financial_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id),
    type TEXT, -- Bill, Payment
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_broadcasts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT, -- All, Doctors, Staff
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

-- DEFINITIVE ULTRA-ROBUST RLS POLICIES
-- Combines LOWER() email check, direct role bypass, and explicit text casting
DO $$ 
BEGIN
    -- Staff
    DROP POLICY IF EXISTS "HIS staff access" ON his_staff;
    CREATE POLICY "HIS staff access" ON his_staff FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Patients
    DROP POLICY IF EXISTS "HIS patients access" ON his_patients;
    CREATE POLICY "HIS patients access" ON his_patients FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Wards
    DROP POLICY IF EXISTS "HIS wards access" ON his_wards;
    CREATE POLICY "HIS wards access" ON his_wards FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Beds
    DROP POLICY IF EXISTS "HIS beds access" ON his_beds;
    CREATE POLICY "HIS beds access" ON his_beds FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Admissions
    DROP POLICY IF EXISTS "HIS admissions access" ON his_admissions;
    CREATE POLICY "HIS admissions access" ON his_admissions FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Appointments
    DROP POLICY IF EXISTS "HIS appointments access" ON his_appointments;
    CREATE POLICY "HIS appointments access" ON his_appointments FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Attendance
    DROP POLICY IF EXISTS "HIS staff attendance access" ON his_staff_attendance;
    CREATE POLICY "HIS staff attendance access" ON his_staff_attendance FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Dental charts
    DROP POLICY IF EXISTS "HIS dental charts access" ON his_dental_charts;
    CREATE POLICY "HIS dental charts access" ON his_dental_charts FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Eye prescriptions
    DROP POLICY IF EXISTS "HIS eye prescriptions access" ON his_eye_prescriptions;
    CREATE POLICY "HIS eye prescriptions access" ON his_eye_prescriptions FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Medication logs
    DROP POLICY IF EXISTS "HIS medication logs access" ON his_medication_logs;
    CREATE POLICY "HIS medication logs access" ON his_medication_logs FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Financial records
    DROP POLICY IF EXISTS "HIS financial records access" ON his_financial_records;
    CREATE POLICY "HIS financial records access" ON his_financial_records FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

    -- Broadcasts
    DROP POLICY IF EXISTS "HIS broadcasts access" ON his_broadcasts;
    CREATE POLICY "HIS broadcasts access" ON his_broadcasts FOR ALL 
    USING (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
    WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);
END $$;

-- Explicitly Grant Permissions
GRANT ALL ON public.his_staff TO anon, authenticated, service_role;
GRANT ALL ON public.his_patients TO anon, authenticated, service_role;
GRANT ALL ON public.his_wards TO anon, authenticated, service_role;
GRANT ALL ON public.his_beds TO anon, authenticated, service_role;
GRANT ALL ON public.his_admissions TO anon, authenticated, service_role;
GRANT ALL ON public.his_appointments TO anon, authenticated, service_role;
GRANT ALL ON public.his_staff_attendance TO anon, authenticated, service_role;
GRANT ALL ON public.his_dental_charts TO anon, authenticated, service_role;
GRANT ALL ON public.his_eye_prescriptions TO anon, authenticated, service_role;
GRANT ALL ON public.his_medication_logs TO anon, authenticated, service_role;
GRANT ALL ON public.his_financial_records TO anon, authenticated, service_role;
GRANT ALL ON public.his_broadcasts TO anon, authenticated, service_role;
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

            {/* System Repair & Maintenance */}
            <div className="bg-white dark:bg-slate-900/50 rounded-[32px] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center border border-amber-100 dark:border-amber-800/50">
                        <ShieldIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">System Maintenance & Repair</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fix schema regressions and stabilize multi-tenancy</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={async () => {
                            if (window.confirm('This will fix the Tasks table schema, events custom subdomain column, and ensure database structures are correct. Proceed?')) {
                                setIsMigrating(true);
                                setMigrationMsg('Repairing schemas...');
                                try {
                                    const repairSql = `
-- Fix tasks table schema
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN institution_id UUID;
        UPDATE tasks t SET institution_id = (SELECT u.institution_id FROM users u WHERE u.id = t.user_id LIMIT 1) WHERE institution_id IS NULL;
    END IF;
END $$;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User personal tasks" ON tasks;
DROP POLICY IF EXISTS "Institutional tasks access" ON tasks;

CREATE POLICY "User personal tasks" ON tasks FOR ALL USING (auth.uid()::text = user_id::text OR 'u_' || auth.uid()::text = user_id::text OR auth.jwt() ->> 'email' = 'super@app.com') WITH CHECK (auth.uid()::text = user_id::text OR 'u_' || auth.uid()::text = user_id::text OR auth.jwt() ->> 'email' = 'super@app.com');
CREATE POLICY "Institutional tasks access" ON tasks FOR SELECT USING (institution_id::text = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'super_admin', 'head_teacher'));
GRANT ALL ON public.tasks TO anon, authenticated, service_role;

-- Ensure custom_subdomain column exists on events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_subdomain TEXT;
`;
                                    const result = await apiService.runMigration(repairSql);
                                    if (result.success) {
                                        alert("System schema repair completed successfully.");
                                    } else {
                                        alert("Repair failed: " + result.message);
                                    }
                                } catch (err: any) {
                                    alert(`Repair error: ${err.message}`);
                                } finally {
                                    setIsMigrating(false);
                                    setMigrationMsg('');
                                }
                            }
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <ShieldIcon className="w-4 h-4" /> Repair System Schema
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm('Initialize County Management: This will create the counties table and migration columns. Continue?')) {
                                setIsMigrating(true);
                                setMigrationMsg('Initializing county registry...');
                                try {
                                    const countySql = `
-- County Management Initialization
CREATE TABLE IF NOT EXISTS counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    admin_name TEXT,
    admin_id UUID REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location JSONB
);

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS county_id TEXT REFERENCES counties(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS county_id TEXT REFERENCES counties(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- Super Admin Policy
DROP POLICY IF EXISTS "SuperAdminFullAccessCounties" ON counties;
CREATE POLICY "SuperAdminFullAccessCounties" ON counties FOR ALL 
USING (public.get_curr_user_role() = 'super_admin' OR auth.jwt() ->> 'email' = 'super@app.com')
WITH CHECK (public.get_curr_user_role() = 'super_admin' OR auth.jwt() ->> 'email' = 'super@app.com');

-- Public View for discovery
DROP POLICY IF EXISTS "PublicViewCounties" ON counties;
CREATE POLICY "PublicViewCounties" ON counties FOR SELECT USING (true);

-- Permissions
GRANT ALL ON public.counties TO anon, authenticated, service_role;
                                    `;
                                    const result = await apiService.runMigration(countySql);
                                    if (result.success) {
                                        alert("County Management Registry Initialized.");
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
                    >
                        <SparklesIcon className="w-4 h-4" /> Initialize County Registry
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm('Initialize Car Marketplace Schema: This will add inspection report and score columns to the listings table. Continue?')) {
                                setIsMigrating(true);
                                setMigrationMsg('Repairing marketplace schema...');
                                try {
                                    const carSql = `
-- Car Marketplace Schema Repair
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS inspection_report_url TEXT;
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS inspection_score INTEGER DEFAULT 95;
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS import_status TEXT;
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS import_expenses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS fob_price DECIMAL(15, 2);
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS total_landed_cost DECIMAL(15, 2);
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS target_margin DECIMAL(5, 2);
ALTER TABLE car_sales_listings ADD COLUMN IF NOT EXISTS floor_price DECIMAL(15, 2);
`;
                                    const result = await apiService.runMigration(carSql);
                                    if (result.success) {
                                        alert("Car Marketplace schema updated successfully.");
                                    } else {
                                        alert("Repair Failed: " + result.message);
                                    }
                                } catch (err: any) {
                                    alert(`Gateway Error: ${err.message}`);
                                } finally {
                                    setIsMigrating(false);
                                    setMigrationMsg('');
                                }
                            }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
                    >
                        <SparklesIcon className="w-4 h-4" /> Repair Car Marketplace Schema
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm('Sync Full Platform Schema: This will execute the full platform SQL script to ensure all tables (Driving School, Car Showroom, etc.) and RLS policies are up to date. Continue?')) {
                                setIsMigrating(true);
                                setMigrationMsg('Generating full schema script...');
                                try {
                                    // Dynamically import to avoid any potential circular dependency if it exists,
                                    // although it's already imported in SuperAdminView.
                                    const { generateFullSqlScript } = await import('../utils/sqlGenerator');
                                    const fullSql = generateFullSqlScript();
                                    setMigrationMsg('Executing synchronization...');
                                    const result = await apiService.runMigration(fullSql);
                                    if (result.success) {
                                        alert("Platform Schema Synchronized Successfully.");
                                    } else {
                                        alert("Synchronization Failed: " + result.message);
                                    }
                                } catch (err: any) {
                                    alert(`Sync Error: ${err.message}`);
                                } finally {
                                    setIsMigrating(false);
                                    setMigrationMsg('');
                                }
                            }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
                    >
                        <ArrowPathIcon className="w-4 h-4" /> Sync Full Platform Schema
                    </button>

                    {onRunAlumniMigration && (
                        <button
                            onClick={async () => {
                                if (window.confirm('This will update the Alumnae social infrastructure (posts, comments, messages). Continue?')) {
                                    setIsMigrating(true);
                                    setMigrationMsg('Migrating alumni schema...');
                                    try {
                                        await onRunAlumniMigration();
                                    } catch (err: any) {
                                        alert(`Migration error: ${err.message}`);
                                    } finally {
                                        setIsMigrating(false);
                                        setMigrationMsg('');
                                    }
                                }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <SparklesIcon className="w-4 h-4" /> Run Alumni Schema Migration
                        </button>
                    )}
                </div>
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mt-6">
                    <h3 className="text-xl font-bold text-white mb-4">Diagnostic Tools</h3>
                    <p className="text-gray-400 mb-6">Use these tools to troubleshoot database and RLS issues.</p>
                    
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleDebugSession}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="material-icons text-sm">terminal</span>
                            Debug RLS Session
                        </button>
                    </div>

                    {debugInfo && (
                        <div className="mt-4 p-4 bg-black/50 rounded-lg border border-gray-600 font-mono text-xs text-green-400 overflow-auto max-h-60">
                            <div className="flex justify-between items-center mb-2">
                                <span>Session Debug Info:</span>
                                <button onClick={() => setDebugInfo(null)} className="text-gray-400 hover:text-white">✕</button>
                            </div>
                            <pre>{debugInfo}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
