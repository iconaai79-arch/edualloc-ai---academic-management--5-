
import React, { useState, useEffect } from 'react';
import type { PMSettings, Institution } from '../types';
import { apiService } from '../services/apiService';
import { 
    GridIcon, 
    BellIcon, 
    CheckCircleIcon, 
    ArrowPathIcon,
    SparklesIcon,
    PhoneIcon,
    PencilIcon,
    MapPinIcon,
    UploadIcon,
    XIcon
} from './icons/index';

interface PMConfigManagerProps {
    institutionId: string;
    onDataChange?: () => void;
}

const PMConfigManager: React.FC<PMConfigManagerProps> = ({ institutionId, onDataChange }) => {
    const [settings, setSettings] = useState<PMSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, [institutionId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const records = await apiService.fetchModuleRecords<PMSettings>('pm_settings', institutionId);
            if (records && records.length > 0) {
                setSettings(records[0]);
            } else {
                // Initialize default settings
                setSettings({
                    id: `pm_cfg_${Date.now()}`,
                    institutionId,
                    branding: {
                        companyName: '',
                        primaryColor: '#4f46e5',
                        footerText: ''
                    },
                    rentReminders: {
                        enabled: false,
                        beforeDueDays: 3,
                        afterDueDays: 1,
                        template: 'Dear Tenant, your rent for {month} is due on {due_date}. Please clear it to avoid penalties.'
                    },
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("Failed to fetch PM settings:", err);
            setError("Failed to load settings. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setError(null);
        try {
            await apiService.saveModuleRecord('pm_settings', {
                ...settings,
                updatedAt: new Date().toISOString()
            });
            onDataChange?.();
            alert("Settings saved successfully!");
        } catch (err) {
            console.error("Failed to save PM settings:", err);
            setError("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };
 
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !settings) return;
 
        setUploadingLogo(true);
        setError(null);
        try {
            const fileName = `logos/pm_${institutionId}_${Date.now()}.${file.name.split('.').pop()}`;
            const publicUrl = await apiService.uploadFile('eduai', fileName, file, file.type);
            if (publicUrl) {
                setSettings({
                    ...settings,
                    branding: { ...settings.branding!, logoUrl: publicUrl }
                });
            }
        } catch (err) {
            console.error("Logo upload failed:", err);
            setError("Failed to upload logo. Please check your connection.");
        } finally {
            setUploadingLogo(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading configurations...</div>;
    if (!settings) return <div className="p-8 text-center text-red-500">Failed to initialize settings.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                        <GridIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Property Management Configuration</h2>
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider text-[10px]">Manage branding and automated reminder settings</p>
                    </div>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                >
                    {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branding Section */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <SparklesIcon className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-bold">Branding Configuration</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Display Name</label>
                            <input 
                                type="text" 
                                value={settings.branding?.companyName || ''} 
                                onChange={e => setSettings({...settings, branding: {...settings.branding, companyName: e.target.value}})}
                                className="form-input w-full"
                                placeholder="e.g. Acme Properties Ltd"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Primary Brand Color</label>
                            <div className="flex gap-2">
                                <input 
                                    type="color" 
                                    value={settings.branding?.primaryColor || '#4f46e5'} 
                                    onChange={e => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})}
                                    className="h-10 w-10 p-0 border-none rounded cursor-pointer"
                                />
                                <input 
                                    type="text" 
                                    value={settings.branding?.primaryColor || ''} 
                                    disabled
                                    className="form-input flex-grow bg-slate-50 capitalize"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Logo</label>
                            <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                {settings.branding?.logoUrl ? (
                                    <div className="relative group">
                                        <img 
                                            src={settings.branding.logoUrl} 
                                            alt="Logo Preview" 
                                            className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-slate-200"
                                        />
                                        <button 
                                            onClick={() => setSettings({...settings, branding: {...settings.branding!, logoUrl: ''}})}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <UploadIcon className="w-8 h-8 opacity-50" />
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <input 
                                        type="file" 
                                        id="logo-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                    />
                                    <label 
                                        htmlFor="logo-upload" 
                                        className="btn-secondary py-2 px-4 cursor-pointer inline-flex items-center gap-2 text-sm"
                                    >
                                        {uploadingLogo ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                                        {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                                    </label>
                                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-tight">Recommended: PNG or SVG, max 2MB</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                                <MapPinIcon className="w-3 h-3" /> Statement Footer Text
                            </label>
                            <textarea 
                                value={settings.branding?.footerText || ''} 
                                onChange={e => setSettings({...settings, branding: {...settings.branding, footerText: e.target.value}})}
                                className="form-input w-full h-20"
                                placeholder="e.g. Thank you for choosing Acme Properties. For inquiries, call +254 700 000 000."
                            />
                        </div>
                    </div>
                </div>

                {/* Reminders Section */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <BellIcon className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-bold">Rent Due Reminders</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div>
                                <h4 className="font-medium">Enable Automated SMS/Email</h4>
                                <p className="text-xs text-slate-500">Automatically notify tenants when rent is due.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.rentReminders?.enabled || false} 
                                    onChange={e => setSettings({...settings, rentReminders: {...settings.rentReminders!, enabled: e.target.checked}})}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[var(--color-primary)]"></div>
                            </label>
                        </div>

                        <div className={`space-y-4 transition-opacity duration-300 ${settings.rentReminders?.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Days Before Due</label>
                                    <input 
                                        type="number" 
                                        value={settings.rentReminders?.beforeDueDays || 3} 
                                        onChange={e => setSettings({...settings, rentReminders: {...settings.rentReminders!, beforeDueDays: parseInt(e.target.value)}})}
                                        className="form-input w-full"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Days After Due</label>
                                    <input 
                                        type="number" 
                                        value={settings.rentReminders?.afterDueDays || 1} 
                                        onChange={e => setSettings({...settings, rentReminders: {...settings.rentReminders!, afterDueDays: parseInt(e.target.value)}})}
                                        className="form-input w-full"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1">
                                    <PencilIcon className="w-3 h-3" /> Message Template
                                </label>
                                <textarea 
                                    value={settings.rentReminders?.template || ''} 
                                    onChange={e => setSettings({...settings, rentReminders: {...settings.rentReminders!, template: e.target.value}})}
                                    className="form-input w-full h-32"
                                    placeholder="Use {month} and {due_date} as placeholders."
                                />
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <PhoneIcon className="w-3 h-3" /> Placeholders: {"{tenant}"}, {"{month}"}, {"{due_date}"}, {"{amount}"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PMConfigManager;

