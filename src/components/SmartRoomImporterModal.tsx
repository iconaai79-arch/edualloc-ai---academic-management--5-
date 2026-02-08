
import React, { useState, useMemo } from 'react';
import type { Room, Building, Course, Institution } from '../types';
import { XIcon, SparklesIcon, CheckCircleIcon, ArrowUpTrayIcon } from './icons/index';
import { analyzeRoomSpreadsheet } from '../services/geminiService';

declare var XLSX: any;

type RoomMappingField = 'name' | 'shortName' | 'capacity' | 'buildingName' | 'equipment';
const ALL_ROOM_MAPPING_FIELDS: RoomMappingField[] = ['name', 'shortName', 'capacity', 'buildingName', 'equipment'];
const REQUIRED_ROOM_MAPPING_FIELDS: RoomMappingField[] = ['name', 'capacity', 'buildingName'];

interface SmartRoomImporterModalProps {
    onClose: () => void;
    onImport: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => Promise<void>;
    buildings: Building[];
    aiModelTier?: string;
    currentInstitution?: Institution | null;
}

export const SmartRoomImporterModal: React.FC<SmartRoomImporterModalProps> = ({
    onClose, onImport, buildings, aiModelTier, currentInstitution
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<RoomMappingField, string | null>>(ALL_ROOM_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<RoomMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ valid: Omit<Room, 'id' | 'institutionId'>[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const buildingNameMap = useMemo(() => new Map(buildings.map(b => [b.name.toLowerCase().trim(), b.id])), [buildings]);

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

                const mapping = await analyzeRoomSpreadsheet(headers, aiModelTier);

                const initialMapping: any = {};
                Object.keys(mapping).forEach(key => {
                    if (ALL_ROOM_MAPPING_FIELDS.includes(key as any)) {
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

    const handleMappingChange = (field: RoomMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev!, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_ROOM_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}.`);
            return;
        }

        const validRooms: Omit<Room, 'id' | 'institutionId'>[] = [];
        const invalidRows: { row: any, error: string }[] = [];

        (rawData || []).forEach((row, index) => {
            try {
                const name = row[userMapping.name!];
                const capacity = row[userMapping.capacity!];
                const buildingName = row[userMapping.buildingName!];

                const shortName = userMapping.shortName ? row[userMapping.shortName] : '';
                const equipment = userMapping.equipment ? row[userMapping.equipment] : '';

                if (!name || !capacity || !buildingName) {
                    throw new Error("Missing required fields.");
                }

                const bId = buildingNameMap.get(String(buildingName).toLowerCase().trim());
                if (!bId) {
                    throw new Error(`Building "${buildingName}" not found.`);
                }

                validRooms.push({
                    name: String(name).trim(),
                    shortName: String(shortName || name).substring(0, 10).trim(),
                    capacity: parseInt(capacity, 10) || 0,
                    buildingId: bId,
                    status: 'active',
                    equipment: String(equipment).split(',').map(e => e.trim()).filter(Boolean)
                });

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ valid: validRooms, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;
        setStep('finalizing');
        setImportProgress(0);

        try {
            await onImport(parsedData.valid);
            setImportProgress(100);
            setStep('success');
        } catch (err: any) {
            console.error("Import failure:", err);
            setErrorMessage(err.message || "Failed to save data.");
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-black uppercase tracking-tight">Smart Room Importer</h3>
                    {step !== 'finalizing' && <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>}
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/20">
                            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h4 className="text-lg font-bold mb-2">Upload Room Spreadsheet</h4>
                            <p className="text-sm text-slate-500 mb-8">Excel file should include Room Name, Capacity, and Building Name.</p>
                            <label className="btn-primary cursor-pointer px-10 py-3 inline-block shadow-lg shadow-indigo-100">
                                Select File
                                <input type="file" onChange={e => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="w-6 h-6 text-indigo-500" />
                                <h4 className="font-bold text-lg">Map Room Data Columns</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {ALL_ROOM_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <label className="text-sm font-bold capitalize text-slate-700 dark:text-slate-300">
                                            {field.replace(/([A-Z])/g, ' $1')} {REQUIRED_ROOM_MAPPING_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                        </label>
                                        <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="form-select sm:w-64">
                                            <option value="">-- Choose Header --</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleConfirmMapping} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Review Data</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h4 className="font-black text-xl tracking-tight">Preview Rooms ({parsedData?.valid.length})</h4>

                            {parsedData?.invalid && parsedData.invalid.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl text-xs text-red-600 mb-4">
                                    <p className="font-bold">{parsedData.invalid.length} rows will be skipped (Missing info or building not found).</p>
                                </div>
                            )}

                            <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-2xl">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Room Name</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Building</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Capacity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData?.valid.slice(0, 5).map((v, i) => {
                                            const b = buildings.find(b => b.id === v.buildingId);
                                            return (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                                    <td className="px-6 py-3 text-sm font-bold">{v.name}</td>
                                                    <td className="px-6 py-3 text-sm text-slate-500">{b?.name || '-'}</td>
                                                    <td className="px-6 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">{v.capacity}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button onClick={() => setStep('mapping')} className="btn-secondary">Adjust Mapping</button>
                                <button onClick={handleFinalImport} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Start Import</button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Analyzing...</h4>
                            <p className="text-sm text-slate-500">Mapping spreadsheet headers with AI</p>
                        </div>
                    )}

                    {step === 'finalizing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Saving Rooms...</h4>
                            <p className="text-sm text-slate-500">Writing records to infrastructure database</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-green-100">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase">Success</h4>
                            <p className="text-slate-500 mb-10">Facility rooms have been integrated.</p>
                            <button onClick={onClose} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Finish</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-red-100">
                                <XIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase text-red-600">Failed</h4>
                            <p className="text-slate-500 mb-10 max-w-md mx-auto">{errorMessage}</p>
                            <div className="flex gap-4">
                                <button onClick={() => setStep('upload')} className="btn-secondary h-12 px-8">Try Again</button>
                                <button onClick={onClose} className="btn-primary h-12 px-8 bg-slate-900 shadow-lg shadow-slate-200">Close</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
