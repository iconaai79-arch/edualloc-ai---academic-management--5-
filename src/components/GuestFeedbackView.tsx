
import React, { useState, useMemo } from 'react';
import { StarIcon, CheckCircleIcon, BuildingOfficeIcon, XIcon, MagnifyingGlassIcon } from './icons/index';
import type { GuestFeedback, Institution, FeedbackSubmission } from '../types';

interface GuestFeedbackViewProps {
    onClose: () => void;
    onSubmit: (feedback: Omit<GuestFeedback, 'id' | 'submittedAt'>) => void;
    institutions: Institution[];
}

export const GuestFeedbackView: React.FC<GuestFeedbackViewProps> = ({ onClose, onSubmit, institutions = [] }) => {
    const [guestName, setGuestName] = useState('');
    const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comments, setComments] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredInstitutions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return institutions.slice(0, 10);
        return institutions.filter(inst => inst.name.toLowerCase().includes(query));
    }, [institutions, searchQuery]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Please provide a rating by clicking on the stars.");
            return;
        }
        if (!selectedInstitutionId) {
            alert("Please search and select the institution you visited.");
            return;
        }

        const timestamp = new Date().toISOString();

        onSubmit({
            guestName,
            institutionId: selectedInstitutionId,
            visitDate,
            rating,
            comments,
            status: 'new',
            timestamp: timestamp,
            isAnonymous: !guestName.trim(),
            title: 'General Guest Feedback'
        });
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-green-50 dark:bg-green-900/30 text-green-600 mb-6 shadow-xl shadow-green-100 dark:shadow-none">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Gratitude Received</h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                        Thank you for sharing your experience. Your feedback has been tagged and dispatched to the relevant administration.
                    </p>
                    <button onClick={onClose} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98]">
                        Return to Portal
                    </button>
                </div>
            </div>
        );
    }

    const selectedInst = (institutions || []).find(i => i.id === selectedInstitutionId);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans">
            <header className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
                <div className="max-w-3xl mx-auto flex justify-between items-center px-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-yellow-50 rounded-lg">
                            <StarIcon className="w-5 h-5 text-yellow-500" />
                        </div>
                        <h1 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">Public Feedback Registry</h1>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
            </header>

            <main className="flex-grow p-6 flex items-center justify-center">
                <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-8 sm:p-10 border border-slate-100 dark:border-slate-700">
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-2">Rate Your Journey</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Help us enhance our academic ecosystem through your honest insights.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Identity (Optional)</label>
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    className="form-input h-12"
                                    placeholder="e.g. John Smith"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Visit Date</label>
                                    <input
                                        type="date"
                                        value={visitDate}
                                        onChange={e => setVisitDate(e.target.value)}
                                        className="form-input h-12"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Institution</label>
                                    {selectedInstitutionId ? (
                                        <div className="h-12 flex items-center justify-between px-4 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl animate-fade-in">
                                            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 truncate">{selectedInst?.name}</span>
                                            <button type="button" onClick={() => setSelectedInstitutionId('')} className="text-indigo-400 hover:text-red-500 transition-colors">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search registry..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="form-input pl-9 h-12 text-xs"
                                            />
                                            {searchQuery.trim() && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-20 max-h-48 overflow-y-auto animate-fade-in-up">
                                                    {filteredInstitutions.map(inst => (
                                                        <button
                                                            key={inst.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedInstitutionId(inst.id);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors border-b last:border-0"
                                                        >
                                                            <BuildingOfficeIcon className="w-4 h-4 text-slate-300" />
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{inst.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Satisfaction Index</label>
                            <div className="flex justify-center items-center gap-4" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-125"
                                    >
                                        <StarIcon
                                            className={`w-12 h-12 transition-colors ${(hoverRating || rating) >= star
                                                    ? 'text-yellow-400 drop-shadow-md'
                                                    : 'text-slate-100 dark:text-slate-700'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 text-center uppercase font-black tracking-widest h-4">
                                {rating === 1 && "Extremely Poor"}
                                {rating === 2 && "Fairly Consistent"}
                                {rating === 3 && "Standard Experience"}
                                {rating === 4 && "Exceeded Expectations"}
                                {rating === 5 && "World Class Excellence"}
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Observational Notes</label>
                            <textarea
                                rows={4}
                                value={comments}
                                onChange={e => setComments(e.target.value)}
                                className="form-input p-4 resize-none"
                                placeholder="Share your constructive thoughts..."
                                required
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                        >
                            Commit Feedback
                        </button>
                    </form>
                </div>
            </main>
            <style>{`
                .form-input { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #f8fafc; font-size: 0.875rem; transition: all 0.2s; outline: none; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: white; }
                .form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
            `}</style>
        </div>
    );
};
