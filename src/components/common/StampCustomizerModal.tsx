import React, { useState } from 'react';
import {
    Stamp, Check, Upload, RotateCcw, X, Palette, Calendar,
    Building2, Phone, MapPin, Briefcase, Eye, Sparkles, Sliders, Circle, Ellipsis
} from 'lucide-react';
import type { Institution, LetterheadConfig, OfficialStampConfig, StampMode } from '../../types';
import { KenyanOfficialStamp } from './KenyanOfficialStamp';
import { formatStampDate, getResolvedStampConfig } from '../../utils/stampGenerator';

interface StampCustomizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentInstitution: Institution | null;
    letterheadConfig?: LetterheadConfig | null;
    onSaveConfig: (updatedConfig: LetterheadConfig) => Promise<void> | void;
}

const INK_PRESETS = [
    { name: 'Royal Blue (Classic)', value: '#0047AB', bg: 'bg-[#0047AB]' },
    { name: 'Deep Navy', value: '#1E3A8A', bg: 'bg-[#1E3A8A]' },
    { name: 'Violet Purple', value: '#4C1D95', bg: 'bg-[#4C1D95]' },
    { name: 'Forest Green', value: '#14532D', bg: 'bg-[#14532D]' },
    { name: 'Crimson Red', value: '#991B1B', bg: 'bg-[#991B1B]' },
];

const DATER_PRESETS = [
    { name: 'Red Dater (Standard)', value: '#DC2626', bg: 'bg-[#DC2626]' },
    { name: 'Blue Dater', value: '#0047AB', bg: 'bg-[#0047AB]' },
    { name: 'Matching Ink', value: 'inherit', bg: 'bg-slate-700' },
];

const DATE_FORMATS: { label: string; value: 'DD MMM YYYY' | 'DD/MM/YYYY' | 'DD-MM-YYYY'; example: string }[] = [
    { label: 'Word Month', value: 'DD MMM YYYY', example: '21 MAY 2025' },
    { label: 'Slash Digits', value: 'DD/MM/YYYY', example: '21/05/2025' },
    { label: 'Dash Digits', value: 'DD-MM-YYYY', example: '21-05-2025' },
];

const DEPARTMENT_PRESETS = [
    'FINANCE & BURSAR',
    'ACCOUNTS DEPARTMENT',
    'OFFICIAL RECEIPT',
    'CASHIER & REVENUE',
    'TRANSPORT & LOGISTICS',
    'OFFICE OF THE PRINCIPAL',
    'ADMISSIONS & REGISTRAR'
];

const POSTAL_ADDRESS_PRESETS = [
    'P.O. BOX 2306-30100 ELDORET',
    'P.O. BOX 1341-00100 NAIROBI',
    'P.O. BOX 90120-80100 MOMBASA',
    'P.O. BOX 40100 KISUMU',
    'P.O. BOX 20100 NAKURU',
    'P.O. BOX 60100 EMBU',
    'P.O. BOX 10100 NYERI',
    'P.O. BOX 50100 KAKAMEGA',
    'P.O. BOX 30200 KITALE'
];

