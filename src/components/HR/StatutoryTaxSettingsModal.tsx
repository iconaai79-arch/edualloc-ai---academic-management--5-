import React, { useState } from 'react';
import type { Institution } from '../../types';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { XIcon } from '../icons/XIcon';
import { Cog8ToothIcon } from '../icons/Cog8ToothIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

export interface StatutoryPayrollSettings {
    nssf: {
        mode: 'formula' | 'percentage' | 'fixed';
        percentageRate: number; // e.g. 6.0
        fixedAmount: number; // e.g. 2043 or 1080
        employerMatching: boolean;
    };
    housingLevy: {
        mode: 'percentage' | 'fixed';
        percentageRate: number; // e.g. 1.5
        fixedAmount: number; // e.g. 540
        employerMatching: boolean;
    };
    shif: {
        mode: 'percentage' | 'fixed';
        percentageRate: number; // e.g. 2.75
        fixedAmount: number; // e.g. 459
        minimumAmount: number; // e.g. 300
    };
    paye: {
        enabled: boolean;
        personalRelief: number; // e.g. 2400
    };
}

export const DEFAULT_STATUTORY_SETTINGS: StatutoryPayrollSettings = {
    nssf: {
        mode: 'formula',
        percentageRate: 6.0,
        fixedAmount: 2043,
        employerMatching: true
    },
    housingLevy: {
        mode: 'percentage',
        percentageRate: 1.5,
        fixedAmount: 540,
        employerMatching: true
    },
    shif: {
        mode: 'percentage',
        percentageRate: 2.75,
        fixedAmount: 459,
        minimumAmount: 300
    },
    paye: {
        enabled: true,
        personalRelief: 2400
    }
};

interface StatutoryTaxSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    settings: StatutoryPayrollSettings;
    onSaveSettings: (newSettings: StatutoryPayrollSettings) => void;
}

