import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { apiService } from '../../services/apiService';
import {
    UploadIcon as Upload,
    DownloadIcon as Download,
    CheckCircleIcon as CheckCircle,
    XCircleIcon as XCircle,
    ExclamationTriangleIcon as AlertTriangle,
    ArrowPathIcon as Refresh,
    XIcon as CloseIcon,
    TruckIcon as Truck,
    MapPinIcon as MapPin
} from '../icons';

export interface Courier {
    id: string;
    name: string;
    companyName?: string;
    company_name?: string;
    courierName?: string;
    courier_name?: string;
    phone?: string;
    email?: string;
    status: 'Pending' | 'Active' | 'Rejected' | string;
    created_at?: string;
    createdAt?: string;
}

export interface DeliveryRate {
    id: string;
    courier_id?: string;
    courierId?: string;
    courier_name?: string;
    courierName?: string;
    destination: string;
    rate: number;
    estimated_days?: number;
    estimatedDays?: number;
    status: 'Active' | 'Inactive';
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    institutionId: string;
    couriers: Courier[];
    existingRates: DeliveryRate[];
    onImportComplete: () => void;
}

interface ParsedRateRow {
    rawRowIndex: number;
    destination: string;
    courierNameRaw: string;
    resolvedCourierId: string;
    resolvedCourierName: string;
    isNewCourier: boolean;
    rate: number;
    estimatedDays: number;
    status: 'Active' | 'Inactive';
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export function RetailRatesExcelImportModal({
    isOpen,
    onClose,
    institutionId,
    couriers,
    existingRates,
    onImportComplete
}: Props) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string>('');
    const [parsedRows, setParsedRows] = useState<ParsedRateRow[]>([]);
    const [defaultCourierId, setDefaultCourierId] = useState<string>(() => {
        const firstActive = couriers.find(c => String(c.status || '').toLowerCase() === 'active');
        return firstActive?.id || couriers[0]?.id || '';
    });
    const [autoCreateCouriers, setAutoCreateCouriers] = useState<boolean>(true);
    const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
    const [importProgress, setImportProgress] = useState<number>(0);
    const [importStatusText, setImportStatusText] = useState<string>('');
    const [importedCount, setImportedCount] = useState<number>(0);
    const [createdCouriersCount, setCreatedCouriersCount] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const getCourierDisplayName = (c: any): string => {
        if (!c) return '';
        return c.name || c.companyName || c.company_name || c.courierName || c.courier_name || c.fullName || c.full_name || 'Courier Partner';
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const normalizeHeader = (header: string): string => {
        return String(header || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    };

    const processFile = async (file: File) => {
        setErrorMessage('');
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('The uploaded Excel workbook contains no sheets.');
                }

                // Use the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (!rows || rows.length < 2) {
                    throw new Error('The spreadsheet appears to be empty or missing data rows.');
                }

                // Detect header row (scan first 6 rows)
                let headerRowIndex = 0;
                let colIndices = {
                    destination: -1,
                    courier: -1,
                    rate: -1,
                    days: -1,
                    status: -1
                };

                for (let r = 0; r < Math.min(rows.length, 6); r++) {
                    const row = rows[r].map(cell => normalizeHeader(String(cell)));
                    const destIdx = row.findIndex(h => h.includes('dest') || h.includes('zone') || h.includes('location') || h.includes('town') || h.includes('city') || h.includes('area') || h.includes('county'));
                    const rateIdx = row.findIndex(h => h.includes('rate') || h.includes('fee') || h.includes('cost') || h.includes('price') || h.includes('amount') || h.includes('kes'));

                    if (destIdx !== -1 || rateIdx !== -1) {
                        headerRowIndex = r;
                        colIndices.destination = destIdx;
                        colIndices.rate = rateIdx;
                        colIndices.courier = row.findIndex(h => h.includes('courier') || h.includes('partner') || h.includes('company') || h.includes('provider') || h.includes('rider') || h.includes('transporter'));
                        colIndices.days = row.findIndex(h => h.includes('day') || h.includes('time') || h.includes('duration') || h.includes('lead') || h.includes('est'));
                        colIndices.status = row.findIndex(h => h.includes('status') || h.includes('state') || h.includes('active'));
                        break;
                    }
                }

                if (colIndices.destination === -1 && colIndices.rate === -1) {
                    // Fallback to assuming columns: 0=Courier, 1=Destination, 2=Rate, 3=Days, 4=Status
                    colIndices = {
                        courier: 0,
                        destination: 1,
                        rate: 2,
                        days: 3,
                        status: 4
                    };
                    headerRowIndex = 0;
                }

                const fallbackCourier = couriers.find(c => c.id === defaultCourierId) || couriers[0];
                const fallbackCourierName = fallbackCourier ? getCourierDisplayName(fallbackCourier) : 'Courier Partner';

                const parsed: ParsedRateRow[] = [];

                for (let i = headerRowIndex + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.every((c: any) => String(c).trim() === '')) {
                        continue; // Skip blank rows
                    }

                    const rawDest = colIndices.destination !== -1 ? String(row[colIndices.destination] || '').trim() : '';
                    const rawCourier = colIndices.courier !== -1 ? String(row[colIndices.courier] || '').trim() : '';
                    const rawRate = colIndices.rate !== -1 ? row[colIndices.rate] : '';
                    const rawDays = colIndices.days !== -1 ? row[colIndices.days] : '';
                    const rawStatus = colIndices.status !== -1 ? String(row[colIndices.status] || '').trim() : '';

                    const errors: string[] = [];
                    const warnings: string[] = [];

                    if (!rawDest) {
                        errors.push('Missing Destination / Zone');
                    }

                    let parsedRate = 0;
                    if (rawRate !== '' && rawRate !== null && rawRate !== undefined) {
                        const cleanRate = String(rawRate).replace(/[^0-9.-]/g, '');
                        const num = parseFloat(cleanRate);
                        if (isNaN(num)) {
                            warnings.push('Invalid fee format; set to 0 KES');
                            parsedRate = 0;
                        } else if (num < 0) {
                            warnings.push('Negative fee; set to 0 KES');
                            parsedRate = 0;
                        } else {
                            parsedRate = num;
                        }
                    } else {
                        warnings.push('No fee specified; set to 0 KES');
                    }

                    let parsedDays = 1;
                    if (rawDays !== '' && rawDays !== null && rawDays !== undefined) {
                        const cleanDays = String(rawDays).replace(/[^0-9]/g, '');
                        const num = parseInt(cleanDays, 10);
                        if (!isNaN(num) && num > 0) {
                            parsedDays = num;
                        }
                    }

                    const parsedStatus: 'Active' | 'Inactive' = String(rawStatus).toLowerCase().includes('inact') ? 'Inactive' : 'Active';

                    // Courier Resolution
                    let matchedCourier = couriers.find(c => {
                        if (!rawCourier) return false;
                        const cName = getCourierDisplayName(c).toLowerCase();
                        const query = rawCourier.toLowerCase();
                        return c.id === rawCourier || cName === query;
                    });

                    let resolvedId = '';
                    let resolvedName = '';
                    let isNew = false;

                    if (matchedCourier) {
                        resolvedId = matchedCourier.id;
                        resolvedName = getCourierDisplayName(matchedCourier);
                    } else if (rawCourier && rawCourier.toLowerCase() !== 'unknown') {
                        // Specified a courier that is not currently registered
                        isNew = true;
                        resolvedId = `new_${encodeURIComponent(rawCourier.toLowerCase())}`;
                        resolvedName = rawCourier;
                    } else {
                        // Fallback to default selected courier
                        resolvedId = fallbackCourier?.id || 'default_courier';
                        resolvedName = fallbackCourierName;
                    }

                    parsed.push({
                        rawRowIndex: i + 1,
                        destination: rawDest,
                        courierNameRaw: rawCourier,
                        resolvedCourierId: resolvedId,
                        resolvedCourierName: resolvedName,
                        isNewCourier: isNew,
                        rate: parsedRate,
                        estimatedDays: parsedDays,
                        status: parsedStatus,
                        isValid: errors.length === 0,
                        errors,
                        warnings
                    });
                }