export const StampCustomizerModal: React.FC<StampCustomizerModalProps> = ({
    isOpen,
    onClose,
    currentInstitution,
    letterheadConfig,
    onSaveConfig
}) => {
    if (!isOpen) return null;

    const existingStampConfig = letterheadConfig?.stampConfig;
    const initialResolved = getResolvedStampConfig(existingStampConfig, currentInstitution);

    const [mode, setMode] = useState<StampMode>(existingStampConfig?.mode || (letterheadConfig?.stampImageUrl ? 'uploaded' : 'system_generated'));
    const [shape, setShape] = useState<'circle' | 'oval'>(existingStampConfig?.shape === 'oval' ? 'oval' : 'circle');
    const [institutionName, setInstitutionName] = useState(initialResolved.institutionName.replace(/★/g, '').trim());
    const [addressLine, setAddressLine] = useState(initialResolved.addressLine.replace(/★/g, '').trim());
    const [contactPhone, setContactPhone] = useState(initialResolved.contactPhone);
    const [department, setDepartment] = useState(initialResolved.department);
    const [customDatePrefix, setCustomDatePrefix] = useState(initialResolved.customDatePrefix || '');
    const [dateFormat, setDateFormat] = useState<'DD MMM YYYY' | 'DD/MM/YYYY' | 'DD-MM-YYYY'>(initialResolved.dateFormat || 'DD MMM YYYY');
    const [showSignatureLine, setShowSignatureLine] = useState(initialResolved.showSignatureLine ?? true);
    const [signatureLabel, setSignatureLabel] = useState(initialResolved.signatureLabel || 'Sign:...................');
    const [showStars, setShowStars] = useState(initialResolved.showStars ?? true);
    const [inkColor, setInkColor] = useState(initialResolved.inkColor || '#0047AB');
    const [daterColor, setDaterColor] = useState(initialResolved.daterColor || '#DC2626');
    const [rotationAngle, setRotationAngle] = useState(initialResolved.rotationAngle ?? -3);
    const [showDate, setShowDate] = useState(initialResolved.showDate ?? true);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(letterheadConfig?.stampImageUrl || existingStampConfig?.stampImageUrl || null);

    // Live test date for preview
    const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    const liveConfig: OfficialStampConfig = {
        mode,
        shape,
        stampImageUrl: uploadedImageUrl,
        inkColor,
        daterColor: daterColor === 'inherit' ? inkColor : daterColor,
        institutionName: institutionName.replace(/★/g, '').trim(),
        addressLine: addressLine.replace(/★/g, '').trim(),
        contactPhone,
        department,
        customDatePrefix,
        dateFormat,
        showSignatureLine,
        signatureLabel,
        showStars,
        showDate,
        rotationAngle
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setUploadedImageUrl(reader.result);
                setMode('uploaded');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedLetterhead: LetterheadConfig = {
                headerImageUrl: letterheadConfig?.headerImageUrl || null,
                stampImageUrl: uploadedImageUrl,
                footerImageUrl: letterheadConfig?.footerImageUrl || null,
                footerText: letterheadConfig?.footerText || '',
                showStamp: mode !== 'none',
                stampConfig: liveConfig
            };

            await onSaveConfig(updatedLetterhead);
            onClose();
        } catch (err: any) {
            alert('Failed to save stamp configuration: ' + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                            <Stamp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-tight">Official Rubber Stamp Customizer</h3>
                            <p className="text-[11px] font-medium text-slate-400">Configure dynamic institutional dater stamp (Circle vs Oval) for receipts, finance & vouchers</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Controls (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* 1. Mode Selector */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                                Stamp Generation Mode
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'system_generated', label: 'Dynamic Stamp', desc: 'Automatic Date', icon: Sparkles },
                                    { id: 'uploaded', label: 'Upload Image', desc: 'Custom Scanned', icon: Upload },
                                    { id: 'none', label: 'No Stamp', desc: 'Signature Only', icon: X },
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setMode(m.id as StampMode)}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                            mode === m.id
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <m.icon className={`w-4 h-4 ${mode === m.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            {mode === m.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-xs font-black uppercase tracking-tight">{m.label}</p>
                                            <p className="text-[9px] text-slate-400 font-medium">{m.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Shape Template Switcher (Circle vs Oval) */}
                        {mode === 'system_generated' && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 flex items-center justify-between">
                                    <span>Stamp Shape Template</span>
                                    <span className="text-[9px] font-bold text-indigo-600 uppercase">Circle vs Oval</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShape('circle')}
                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                            shape === 'circle'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold">
                                            ⭕
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase">Circular Stamp</p>
                                            <p className="text-[9px] text-slate-400">Classic round institutional seal</p>
                                        </div>
                                        {shape === 'circle' && <Check className="w-4 h-4 ml-auto text-indigo-600" />}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShape('oval')}
                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                            shape === 'oval'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="w-9 h-6 rounded-[50%] border-2 border-current flex items-center justify-center font-bold">
                                            ⬭
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase">Oval Stamp</p>
                                            <p className="text-[9px] text-slate-400">Elliptical official finance stamp</p>
                                        </div>
                                        {shape === 'oval' && <Check className="w-4 h-4 ml-auto text-indigo-600" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mode Specific Options */}
                        {mode === 'uploaded' && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    Upload Transparent Stamp Image (PNG Recommended)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                />
                                {uploadedImageUrl && (
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5" /> Stamp image uploaded
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setUploadedImageUrl(null)}
                                            className="text-rose-500 hover:underline font-bold text-[10px] uppercase cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'system_generated' && (
                            <div className="space-y-4">
                                {/* Ink Color Presets */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5" /> Stamp Ink Color
                                    </label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {INK_PRESETS.map(preset => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setInkColor(preset.value)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border transition-all cursor-pointer ${
                                                    inkColor === preset.value
                                                        ? 'border-slate-900 dark:border-white ring-2 ring-indigo-400 bg-white dark:bg-slate-800'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                                                }`}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded-full ${preset.bg}`}></span>
                                                <span className="text-slate-700 dark:text-slate-200">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dater Color Presets */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Dynamic Transaction Dater Ink
                                    </label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {DATER_PRESETS.map(preset => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setDaterColor(preset.value)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 border transition-all cursor-pointer ${
                                                    daterColor === preset.value
                                                        ? 'border-slate-900 dark:border-white ring-2 ring-indigo-400 bg-white dark:bg-slate-800'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                                                }`}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded-full ${preset.bg}`}></span>
                                                <span className="text-slate-700 dark:text-slate-200">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Format & Prefix */}
                                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                            Date Format
                                        </label>
                                        <select
                                            value={dateFormat}
                                            onChange={e => setDateFormat(e.target.value as any)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        >
                                            {DATE_FORMATS.map(f => (
                                                <option key={f.value} value={f.value}>
                                                    {f.label} ({f.example})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                            Date Prefix (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={customDatePrefix}
                                            onChange={e => setCustomDatePrefix(e.target.value)}
                                            placeholder="e.g. Date or leave empty"
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Text Fields */}
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Top Curved Text (Institution Name)
                                            </label>
                                            <label className="text-[9px] font-bold text-slate-400 flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={showStars}
                                                    onChange={e => setShowStars(e.target.checked)}
                                                    className="rounded text-indigo-600 w-3 h-3"
                                                />
                                                <span>2 Middle Stars (★)</span>
                                            </label>
                                        </div>
                                        <input
                                            type="text"
                                            value={institutionName}
                                            onChange={e => setInstitutionName(e.target.value.toUpperCase())}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Bottom Curved Text (Postal Address)
                                                </label>
                                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                                                    {addressLine.length} chars
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={addressLine}
                                                onChange={e => setAddressLine(e.target.value.toUpperCase())}
                                                placeholder="e.g. P.O. BOX 2306-30100 ELDORET"
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                            {/* Quick Postal Address Suggestions & Fill from School Profile */}
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {currentInstitution?.address && currentInstitution.address.toUpperCase() !== addressLine && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddressLine(currentInstitution.address!.toUpperCase())}
                                                        className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                                    >
                                                        Use Profile Address
                                                    </button>
                                                )}
                                                <select
                                                    onChange={e => e.target.value && setAddressLine(e.target.value)}
                                                    value=""
                                                    className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                                                >
                                                    <option value="">Presets (e.g. Eldoret, Nairobi...)</option>
                                                    {POSTAL_ADDRESS_PRESETS.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Inner Top Line (Phone / Tel)
                                                </label>
                                                <span className="text-[9px] font-bold text-slate-400">Optional</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={contactPhone}
                                                onChange={e => setContactPhone(e.target.value.toUpperCase())}
                                                placeholder="TEL: 0723348912"
                                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Signature Line vs Department */}
                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Bottom Center: Signature Line vs Department
                                            </label>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={showSignatureLine}
                                                    onChange={e => setShowSignatureLine(e.target.checked)}
                                                    className="rounded text-indigo-600 w-3.5 h-3.5"
                                                />
                                                <span>Signature Line</span>
                                            </label>
                                        </div>

                                        {showSignatureLine ? (
                                            <input
                                                type="text"
                                                value={signatureLabel}
                                                onChange={e => setSignatureLabel(e.target.value)}
                                                placeholder="Sign:..................."
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                                            />
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={department}
                                                    onChange={e => setDepartment(e.target.value.toUpperCase())}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase outline-none"
                                                />
                                                <select
                                                    onChange={e => e.target.value && setDepartment(e.target.value)}
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                                                >
                                                    <option value="">Presets...</option>
                                                    {DEPARTMENT_PRESETS.map(p => (
                                                        <option key={p} value={p}>{p}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Live Interactive Stamp Preview Canvas (5 cols) */}
                    <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between items-center space-y-6">
                        <div className="w-full flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-indigo-500" /> Live Receipt Preview
                            </span>
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                                {shape === 'oval' ? 'Oval Template' : 'Circle Template'}
                            </span>
                        </div>

                        {/* Stamp Preview Stage */}
                        <div className="w-full flex-1 flex items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-800 min-h-[220px]">
                            {mode === 'none' ? (
                                <div className="text-center space-y-2">
                                    <X className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Stamp Disabled</p>
                                    <p className="text-[10px] text-slate-400">Receipts will print signature line only</p>
                                </div>
                            ) : (
                                <KenyanOfficialStamp
                                    config={liveConfig}
                                    date={testDate}
                                    size={shape === 'oval' ? 170 : 200}
                                />
                            )}
                        </div>

                        {/* Interactive Test Date Control */}
                        {mode !== 'none' && (
                            <div className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Test Transaction Date
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setTestDate(new Date().toISOString().split('T')[0])}
                                        className="text-[9px] font-bold text-indigo-600 hover:underline uppercase cursor-pointer"
                                    >
                                        Today
                                    </button>
                                </div>
                                <input
                                    type="date"
                                    value={testDate}
                                    onChange={e => setTestDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                                />
                                <p className="text-[9px] text-slate-400 leading-tight">
                                    ⚡ In production, this date automatically updates per transaction from the student fee / transport receipt timestamp.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 dark:bg-slate-900 px-8 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <RotateCcw className="w-4 h-4 animate-spin" />
                                <span>Saving Branding...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Save & Apply Stamp</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
