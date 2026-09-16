import React, { useState } from 'react';
import type { Institution, User } from '../../types';
import { SparklesIcon } from '../icons/SparklesIcon';
import { XIcon } from '../icons/XIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { AcademicCapIcon } from '../icons/AcademicCapIcon';

interface AlumnaOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    admissionNumber: string;
    studentId?: string | null;
    currentInstitution?: Institution | null;
    onComplete: (alumnaData: {
        personalEmail: string;
        phone: string;
        nextDestination: string;
        alumniMemberId: string;
    }) => Promise<void>;
}

const NEXT_DESTINATION_OPTIONS = [
    'Senior Secondary School (SSS) — STEM Track',
    'Senior Secondary School (SSS) — Social Sciences & Humanities Track',
    'Senior Secondary School (SSS) — Arts & Sports Science Track',
    'Technical and Vocational College (TVET) / Polytechnic',
    'Kenya Medical Training College (KMTC)',
    'National Youth Service (NYS) / Disciplined Forces',
    'Apprenticeship / Direct Employment',
    'International High School / Transfer Abroad'
];

export const AlumnaOnboardingModal: React.FC<AlumnaOnboardingModalProps> = ({
    isOpen,
    onClose,
    studentName,
    admissionNumber,
    currentInstitution,
    onComplete
}) => {
    const currentYear = new Date().getFullYear().toString();
    const [personalEmail, setPersonalEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [nextDestination, setNextDestination] = useState(NEXT_DESTINATION_OPTIONS[0]);
    const [customDestination, setCustomDestination] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-generate membership serial
    const generatedAlumniId = React.useMemo(() => {
        const rand = Math.floor(1000 + Math.random() * 9000);
        return `ALM-${currentYear}-${rand}`;
    }, [currentYear]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personalEmail.trim()) {
            alert('Please enter a valid personal contact email.');
            return;
        }
        if (!phone.trim()) {
            alert('Please enter a valid mobile or WhatsApp phone number.');
            return;
        }

        const finalDestination = nextDestination === 'Other' ? (customDestination.trim() || 'Undecided') : nextDestination;

        setIsSubmitting(true);
        try {
            await onComplete({
                personalEmail: personalEmail.trim().toLowerCase(),
                phone: phone.trim(),
                nextDestination: finalDestination,
                alumniMemberId: generatedAlumniId
            });
        } catch (err: any) {
            alert('Failed to register alumni profile: ' + (err?.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-white shadow-xs">
                            <AcademicCapIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black uppercase tracking-tight">
                                    Alumnae Portal Enrollment
                                </h3>
                                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                    Step 2 of 3
                                </span>
                            </div>
                            <p className="text-xs text-white/90 font-medium">
                                Enrolling graduating student to school alumnae network
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
                    {/* Notice Callout */}
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                        <SparklesIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <strong>Mandatory Graduation Transition:</strong> Ministry standards require capturing non-institutional personal contact details so the student remains connected for alumni mentorship, certificates, and school records.
                        </div>
                    </div>

                    {/* Pre-populated Student Info Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Name</span>
                            <span className="font-black text-slate-800 dark:text-slate-200 truncate block">{studentName}</span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Admission Number</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{admissionNumber || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Institution</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">{currentInstitution?.name || 'School'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Alumna Member ID</span>
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 block">{generatedAlumniId}</span>
                        </div>
                    </div>

                    {/* Personal Email Field */}
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                            Personal Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="e.g. brian.ochieng@gmail.com (non-school email)"
                            value={personalEmail}
                            onChange={e => setPersonalEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 dark:text-slate-100"
                        />
                        <span className="text-[10px] text-slate-400 block">
                            Post-graduation contact email for credential verification and reunions.
                        </span>
                    </div>

                    {/* Mobile / WhatsApp Field */}
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                            Personal Phone / WhatsApp Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            required
                            placeholder="e.g. +254 712 345 678"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* Next Pathway / Destination */}
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                            Next Educational or Career Pathway <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={nextDestination}
                            onChange={e => setNextDestination(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                            {NEXT_DESTINATION_OPTIONS.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                            <option value="Other">Other (Specify below)</option>
                        </select>
                    </div>

                    {nextDestination === 'Other' && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                                Specify Destination
                            </label>
                            <input
                                type="text"
                                placeholder="Enter student's next school or plan"
                                value={customDestination}
                                onChange={e => setCustomDestination(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-400 text-slate-800 dark:text-slate-100"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>{isSubmitting ? 'Enrolling...' : 'Enroll to Alumnae & Release Cert'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
