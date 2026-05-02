
import React, { useState, useRef } from 'react';
import type { StudentAbsenceRequest } from '../types';
import { XIcon } from './icons/XIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';


interface StudentAbsenceRequestModalProps {
    onClose: () => void;
    onSubmit: (data: Omit<StudentAbsenceRequest, 'id' | 'studentId' | 'status' | 'institutionId' | 'timestamp'>) => void;
}

export const StudentAbsenceRequestModal: React.FC<StudentAbsenceRequestModalProps> = ({ onClose, onSubmit }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'justification'>('details');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isFullDay, setIsFullDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [reason, setReason] = useState('');
    const [supportingDocumentUrl, setSupportingDocumentUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Please select a file under 5MB.");
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            setSupportingDocumentUrl(reader.result as string);
            setIsUploading(false);
        };
        reader.onerror = () => {
            alert('Failed to read file.');
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date cannot be after end date.');
            return;
        }
        if (!isFullDay && startTime >= endTime) {
            alert('Start time must be before end time.');
            return;
        }

        onSubmit({
            startDate,
            endDate,
            isFullDay,
            startTime: isFullDay ? undefined : startTime,
            endTime: isFullDay ? undefined : endTime,
            reason,
            supportingDocumentUrl,
        });
    };

    const renderDetailsTab = () => (
        <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center pt-6 md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${isFullDay ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 dark:border-slate-700'}`}>
                            {isFullDay && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </div>
                        <input type="checkbox" checked={isFullDay} onChange={e => setIsFullDay(e.target.checked)} className="hidden" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Request for full day(s)</span>
                    </label>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1 flex items-center gap-2">
                        <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
                        Start Date
                    </label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="form-input" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1 flex items-center gap-2">
                        <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
                        End Date
                    </label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="form-input" />
                </div>

                {!isFullDay && (
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-indigo-500" />
                                Start Time
                            </label>
                            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="form-input" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-indigo-500" />
                                End Time
                            </label>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="form-input" />
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('justification')}
                    className="w-full py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                    Next Step: Justification <SparklesIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderJustificationTab = () => (
        <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1 flex items-center gap-2">
                    <ClipboardListIcon className="w-4 h-4 text-indigo-500" />
                    Absence Reason
                </label>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required
                    rows={4}
                    className="form-input resize-none"
                    placeholder="Briefly explain why you will be absent..."
                />
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 block ml-1">
                    Supporting Document (Optional)
                </label>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[1.5rem] p-8 text-center cursor-pointer transition-all ${supportingDocumentUrl ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-400'}`}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Uploading...</p>
                        </div>
                    ) : supportingDocumentUrl ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Document Attached</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <DocumentArrowDownIcon className="w-10 h-10" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Upload proof (PDF/JPG)</p>
                            <p className="text-[9px] font-bold opacity-60">Wait for verification before submitting</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className="flex-1 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95 shadow-xl flex items-center justify-center gap-2"
                >
                    Submit Absence Request <CheckCircleIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>

                {/* Header Section */}
                <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
                            <SparklesIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Class Absence</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Student request portal</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
                        <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-10 border-b border-slate-100 dark:border-slate-800 flex gap-8 bg-slate-50/30 dark:bg-slate-900/30">
                    {(['details', 'justification'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 pt-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab === 'details' ? 'Request Timing' : 'Reasoning'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Section */}
                <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
                    <form onSubmit={handleSubmit}>
                        {activeTab === 'details' ? renderDetailsTab() : renderJustificationTab()}
                    </form>
                </div>
            </div>

            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #f1f5f9; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; }
                .dark .form-input, .dark .form-select { border-color: #1e293b; background-color: #020617; color: #f1f5f9; }
                .form-input:focus, .form-select:focus { border-color: #4f46e5; outline: none; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

