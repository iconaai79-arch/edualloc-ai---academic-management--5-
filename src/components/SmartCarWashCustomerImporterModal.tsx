
import React, { useState } from 'react';
import type { CarWashCustomer, CarWashVehicle, CarWashVehicleType, Institution } from '../types';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { analyzeCarWashCustomerSpreadsheet } from '../services/geminiService';
import * as XLSX from 'xlsx';

type CustomerMappingField = 'name' | 'phoneNumber' | 'email' | 'plateNumber' | 'vehicleType' | 'make' | 'model' | 'color';
const ALL_CUSTOMER_MAPPING_FIELDS: CustomerMappingField[] = ['name', 'phoneNumber', 'email', 'plateNumber', 'vehicleType', 'make', 'model', 'color'];
const REQUIRED_CUSTOMER_MAPPING_FIELDS: CustomerMappingField[] = ['name', 'phoneNumber'];

interface SmartCarWashCustomerImporterModalProps {
    onClose: () => void;
    onImport: (customers: any[], vehicles: any[]) => Promise<void>;
    institutionId: string;
}

export const SmartCarWashCustomerImporterModal: React.FC<SmartCarWashCustomerImporterModalProps> = ({
    onClose, onImport, institutionId
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<CustomerMappingField, string | null>>(ALL_CUSTOMER_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CustomerMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ customers: any[], vehicles: any[], invalid: { row: any, error: string }[] } | null>(null);
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

                const mapping = await analyzeCarWashCustomerSpreadsheet(headers);

                const initialMapping: any = {};
                Object.keys(mapping).forEach(key => {
                    if (ALL_CUSTOMER_MAPPING_FIELDS.includes(key as any)) {
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

    const handleMappingChange = (field: CustomerMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_CUSTOMER_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}.`);
            return;
        }

        const validCustomers: any[] = [];
        const validVehicles: any[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        (rawData || []).forEach((row) => {
            try {
                const name = row[userMapping.name!];
                const phone = row[userMapping.phoneNumber!];

                if (!name || !phone) {
                    throw new Error("Missing name or phone number.");
                }

                const custId = `cwc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const customer = {
                    id: custId,
                    institutionId,
                    name: String(name).trim(),
                    phoneNumber: String(phone).trim(),
                    email: userMapping.email ? String(row[userMapping.email] || '') : '',
                    loyaltyStamps: 0,
                    stampsForFreeWash: 10,
                    createdAt: new Date().toISOString()
                };

                validCustomers.push(customer);

                const plate = userMapping.plateNumber ? String(row[userMapping.plateNumber] || '').toUpperCase() : '';
                if (plate) {
                    const vehicleType = (userMapping.vehicleType ? String(row[userMapping.vehicleType] || 'Sedan') : 'Sedan') as CarWashVehicleType;
                    const vehicle: CarWashVehicle = {
                        id: `cwv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        institutionId,
                        customerId: custId,
                        plateNumber: plate,
                        make: userMapping.make ? String(row[userMapping.make] || '') : '',
                        model: userMapping.model ? String(row[userMapping.model] || '') : '',
                        color: userMapping.color ? String(row[userMapping.color] || '') : '',
                        vehicleType: ['Sedan', 'SUV', 'Truck', 'Matatu', 'Motorbike', 'Van', 'Bus'].includes(vehicleType) ? vehicleType : 'Sedan'
                    };
                    validVehicles.push(vehicle);
                }

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ customers: validCustomers, vehicles: validVehicles, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.customers) return;
        setStep('finalizing');

        try {
            await onImport(parsedData.customers, parsedData.vehicles);
            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to save data.");
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-black uppercase tracking-tight dark:text-white">Smart Customer Importer</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6 dark:text-slate-400" /></button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900">
                            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <h4 className="text-lg font-bold mb-2 dark:text-white">Upload Customer List</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Select an Excel (.xlsx) file containing customer names, phone numbers, and optional vehicle details.</p>
                            <label className="bg-cyan-600 text-white rounded-xl font-bold px-10 py-3 inline-block cursor-pointer shadow-lg shadow-cyan-200 dark:shadow-none hover:bg-cyan-700 transition-all">
                                Select File
                                <input type="file" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="w-6 h-6 text-cyan-500" />
                                <h4 className="font-bold text-lg dark:text-white">Map Customer Columns</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ALL_CUSTOMER_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            {field.replace(/([A-Z])/g, ' $1')} {REQUIRED_CUSTOMER_MAPPING_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                        </label>
                                        <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white">
                                            <option value="">-- Choose Header --</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleConfirmMapping} className="bg-cyan-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-cyan-200 dark:shadow-none hover:bg-cyan-700">Review Data</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <h4 className="font-black text-xl tracking-tight dark:text-white">Ready to Import ({parsedData?.customers.length} customers)</h4>
                            <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-2xl">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500">Name</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500">Phone</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500">Vehicle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {parsedData?.customers.slice(0, 10).map((c, i) => {
                                            const v = parsedData.vehicles.find(vh => vh.customerId === c.id);
                                            return (
                                                <tr key={i}>
                                                    <td className="px-6 py-3 text-sm font-bold dark:text-white">{c.name}</td>
                                                    <td className="px-6 py-3 text-sm text-slate-500 dark:text-slate-400">{c.phoneNumber}</td>
                                                    <td className="px-6 py-3 text-sm font-black text-cyan-600">{v ? `${v.plateNumber} (${v.vehicleType})` : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button onClick={() => setStep('upload')} className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold">Restart</button>
                                <button onClick={handleFinalImport} className="bg-cyan-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-cyan-200 dark:shadow-none">Confirm & Import</button>
                            </div>
                        </div>
                    )}

                    {(step === 'importing' || step === 'finalizing') && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold dark:text-white">Processing...</h4>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-[2rem] flex items-center justify-center mb-6">
                                <CheckCircleIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-2xl font-black uppercase mb-2 dark:text-white">Import Successful</h4>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">{parsedData?.customers.length} customers added to the registry.</p>
                            <button onClick={onClose} className="px-10 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg">Done</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-[2rem] flex items-center justify-center mb-6">
                                <XIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-2xl font-black uppercase text-red-600">Import Error</h4>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">{errorMessage}</p>
                            <button onClick={onClose} className="px-10 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