                if (parsed.length === 0) {
                    throw new Error('No valid delivery rate rows could be extracted from this file.');
                }

                setParsedRows(parsed);
                setStep('preview');
            } catch (err: any) {
                console.error('[Retail Rates Excel Importer] Parsing error:', err);
                setErrorMessage(err.message || 'Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.');
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const downloadSampleTemplate = () => {
        const sampleCourier = couriers[0] ? getCourierDisplayName(couriers[0]) : 'Standard Delivery';
        const secondCourier = couriers[1] ? getCourierDisplayName(couriers[1]) : 'Express Courier';

        const templateData = [
            ['Courier Partner', 'Destination / Zone', 'Rate (KES)', 'Estimated Days', 'Status'],
            [sampleCourier, 'Nairobi Central / CBD', 250, 1, 'Active'],
            [sampleCourier, 'Westlands / Parklands', 300, 1, 'Active'],
            [sampleCourier, 'Thika / Kiambu', 350, 1, 'Active'],
            [secondCourier, 'Mombasa Island', 500, 2, 'Active'],
            [secondCourier, 'Kisumu Central', 450, 2, 'Active'],
            [secondCourier, 'Nakuru Town', 400, 1, 'Active'],
            [secondCourier, 'Eldoret Town', 450, 2, 'Active']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);

        // Styling column widths
        ws['!cols'] = [
            { wch: 24 }, // Courier Partner
            { wch: 28 }, // Destination / Zone
            { wch: 14 }, // Rate (KES)
            { wch: 16 }, // Estimated Days
            { wch: 12 }  // Status
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Delivery Rates');
        XLSX.writeFile(wb, 'Retail_Delivery_Rates_Template.xlsx');
    };

    const downloadCurrentRatesExport = () => {
        if (!existingRates || existingRates.length === 0) {
            alert('No existing delivery rates to export.');
            return;
        }

        const rows = [
            ['Destination / Zone', 'Courier Partner', 'Rate (KES)', 'Estimated Days', 'Status'],
            ...existingRates.map(r => {
                const matched = couriers.find(c => c.id === (r.courier_id || r.courierId));
                const cName = r.courier_name || r.courierName || (matched ? getCourierDisplayName(matched) : 'General Partner');
                return [
                    r.destination || '',
                    cName,
                    Number(r.rate ?? 0),
                    Number(r.estimated_days ?? r.estimatedDays ?? 1),
                    r.status || 'Active'
                ];
            })
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Current Rate Card');
        XLSX.writeFile(wb, `Retail_Delivery_Rates_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const executeImport = async () => {
        const validRows = parsedRows.filter(r => r.isValid);
        if (validRows.length === 0) {
            alert('There are no valid delivery rate rows to import.');
            return;
        }

        setStep('importing');
        setImportProgress(5);
        setImportStatusText('Preparing courier partners...');

        try {
            // 1. Identify distinct new couriers that need to be auto-created
            const newCourierNames = Array.from(new Set(
                validRows
                    .filter(r => r.isNewCourier && autoCreateCouriers)
                    .map(r => r.resolvedCourierName.trim())
            ));

            const courierMap: Record<string, { id: string; name: string }> = {};

            // Populate existing couriers in map
            couriers.forEach(c => {
                const name = getCourierDisplayName(c).toLowerCase();
                courierMap[name] = { id: c.id, name: getCourierDisplayName(c) };
                courierMap[c.id] = { id: c.id, name: getCourierDisplayName(c) };
            });

            let newlyCreatedCount = 0;

            if (autoCreateCouriers && newCourierNames.length > 0) {
                setImportStatusText(`Auto-registering ${newCourierNames.length} courier partner(s)...`);
                for (let i = 0; i < newCourierNames.length; i++) {
                    const cName = newCourierNames[i];
                    const newId = crypto.randomUUID();
                    await apiService.saveModuleRecord('retail_couriers', {
                        id: newId,
                        institution_id: institutionId,
                        institutionId,
                        name: cName,
                        company_name: cName,
                        companyName: cName,
                        courier_name: cName,
                        courierName: cName,
                        status: 'Active',
                        created_at: new Date().toISOString()
                    });
                    courierMap[cName.toLowerCase()] = { id: newId, name: cName };
                    newlyCreatedCount++;
                    setImportProgress(Math.round(5 + ((i + 1) / newCourierNames.length) * 20));
                }
            }

            setCreatedCouriersCount(newlyCreatedCount);
            setImportProgress(25);
            setImportStatusText('Importing delivery rates into rate card...');

            // Fallback courier ID
            const fallbackCourier = couriers.find(c => c.id === defaultCourierId) || couriers[0];
            const fallbackId = fallbackCourier?.id || 'default_courier';
            const fallbackName = fallbackCourier ? getCourierDisplayName(fallbackCourier) : 'Courier Partner';

            // 2. Insert or Update delivery rates
            let savedCount = 0;
            const total = validRows.length;

            for (let i = 0; i < total; i++) {
                const row = validRows[i];

                let finalCourierId = row.resolvedCourierId;
                let finalCourierName = row.resolvedCourierName;

                if (row.isNewCourier) {
                    const matchedNew = courierMap[row.resolvedCourierName.toLowerCase()];
                    if (matchedNew) {
                        finalCourierId = matchedNew.id;
                        finalCourierName = matchedNew.name;
                    } else {
                        finalCourierId = fallbackId;
                        finalCourierName = fallbackName;
                    }
                }

                // Check for existing rate to update or overwrite if enabled
                let rateId: string = crypto.randomUUID();
                if (overwriteExisting) {
                    const existing = existingRates.find(r => 
                        (r.destination || '').trim().toLowerCase() === row.destination.toLowerCase() &&
                        (r.courier_id === finalCourierId || (r as any).courierId === finalCourierId)
                    );
                    if (existing) {
                        rateId = existing.id;
                    }
                }

                await apiService.saveModuleRecord('retail_delivery_rates', {
                    id: rateId,
                    institution_id: institutionId,
                    institutionId,
                    courier_id: finalCourierId,
                    courierId: finalCourierId,
                    courier_name: finalCourierName,
                    courierName: finalCourierName,
                    destination: row.destination,
                    rate: row.rate,
                    estimated_days: row.estimatedDays,
                    estimatedDays: row.estimatedDays,
                    status: row.status,
                    updated_at: new Date().toISOString()
                });

                savedCount++;
                const pct = Math.round(25 + ((i + 1) / total) * 75);
                setImportProgress(pct);
                setImportStatusText(`Saved rate ${i + 1} of ${total}: ${row.destination}`);
            }

            setImportedCount(savedCount);
            setStep('success');
            onImportComplete();
        } catch (error: any) {
            console.error('[Retail Rates Excel Importer] Execution error:', error);
            setErrorMessage(error.message || 'An error occurred while saving the rates.');
            setStep('preview');
        }
    };

    const validCount = parsedRows.filter(r => r.isValid).length;
    const invalidCount = parsedRows.filter(r => !r.isValid).length;
    const newCouriersFound = Array.from(new Set(parsedRows.filter(r => r.isNewCourier).map(r => r.resolvedCourierName)));

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 transition-all overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                            <Upload className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                Import Delivery Rates from Excel
                            </h3>
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400">
                                Bulk upload courier zones, destination tariffs, and fulfillment lead times
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={step === 'importing'}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors disabled:opacity-40"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">

                    {errorMessage && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Import Notice</p>
                                <p className="text-xs opacity-90">{errorMessage}</p>
                            </div>
                        </div>
                    )}

                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Drag and Drop Zone */}
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                                    dragActive
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }`}
                            >
                                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                                    <Upload className="w-8 h-8" />
                                </div>

                                <div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">
                                        Drag & drop your rate sheet here, or <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse</span>
                                    </h4>
                                    <p className="text-xs font-semibold text-slate-400">
                                        Supports .xlsx, .xls, and .csv files with Destination, Courier, and Rate columns
                                    </p>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                            </div>

                            {/* Template & Fallback Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                            <Download className="w-4 h-4 text-indigo-500" />
                                            Excel Rate Card Template
                                        </div>
                                        <p className="text-[11px] font-semibold text-slate-400">
                                            Download our pre-structured template containing sample courier zones and rates.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={downloadSampleTemplate}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Download Template
                                        </button>
                                        {existingRates.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={downloadCurrentRatesExport}
                                                className="px-3.5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                title="Export current rates to edit and re-upload"
                                            >
                                                Export Current
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                                            Default Courier Partner
                                        </label>
                                        <p className="text-[11px] font-semibold text-slate-400 mb-2">
                                            Assigned whenever a row lacks a courier name or the partner is unmapped.
                                        </p>
                                    </div>
                                    <select
                                        value={defaultCourierId}
                                        onChange={e => setDefaultCourierId(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 ring-indigo-500"
                                    >
                                        {couriers.length === 0 && (
                                            <option value="">Default Courier Partner (Auto-Create)</option>
                                        )}
                                        {couriers.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {getCourierDisplayName(c)} {c.status && c.status !== 'Active' ? `(${c.status})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            {/* Summary Badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Total Rows</span>
                                    <span className="text-xl font-black text-slate-800 dark:text-white">{parsedRows.length}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest block mb-0.5">Valid Rates</span>
                                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{validCount}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block mb-0.5">New Couriers</span>
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{newCouriersFound.length}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest block mb-0.5">Invalid / Skipped</span>
                                    <span className="text-xl font-black text-rose-600 dark:text-rose-400">{invalidCount}</span>
                                </div>
                            </div>

                            {/* Configuration Options */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={autoCreateCouriers}
                                        onChange={e => setAutoCreateCouriers(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>Auto-register new couriers found in spreadsheet ({newCouriersFound.length} detected)</span>
                                </label>

                                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={overwriteExisting}
                                        onChange={e => setOverwriteExisting(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>Overwrite existing rates matching same Destination & Courier</span>
                                </label>
                            </div>

                            {/* Table Preview */}
                            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                <div className="max-h-64 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-100 dark:border-slate-800">
                                            <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                <th className="py-2.5 px-3">#</th>
                                                <th className="py-2.5 px-3">Destination / Zone</th>
                                                <th className="py-2.5 px-3">Courier Partner</th>
                                                <th className="py-2.5 px-3">Fee (KES)</th>
                                                <th className="py-2.5 px-3">Timeline</th>
                                                <th className="py-2.5 px-3">Status</th>
                                                <th className="py-2.5 px-3">Check</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {parsedRows.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                                                        !row.isValid ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                                                    }`}
                                                >
                                                    <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{row.rawRowIndex}</td>
                                                    <td className="py-2 px-3 font-bold text-slate-800 dark:text-white">
                                                        {row.destination || <span className="text-rose-500 italic">Missing</span>}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {row.resolvedCourierName}
                                                        </span>
                                                        {row.isNewCourier && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                                NEW
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 font-black text-indigo-600 dark:text-indigo-400">
                                                        {new Intl.NumberFormat().format(row.rate)}
                                                    </td>
                                                    <td className="py-2 px-3 text-slate-500 font-semibold">
                                                        {row.estimatedDays} day{row.estimatedDays !== 1 ? 's' : ''}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                            row.status === 'Active'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        {row.isValid ? (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                {row.warnings.length > 0 ? 'Warning' : 'OK'}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500" title={row.errors.join(', ')}>
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                Error
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-indigo-200 dark:border-indigo-950 border-t-indigo-600 animate-spin flex items-center justify-center">
                                    <Truck className="w-8 h-8 text-indigo-600 animate-pulse" />
                                </div>
                            </div>

                            <div className="space-y-2 max-w-sm">
                                <h4 className="text-lg font-black text-slate-800 dark:text-white">
                                    Importing Rate Card...
                                </h4>
                                <p className="text-xs font-semibold text-slate-400">
                                    {importStatusText}
                                </p>
                            </div>

                            <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${importProgress}%` }}
                                />
                            </div>
                            <span className="text-xs font-black text-indigo-600">{importProgress}%</span>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-10 flex flex-col items-center justify-center text-center space-y-5">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                <CheckCircle className="w-10 h-10" />
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="text-xl font-black text-slate-800 dark:text-white">
                                    Rates Successfully Imported!
                                </h4>
                                <p className="text-xs font-semibold text-slate-400 max-w-sm">
                                    {importedCount} delivery rate{importedCount !== 1 ? 's' : ''} published to the rate matrix.
                                    {createdCouriersCount > 0 && ` ${createdCouriersCount} new courier partner(s) registered.`}
                                </p>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-500/25 active:scale-95 transition-all"
                                >
                                    Done & View Rates
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {step !== 'importing' && step !== 'success' && (
                    <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                        {step === 'preview' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('upload');
                                    setParsedRows([]);
                                }}
                                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                Back / Choose Another File
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                        )}

                        {step === 'preview' && (
                            <button
                                type="button"
                                onClick={executeImport}
                                disabled={validCount === 0}
                                className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Commit & Import {validCount} Rate{validCount !== 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
