import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
    XIcon, ArrowUpTrayIcon, SparklesIcon, 
    CheckCircleIcon, ArrowPathIcon, ChevronRightIcon
} from './icons';
import { apiService } from '../services/apiService';
import { 
    analyzePoliticalRegistrySpreadsheet, 
    analyzeVoterSpreadsheet 
} from '../services/geminiService';

export interface SmartPoliticalImporterModalProps {
    type: 'registry' | 'voters';
    campaignId?: string;
    onClose: () => void;
    onRefresh: () => void;
}

export const SmartPoliticalImporterModal: React.FC<SmartPoliticalImporterModalProps> = ({ 
    type, 
    campaignId, 
    onClose, 
    onRefresh 
}) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string | null>>({});
    const [rawData, setRawData] = useState<any[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [progress, setProgress] = useState(0);

    const getTargetFields = () => {
        if (type === 'registry') {
            return ['countyCode', 'countyName', 'constituencyCode', 'constituencyName', 'wardCode', 'wardName'];
        }
        return ['voterName', 'phoneNumber', 'idNumber', 'votingCenter', 'ward', 'status'];
    };

    const handleFileSelect = (file: File) => {
        setStep('importing');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty.");
                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);
                setRawData(XLSX.utils.sheet_to_json(worksheet));

                let aiMapping;
                if (type === 'registry') {
                    aiMapping = await analyzePoliticalRegistrySpreadsheet(headers);
                } else {
                    aiMapping = await analyzeVoterSpreadsheet(headers);
                }
                
                // Initialize mapping with all target fields to ensure they show up in the UI
                const initialMapping: Record<string, string | null> = {};
                getTargetFields().forEach(field => {
                    initialMapping[field] = aiMapping[field] || null;
                });

                setMapping(initialMapping);
                setStep('mapping');
            } catch (err: any) {
                setErrorMessage(err.message);
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleImport = async () => {
        setStep('importing');
        setProgress(0);
        try {
            if (type === 'registry') {
                await importRegistry();
            } else {
                await importVoters();
            }
            onRefresh();
            setStep('success');
        } catch (err: any) {
            setErrorMessage(err.message);
            setStep('error');
        }
    };

    const importRegistry = async () => {
        const countyMap = new Map<string, string>();
        const constituencyMap = new Map<string, string>();

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const cName = row[mapping.countyName!];
            const cCode = row[mapping.countyCode!];
            const conName = row[mapping.constituencyName!];
            const conCode = row[mapping.constituencyCode!];
            const wName = row[mapping.wardName!];
            const wCode = row[mapping.wardCode!];

            if (!cName || !conName || !wName) continue;

            let countyId = countyMap.get(cName);
            if (!countyId) {
                countyId = `cty_${Date.now()}_${i}`;
                await apiService.saveModuleRecord('counties', {
                    id: countyId,
                    name: cName,
                    code: String(cCode || ''),
                    status: 'active',
                    createdAt: new Date().toISOString()
                });
                countyMap.set(cName, countyId);
            }

            const conKey = `${countyId}_${conName}`;
            let conId = constituencyMap.get(conKey);
            if (!conId) {
                conId = `con_${Date.now()}_${i}`;
                await apiService.saveModuleRecord('constituencies', {
                    id: conId,
                    countyId: countyId,
                    name: conName,
                    code: String(conCode || ''),
                    createdAt: new Date().toISOString()
                });
                constituencyMap.set(conKey, conId);
            }

            await apiService.saveModuleRecord('wards', {
                id: `ward_${Date.now()}_${i}`,
                constituency_id: conId,
                name: wName,
                code: String(wCode || ''),
                createdAt: new Date().toISOString()
            });

            setProgress(Math.round(((i + 1) / rawData.length) * 100));
        }
    };

    const importVoters = async () => {
        if (!campaignId) throw new Error("Missing Campaign ID context.");

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const voterName = row[mapping.voterName!];
            const phoneNumber = String(row[mapping.phoneNumber!] || '');
            const idNumber = String(row[mapping.idNumber!] || '');
            const votingCenter = row[mapping.votingCenter!];
            const ward = row[mapping.ward!];
            const status = (row[mapping.status!] || 'uncontacted').toLowerCase();

            if (!phoneNumber) continue;

            await apiService.saveModuleRecord('voter_outreach', {
                id: `voter_${Date.now()}_${i}`,
                campaignId: campaignId,
                voterName: voterName,
                phoneNumber: phoneNumber,
                idNumber: idNumber,
                votingCenter: votingCenter,
                ward: ward,
                status: ['supporter', 'undecided', 'opposed', 'uncontacted'].includes(status) ? status : 'uncontacted',
                createdAt: new Date().toISOString()
            });

            setProgress(Math.round(((i + 1) / rawData.length) * 100));
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">
                            {type === 'registry' ? 'AI Political Registry Importer' : 'AI Voter Data Importer'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {type === 'registry' ? 'Bulk sync official IEBC hierarchy' : 'Bulk import campaign voter prospects'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <XIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'upload' && (
                        <div className="text-center py-12 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/30 dark:bg-slate-900/30">
                            <ArrowUpTrayIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                            <h4 className="text-lg font-black uppercase tracking-tighter mb-2">Drop Spreadsheet</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase mb-8">Excel (.xlsx) or CSV format</p>
                            <input type="file" onChange={e => e.target.files && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" id="political-upload" />
                            <label htmlFor="political-upload" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 dark:shadow-none">Select File</label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-4">
                                <SparklesIcon className="w-6 h-6 text-indigo-600" />
                                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100 uppercase leading-relaxed">AI has mapped your columns. Please verify before processing the bulk import.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.keys(mapping).map(field => (
                                    <div key={field} className="space-y-1.5 p-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">{field.replace(/([A-Z])/g, ' $1')}</label>
                                        <div className="relative group">
                                            <select 
                                                value={mapping[field] || ''} 
                                                onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black uppercase text-[10px] appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 dark:text-slate-200"
                                            >
                                                <option value="">-- UNMAPPED --</option>
                                                {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <ChevronRightIcon className="w-4 h-4 rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleImport} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-900 transition-all">Initialize Bulk Sync</button>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="text-center py-12">
                            <ArrowPathIcon className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden mb-4">
                                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Processing Data Matrix... {progress}%</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Sync Successful</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase mb-8">Data has been successfully imported into the system.</p>
                            <button onClick={onClose} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Return to Manager</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Import Failed</h4>
                            <p className="text-xs text-red-500 font-bold uppercase mb-8">{errorMessage}</p>
                            <button onClick={() => setStep('upload')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Try Again</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