export const StatutoryTaxSettingsModal: React.FC<StatutoryTaxSettingsModalProps> = ({
    isOpen,
    onClose,
    institution,
    settings,
    onSaveSettings
}) => {
    const [localSettings, setLocalSettings] = useState<StatutoryPayrollSettings>(() => {
        return settings || DEFAULT_STATUTORY_SETTINGS;
    });

    const [activeTab, setActiveTab] = useState<'nssf' | 'housingLevy' | 'shif' | 'paye'>('nssf');
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    // Sync on open
    React.useEffect(() => {
        if (isOpen && settings) {
            setLocalSettings(settings);
            setSavedSuccess(false);
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleSave = () => {
        setIsSaving(true);
        onSaveSettings(localSettings);
        setSavedSuccess(true);
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 600);
    };

    const handleResetDefaults = () => {
        if (confirm('Reset all statutory payroll settings to 2026 Kenyan legal standards?')) {
            setLocalSettings(DEFAULT_STATUTORY_SETTINGS);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Cog8ToothIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                    Statutory & Tax Configuration
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    Percentage vs Fixed Figures
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                Customize NSSF, Housing Levy (AHL), SHIF, and PAYE calculation modes per institution standards
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Reset Defaults
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 px-6 sm:px-8 gap-2 pt-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('nssf')}
                        className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-t-2xl border-b-2 transition-all flex items-center gap-2 ${activeTab === 'nssf' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <ShieldCheckIcon className="w-4 h-4" />
                        <span>NSSF Pension</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            {localSettings.nssf.mode.toUpperCase()}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('housingLevy')}
                        className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-t-2xl border-b-2 transition-all flex items-center gap-2 ${activeTab === 'housingLevy' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Housing Levy (AHL)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            {localSettings.housingLevy.mode === 'percentage' ? `${localSettings.housingLevy.percentageRate}%` : 'FIXED'}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('shif')}
                        className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-t-2xl border-b-2 transition-all flex items-center gap-2 ${activeTab === 'shif' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <ShieldCheckIcon className="w-4 h-4" />
                        <span>SHIF Medical</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            {localSettings.shif.mode.toUpperCase()}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('paye')}
                        className={`px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-t-2xl border-b-2 transition-all flex items-center gap-2 ${activeTab === 'paye' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Cog8ToothIcon className="w-4 h-4" />
                        <span>PAYE & Relief</span>
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

                    {/* 1. NSSF SETTINGS */}
                    {activeTab === 'nssf' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    NSSF Calculation Method
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Choose whether the system calculates NSSF via statutory tier formula, custom flat percentage, or keyed-in fixed figures.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Mode: Formula */}
                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, nssf: { ...prev.nssf, mode: 'formula' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.nssf.mode === 'formula' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-lg uppercase">
                                                Statutory Standard
                                            </span>
                                            {localSettings.nssf.mode === 'formula' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Tier I & Tier II Formula
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            6% on Tier I (up to KES 9,000) + 6% on Tier II (up to KES 108,000 limit).
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                        Max: KES 2,160 / Tier
                                    </div>
                                </div>

                                {/* Mode: Percentage */}
                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, nssf: { ...prev.nssf, mode: 'percentage' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.nssf.mode === 'percentage' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-black rounded-lg uppercase">
                                                Custom Rate
                                            </span>
                                            {localSettings.nssf.mode === 'percentage' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Flat Percentage (%)
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Direct flat percentage deducted from total gross salary.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Percentage Rate</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={localSettings.nssf.percentageRate}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    nssf: { ...prev.nssf, percentageRate: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-black text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mode: Fixed Amount */}
                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, nssf: { ...prev.nssf, mode: 'fixed' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.nssf.mode === 'fixed' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-lg uppercase">
                                                Manual Keying
                                            </span>
                                            {localSettings.nssf.mode === 'fixed' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Fixed Figure (KES)
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Set a direct fixed deduction amount or key in manual amounts per employee.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Default Fixed Figure</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs font-black text-slate-500">KES</span>
                                            <input
                                                type="number"
                                                value={localSettings.nssf.fixedAmount}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    nssf: { ...prev.nssf, fixedAmount: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Employer Matching Toggle */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                                        Employer NSSF Matching Contribution
                                    </h5>
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                        Include 100% employer matching contribution on the payslip and institutional cost summary.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.nssf.employerMatching}
                                        onChange={(e) => setLocalSettings(prev => ({
                                            ...prev,
                                            nssf: { ...prev.nssf, employerMatching: e.target.checked }
                                        }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* 2. HOUSING LEVY (AHL) SETTINGS */}
                    {activeTab === 'housingLevy' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Affordable Housing Levy (AHL) Calculation Method
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Configure whether Housing Levy is computed as a percentage of gross earnings (default 1.5%) or entered as direct fixed figures.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Mode: Percentage */}
                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, housingLevy: { ...prev.housingLevy, mode: 'percentage' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.housingLevy.mode === 'percentage' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-lg uppercase">
                                                Statutory Percentage
                                            </span>
                                            {localSettings.housingLevy.mode === 'percentage' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Percentage (%) of Gross
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Automatically calculates 1.5% (or your custom percentage) of employee total gross earnings.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Levy Rate (%)</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={localSettings.housingLevy.percentageRate}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    housingLevy: { ...prev.housingLevy, percentageRate: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-black text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mode: Fixed Amount */}
                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, housingLevy: { ...prev.housingLevy, mode: 'fixed' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.housingLevy.mode === 'fixed' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-lg uppercase">
                                                Manual Keying
                                            </span>
                                            {localSettings.housingLevy.mode === 'fixed' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Fixed Figure (KES)
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Directly key in flat housing levy deduction amounts (e.g. KES 540 or imported register amounts).
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Default Fixed Figure</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs font-black text-slate-500">KES</span>
                                            <input
                                                type="number"
                                                value={localSettings.housingLevy.fixedAmount}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    housingLevy: { ...prev.housingLevy, fixedAmount: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Employer Matching Toggle */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                                        Employer Matching Housing Levy (1.5%)
                                    </h5>
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                        Include 1.5% employer matching contribution on the payslip and institutional cost summary.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.housingLevy.employerMatching}
                                        onChange={(e) => setLocalSettings(prev => ({
                                            ...prev,
                                            housingLevy: { ...prev.housingLevy, employerMatching: e.target.checked }
                                        }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* 3. SHIF SETTINGS */}
                    {activeTab === 'shif' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    SHIF (Social Health Insurance Fund) Method
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Standard 2.75% of gross earnings (minimum KES 300) or manual fixed amount.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, shif: { ...prev.shif, mode: 'percentage' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.shif.mode === 'percentage' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-lg uppercase">
                                                Statutory (2.75%)
                                            </span>
                                            {localSettings.shif.mode === 'percentage' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Percentage with Floor (2.75%)
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            2.75% of total gross salary with statutory minimum floor of KES 300.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Rate (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={localSettings.shif.percentageRate}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    shif: { ...prev.shif, percentageRate: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Min Floor (KES)</label>
                                            <input
                                                type="number"
                                                value={localSettings.shif.minimumAmount}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    shif: { ...prev.shif, minimumAmount: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setLocalSettings(prev => ({ ...prev, shif: { ...prev.shif, mode: 'fixed' } }))}
                                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${localSettings.shif.mode === 'fixed' ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-slate-300'}`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded-lg uppercase">
                                                Manual Keying
                                            </span>
                                            {localSettings.shif.mode === 'fixed' && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
                                        </div>
                                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-2">
                                            Fixed Figure (KES)
                                        </h5>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Set a flat SHIF deduction or key in custom amounts.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                        <label className="text-[10px] font-black uppercase text-slate-400">Default Fixed Figure</label>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-xs font-black text-slate-500">KES</span>
                                            <input
                                                type="number"
                                                value={localSettings.shif.fixedAmount}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    shif: { ...prev.shif, fixedAmount: parseFloat(e.target.value) || 0 }
                                                }))}
                                                className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. PAYE SETTINGS */}
                    {activeTab === 'paye' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    PAYE (Income Tax) & Personal Relief
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Configure graduated tax bands (10% to 35%) and statutory monthly personal relief.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">
                                            Enable Graduated PAYE Tax
                                        </h5>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={localSettings.paye.enabled}
                                                onChange={(e) => setLocalSettings(prev => ({
                                                    ...prev,
                                                    paye: { ...prev.paye, enabled: e.target.checked }
                                                }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                        Applies 5-tier Kenya Revenue Authority tax bands on taxable earnings after allowable deductions.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Monthly Personal Relief (KES)</label>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-black text-slate-500">KES</span>
                                        <input
                                            type="number"
                                            value={localSettings.paye.personalRelief}
                                            onChange={(e) => setLocalSettings(prev => ({
                                                ...prev,
                                                paye: { ...prev.paye, personalRelief: parseFloat(e.target.value) || 0 }
                                            }))}
                                            className="w-full bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">Standard: KES 2,400 per month (KES 28,800/yr)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 sm:px-8 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        {savedSuccess && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 animate-fade-in font-black">
                                <CheckCircleIcon className="w-4 h-4" />
                                Settings Applied Successfully!
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>{isSaving ? 'Saving...' : 'Save & Apply Settings'}</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
