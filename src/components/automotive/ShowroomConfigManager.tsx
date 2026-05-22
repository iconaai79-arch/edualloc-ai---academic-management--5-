import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bell, MessageSquare, Sparkles, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Hash, Sliders } from 'lucide-react';
import { apiService } from '../../services/apiService';

interface ShowroomConfigManagerProps {
    institutionId: string;
}

export interface ShowroomSettings {
    id: string;
    institutionId: string;
    invoiceReminders?: {
        enabled: boolean;
        beforeDueDays: number;
        afterDueDays: number;
        template: string;
    };
    invoicePrefix?: string;
    invoiceStartingNumber?: number;
    invoiceFormat?: string;
    receiptPrefix?: string;
    receiptStartingNumber?: number;
    receiptFormat?: string;
    updatedAt: string;
}

export const ShowroomConfigManager: React.FC<ShowroomConfigManagerProps> = ({ institutionId }) => {
    const [settings, setSettings] = useState<ShowroomSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            setError(null);
            try {
                // Try fetching from supabase table showroom_settings
                const records = await apiService.fetchModuleRecords<any>('showroom_settings', institutionId);
                if (records && records.length > 0) {
                    const dbSettings = records[0];
                    const rawReminders = dbSettings.invoiceReminders || dbSettings.invoice_reminders;
                    setSettings({
                        id: dbSettings.id,
                        institutionId: dbSettings.institutionId || dbSettings.institution_id || institutionId,
                        invoiceReminders: rawReminders ? {
                            enabled: rawReminders.enabled ?? false,
                            beforeDueDays: rawReminders.beforeDueDays ?? rawReminders.before_due_days ?? 3,
                            afterDueDays: rawReminders.afterDueDays ?? rawReminders.after_due_days ?? 1,
                            template: rawReminders.template || 'Dear {client_name}, this is a reminder that your payment of KES {amount_due} for vehicle {registration_number} (invoice {invoice_number}) is due on {due_date}. Please clear it to avoid service disruption.'
                        } : {
                            enabled: false,
                            beforeDueDays: 3,
                            afterDueDays: 1,
                            template: 'Dear {client_name}, this is a reminder that your payment of KES {amount_due} for vehicle {registration_number} (invoice {invoice_number}) is due on {due_date}. Please clear it to avoid service disruption.'
                        },
                        invoicePrefix: dbSettings.invoice_prefix ?? dbSettings.invoicePrefix ?? 'INV-CAR-',
                        invoiceStartingNumber: dbSettings.invoice_starting_number ?? dbSettings.invoiceStartingNumber ?? 1001,
                        invoiceFormat: dbSettings.invoice_format ?? dbSettings.invoiceFormat ?? '{PREFIX}{NUMBER}',
                        receiptPrefix: dbSettings.receipt_prefix ?? dbSettings.receiptPrefix ?? 'REC-CAR-',
                        receiptStartingNumber: dbSettings.receipt_starting_number ?? dbSettings.receiptStartingNumber ?? 1001,
                        receiptFormat: dbSettings.receipt_format ?? dbSettings.receiptFormat ?? '{PREFIX}{NUMBER}',
                        updatedAt: dbSettings.updatedAt || dbSettings.updated_at || new Date().toISOString()
                    });
                } else {
                    initDefaults();
                }
            } catch (err: any) {
                console.warn("Failed to fetch showroom settings from DB, loading from localStorage or defaults:", err);
                const localStr = localStorage.getItem(`showroom_settings_${institutionId}`);
                if (localStr) {
                    try {
                        setSettings(JSON.parse(localStr));
                    } catch (e) {
                        initDefaults();
                    }
                } else {
                    initDefaults();
                }
            } finally {
                setLoading(false);
            }
        };

        const initDefaults = () => {
            setSettings({
                id: `showroom_cfg_${Date.now()}`,
                institutionId,
                invoiceReminders: {
                    enabled: false,
                    beforeDueDays: 3,
                    afterDueDays: 1,
                    template: 'Dear {client_name}, this is a reminder that your payment of KES {amount_due} for vehicle {registration_number} (invoice {invoice_number}) is due on {due_date}. Please clear it to avoid service disruption.'
                },
                invoicePrefix: 'INV-CAR-',
                invoiceStartingNumber: 1001,
                invoiceFormat: '{PREFIX}{NUMBER}',
                receiptPrefix: 'REC-CAR-',
                receiptStartingNumber: 1001,
                receiptFormat: '{PREFIX}{NUMBER}',
                updatedAt: new Date().toISOString()
            });
        };

        fetchSettings();
    }, [institutionId]);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setError(null);
        setShowSuccess(false);

        try {
            await apiService.saveModuleRecord('showroom_settings', {
                id: settings.id,
                institution_id: settings.institutionId,
                invoice_reminders: settings.invoiceReminders,
                invoice_prefix: settings.invoicePrefix || 'INV-CAR-',
                invoice_starting_number: settings.invoiceStartingNumber || 1001,
                invoice_format: settings.invoiceFormat || '{PREFIX}{NUMBER}',
                receipt_prefix: settings.receiptPrefix || 'REC-CAR-',
                receipt_starting_number: settings.receiptStartingNumber || 1001,
                receipt_format: settings.receiptFormat || '{PREFIX}{NUMBER}',
                updated_at: new Date().toISOString()
            });
            
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            console.warn("Failed to save to database showroom_settings table, saving to localStorage:", err);
            localStorage.setItem(`showroom_settings_${institutionId}`, JSON.stringify(settings));
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading configurations...</span>
            </div>
        );
    }

    if (!settings) return <div className="p-8 text-center text-rose-500">Failed to initialize settings.</div>;

    const previewPrefix = settings.invoicePrefix || 'INV-CAR-';
    const previewStartingNumber = settings.invoiceStartingNumber || 1001;
    const previewFormat = settings.invoiceFormat || '{PREFIX}{NUMBER}';
    const previewInvoiceCode = previewFormat
        .replace('{PREFIX}', previewPrefix)
        .replace('{NUMBER}', previewStartingNumber.toString());

    const previewReceiptPrefix = settings.receiptPrefix || 'REC-CAR-';
    const previewReceiptStartingNumber = settings.receiptStartingNumber || 1001;
    const previewReceiptFormat = settings.receiptFormat || '{PREFIX}{NUMBER}';
    const previewReceiptCode = previewReceiptFormat
        .replace('{PREFIX}', previewReceiptPrefix)
        .replace('{NUMBER}', previewReceiptStartingNumber.toString());


    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Showroom Billing Configuration</h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Automated Notifications & Reminders</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all duration-300 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 ${
                        showSuccess ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'shadow-indigo-100'
                    }`}
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                     showSuccess ? <CheckCircle2 className="w-4 h-4" /> :
                     <ShieldCheck className="w-4 h-4" />}
                    {saving ? 'Saving...' : showSuccess ? 'Settings Saved' : 'Save Configuration'}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Due Date Reminders</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">Enable Automated Reminders</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Dispatches notifications to clients before/after due date.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.invoiceReminders?.enabled || false}
                                    onChange={e => setSettings({
                                        ...settings,
                                        invoiceReminders: { ...settings.invoiceReminders!, enabled: e.target.checked }
                                    })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className={`space-y-6 transition-opacity duration-300 ${settings.invoiceReminders?.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Days Before Due Date</label>
                                    <input
                                        type="number"
                                        value={settings.invoiceReminders?.beforeDueDays || 3}
                                        onChange={e => setSettings({
                                            ...settings,
                                            invoiceReminders: { ...settings.invoiceReminders!, beforeDueDays: Math.max(0, parseInt(e.target.value) || 0) }
                                        })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Days After Due Date</label>
                                    <input
                                        type="number"
                                        value={settings.invoiceReminders?.afterDueDays || 1}
                                        onChange={e => setSettings({
                                            ...settings,
                                            invoiceReminders: { ...settings.invoiceReminders!, afterDueDays: Math.max(0, parseInt(e.target.value) || 0) }
                                        })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 transition-opacity duration-300 ${settings.invoiceReminders?.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Message Template</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notification Text</label>
                            <textarea
                                value={settings.invoiceReminders?.template || ''}
                                onChange={e => setSettings({
                                    ...settings,
                                    invoiceReminders: { ...settings.invoiceReminders!, template: e.target.value }
                                })}
                                className="w-full h-36 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 leading-relaxed"
                                placeholder="Write the reminder template message..."
                            />
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase space-y-1">
                            <span className="block text-slate-500 tracking-wider">Dynamic Placeholders:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-indigo-600">{"{client_name}"}</span>
                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-indigo-600">{"{invoice_number}"}</span>
                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-indigo-600">{"{due_date}"}</span>
                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-indigo-600">{"{amount_due}"}</span>
                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-indigo-600">{"{registration_number}"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <Sliders className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Invoice Sequence & Format</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Prefix</label>
                            <input
                                type="text"
                                value={settings.invoicePrefix || ''}
                                onChange={e => setSettings({
                                    ...settings,
                                    invoicePrefix: e.target.value
                                })}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g. INV-CAR-"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Starting Number</label>
                                <input
                                    type="number"
                                    value={settings.invoiceStartingNumber || 1001}
                                    onChange={e => setSettings({
                                        ...settings,
                                        invoiceStartingNumber: Math.max(1, parseInt(e.target.value) || 1)
                                    })}
                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Format Template</label>
                                <div className="relative">
                                    <select
                                        value={settings.invoiceFormat || '{PREFIX}{NUMBER}'}
                                        onChange={e => setSettings({ ...settings, invoiceFormat: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none outline-none pr-10"
                                    >
                                        <option value="{PREFIX}{NUMBER}">Prefix and Number (INV-CAR-1001)</option>
                                        <option value="{PREFIX}-{NUMBER}">Prefix-Number (INV-CAR--1001)</option>
                                        <option value="{PREFIX}/{NUMBER}">Prefix/Number (INV-CAR-/1001)</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <Hash className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Next Invoice Number Preview</h3>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Invoice Code</span>
                        <div className="font-mono text-2xl font-black tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-6 py-4 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/60 w-full text-center select-all">
                            {previewInvoiceCode}
                        </div>
                        <p className="text-[10px] text-slate-400 text-center font-bold uppercase leading-relaxed max-w-[280px]">
                            The sequence increments automatically for each new vehicle invoice under this institution.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <Sliders className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Receipt Sequence & Format</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Receipt Prefix</label>
                            <input
                                type="text"
                                value={settings.receiptPrefix || ''}
                                onChange={e => setSettings({
                                    ...settings,
                                    receiptPrefix: e.target.value
                                })}
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g. REC-CAR-"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Starting Number</label>
                                <input
                                    type="number"
                                    value={settings.receiptStartingNumber || 1001}
                                    onChange={e => setSettings({
                                        ...settings,
                                        receiptStartingNumber: Math.max(1, parseInt(e.target.value) || 1)
                                    })}
                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Format Template</label>
                                <div className="relative">
                                    <select
                                        value={settings.receiptFormat || '{PREFIX}{NUMBER}'}
                                        onChange={e => setSettings({ ...settings, receiptFormat: e.target.value })}
                                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none outline-none pr-10"
                                    >
                                        <option value="{PREFIX}{NUMBER}">Prefix and Number (REC-CAR-1001)</option>
                                        <option value="{PREFIX}-{NUMBER}">Prefix-Number (REC-CAR--1001)</option>
                                        <option value="{PREFIX}/{NUMBER}">Prefix/Number (REC-CAR-/1001)</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <Hash className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">Next Receipt Number Preview</h3>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Receipt Code</span>
                        <div className="font-mono text-2xl font-black tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-6 py-4 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/60 w-full text-center select-all">
                            {previewReceiptCode}
                        </div>
                        <p className="text-[10px] text-slate-400 text-center font-bold uppercase leading-relaxed max-w-[280px]">
                            The sequence increments automatically for each new vehicle payment receipt under this institution.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
