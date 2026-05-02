
import React, { useState } from 'react';
import type { CountyInventoryItem, Institution } from '../types';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { analyzeCountyInventorySpreadsheet } from '../services/geminiService';

import * as XLSX from 'xlsx';

type InventoryMappingField = 'name' | 'category' | 'quantity' | 'unit' | 'supplierName' | 'targetInstitutionId' | 'deliveryMethod';
const ALL_INVENTORY_MAPPING_FIELDS: InventoryMappingField[] = ['name', 'category', 'quantity', 'unit', 'supplierName', 'targetInstitutionId', 'deliveryMethod'];
const REQUIRED_INVENTORY_MAPPING_FIELDS: InventoryMappingField[] = ['name', 'category', 'quantity'];

interface SmartInventoryImporterModalProps {
    onClose: () => void;
    onImport: (items: any[]) => Promise<void>;
    aiModelTier?: string;
    countyId: string;
    institutions: Institution[];
}

export const SmartInventoryImporterModal: React.FC<SmartInventoryImporterModalProps> = ({
    onClose, onImport, aiModelTier, countyId, institutions
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<InventoryMappingField, string | null>>(ALL_INVENTORY_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<InventoryMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ valid: any[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing');
        setErrorMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty.");

                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                const mapping = await analyzeCountyInventorySpreadsheet(headers);

                const initialMapping: any = {};
                Object.keys(mapping).forEach(key => {
                    if (ALL_INVENTORY_MAPPING_FIELDS.includes(key as any)) {
                        initialMapping[key] = mapping[key];
                    }
                });

                setUserMapping(prev => ({ ...prev, ...initialMapping }));
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to process spreadsheet.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: InventoryMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_INVENTORY_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}.`);
            return;
        }

        const validItems: any[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        (rawData || []).forEach((row) => {
            try {
                const name = row[userMapping.name!];
                const category = row[userMapping.category!];
                const quantity = parseFloat(row[userMapping.quantity!]);

                if (!name || !category || isNaN(quantity)) {
                    throw new Error("Missing or invalid required fields (Name, Category, or Quantity).");
                }

                const unit = userMapping.unit ? String(row[userMapping.unit] || 'Units') : 'Units';
                const supplierName = userMapping.supplierName ? String(row[userMapping.supplierName] || '') : '';
                const targetId = userMapping.targetInstitutionId ? String(row[userMapping.targetInstitutionId] || '') : '';
                const delivery = userMapping.deliveryMethod ? (String(row[userMapping.deliveryMethod]).toLowerCase().includes('parcel') ? 'parcel' : 'driver') : 'driver';

                validItems.push({
                    name: String(name).trim(),
                    category: String(category).trim(),
                    quantity,
                    unit,
                    supplierName,
                    targetInstitutionId: targetId,
                    deliveryMethod: delivery,
                    countyId,
                    status: 'at_hq',
                    atHqDate: new Date().toISOString(),
                    qrCode: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
                });

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ valid: validItems, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;
        setStep('finalizing');

        try {
            await onImport(parsedData.valid);
            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to save data.");
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black uppercase tracking-tight">Bulk Inventory Importer</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-12 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50">
                            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h4 className="text-lg font-bold mb-2">Upload Inventory List</h4>
                            <p className="text-sm text-slate-500 mb-8">Select an Excel (.xlsx) file containing your stock items, categories, and quantities.</p>
                            <label className="bg-indigo-600 text-white rounded-xl font-bold px-10 py-3 inline-block cursor-pointer shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                Select File
                                <input type="file" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="w-6 h-6 text-indigo-500" />
                                <h4 className="font-bold text-lg">Map Inventory Columns</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ALL_INVENTORY_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            {field.replace(/([A-Z])/g, ' $1')} {REQUIRED_INVENTORY_MAPPING_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                        </label>
                                        <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold">
                                            <option value="">-- Choose Header --</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleConfirmMapping} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">Review Data</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h4 className="font-black text-xl tracking-tight">Ready to Import ({parsedData?.valid.length} items)</h4>
                            <div className="overflow-hidden border border-slate-100 rounded-2xl">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500">Item Name</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500">Category</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedData?.valid.slice(0, 5).map((v, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-3 text-sm font-bold">{v.name}</td>
                                                <td className="px-6 py-3 text-sm text-slate-500">{v.category}</td>
                                                <td className="px-6 py-3 text-sm font-black text-indigo-600">{v.quantity} {v.unit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button onClick={() => setStep('upload')} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Restart</button>
                                <button onClick={handleFinalImport} className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200">Confirm & Import</button>
                            </div>
                        </div>
                    )}

                    {(step === 'importing' || step === 'finalizing') && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold">Processing...</h4>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6">
                                <CheckCircleIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-2xl font-black uppercase mb-2">Import Successful</h4>
                            <p className="text-slate-500 mb-8">{parsedData?.valid.length} inventory items added to headquarters.</p>
                            <button onClick={onClose} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Done</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-6">
                                <XIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-2xl font-black uppercase text-red-600">Import Error</h4>
                            <p className="text-slate-500 mb-8">{errorMessage}</p>
                            <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

