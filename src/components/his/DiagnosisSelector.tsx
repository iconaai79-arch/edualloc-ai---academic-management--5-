
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { ICDCode } from '../../types';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface DiagnosisSelectorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const DiagnosisSelector: React.FC<DiagnosisSelectorProps> = ({ value, onChange, placeholder }) => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<ICDCode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchCodes = async () => {
            if (search.length < 2) {
                setResults([]);
                return;
            }
            setIsLoading(true);
            try {
                // Fetch codes matching search in description or code
                const data = await apiService.fetchModuleRecords<ICDCode>('icd_codes', 'ALL', undefined, {
                    filter: { 
                        or: [
                            `code.ilike.%${search}%`,
                            `description.ilike.%${search}%`
                        ]
                    },
                    limit: 10
                });
                setResults(data || []);
            } catch (error) {
                console.error("Diagnosis search error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchCodes, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSelect = (code: ICDCode) => {
        onChange(`${code.code} - ${code.description}`);
        setSearch('');
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <input 
                    placeholder={placeholder || "SEARCH BY ICD-10 CODE OR DIAGNOSIS NAME..."}
                    value={value || search}
                    onChange={(e) => {
                        if (value) onChange('');
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                />
                {value ? (
                    <button 
                        onClick={() => { onChange(''); setSearch(''); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}
            </div>

            {isOpen && (search.length >= 2 || isLoading) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden max-h-64 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
                            <SparklesIcon className="w-4 h-4 animate-spin" />
                            Syncing Registry...
                        </div>
                    ) : results.length > 0 ? (
                        results.map((r, i) => (
                            <button 
                                key={r.id || i}
                                onClick={() => handleSelect(r)}
                                className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-white/5 last:border-0 group transition-all"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex-shrink-0">
                                        {r.code}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight line-clamp-2 flex-1">
                                        {r.description}
                                    </span>
                                </div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {r.category || 'Clinical Diagnosis'}
                                </p>
                            </button>
                        ))
                    ) : (
                        <div className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            No matching clinical codes found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

