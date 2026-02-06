
import React, { useState } from 'react';
import { analyzeInventorySpreadsheet } from '../services/geminiService';
import { SparklesIcon } from './icons';

declare var XLSX: any;

interface SmartInventoryImporterModalProps {
    onImport: (items: any[]) => void;
    onClose: () => void;
}

export const SmartInventoryImporterModal: React.FC<SmartInventoryImporterModalProps> = ({ onImport, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const headers = json[0] as string[];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            try {
                const mapping = await analyzeInventorySpreadsheet(headers);
                
                const mappedItems = rows.map((row: any) => {
                    const item: any = {};
                    // Basic mapping logic based on AI response keys
                    if (mapping['name']) item.name = row[mapping['name']!];
                    if (mapping['category']) item.category = row[mapping['category']!] || 'General';
                    if (mapping['quantity']) item.quantity = Number(row[mapping['quantity']!]) || 0;
                    if (mapping['unit']) item.unit = row[mapping['unit']!] || 'pcs';
                    if (mapping['reorderLevel']) item.reorderLevel = Number(row[mapping['reorderLevel']!]) || 10;
                    if (mapping['location']) item.location = row[mapping['location']!] || 'Store';
                    
                    if (!item.name) return null; // Skip invalid
                    return item;
                }).filter(Boolean);

                onImport(mappedItems);
                onClose();
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to analyze spreadsheet.");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-teal-500" />
                    Smart Inventory Import
                </h3>
                <p className="text-sm text-slate-500 mb-4">Upload an Excel file. AI will map columns automatically.</p>
                
                <input type="file" onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-100">Cancel</button>
                    <button onClick={handleImport} disabled={!file || isProcessing} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:brightness-90 disabled:opacity-50">
                        {isProcessing ? 'Analyzing...' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};
