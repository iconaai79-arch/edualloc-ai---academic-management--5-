import React, { useState, useRef } from 'react';
import type { TimeOffCategory, TimeOffRequest } from '../types';

interface TimeOffRequestModalProps {
    onClose: () => void;
    onSubmit: (data: Omit<TimeOffRequest, 'id' | 'lecturerId' | 'status' | 'institutionId' | 'timestamp'>) => void;
}

const CATEGORIES: TimeOffCategory[] = ['Disability', 'Medical', 'Personal Leave', 'Conference', 'Other'];

export const TimeOffRequestModal: React.FC<TimeOffRequestModalProps> = ({ onClose, onSubmit }) => {
    const [category, setCategory] = useState<TimeOffCategory>('Medical');
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

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
            category,
            startDate,
            endDate,
            isFullDay,
            startTime: isFullDay ? undefined : startTime,
            endTime: isFullDay ? undefined : endTime,
            reason,
            supportingDocumentUrl,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request Time Off</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium">Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value as TimeOffCategory)} required className="mt-1 form-select">
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={isFullDay} onChange={e => setIsFullDay(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                    <span>Is this a full day request?</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 form-input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="mt-1 form-input" />
                            </div>
                            {!isFullDay && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium">Start Time</label>
                                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="mt-1 form-input" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">End Time</label>
                                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="mt-1 form-input" />
                                    </div>
                                </>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium">Reason</label>
                                <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={3} className="mt-1 form-input" placeholder="Briefly explain the reason for your request..."></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium">Supporting Document (Optional)</label>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="mt-1 file-input" />
                                {isUploading && <p className="text-xs mt-1">Uploading...</p>}
                                {supportingDocumentUrl && <p className="text-xs mt-1 text-green-600">Document attached.</p>}
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                        <button type="submit" className="btn-primary">Submit Request</button>
                        <button type="button" onClick={onClose} className="btn-secondary mr-3">Cancel</button>
                    </div>
                </form>
            </div>
             <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; }
                .btn-primary:hover { filter: brightness(0.9); }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .file-input{display:block;width:100%;font-size:.875rem;line-height:1.25rem;color:#6b7280;file:mr-4;file:px-4;file:py-2;file:rounded-full;file:border-0;file:text-sm;file:font-semibold;file:bg-[var(--color-primary)]/10;file:text-[var(--color-primary)];hover:file:bg-[var(--color-primary)]/20}.dark .file-input{color:#9ca3af;file:bg-slate-700;file:text-slate-200;hover:file:bg-slate-600}
            `}</style>
        </div>
    );
};
