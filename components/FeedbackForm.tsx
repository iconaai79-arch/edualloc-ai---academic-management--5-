
import React, { useState } from 'react';
import type { User } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface FeedbackFormProps {
    user: User;
    onAddFeedback: (title: string, content: string, isAnonymous: boolean) => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ user, onAddFeedback }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert('Please provide a title and content for your feedback.');
            return;
        }

        setIsSubmitting(true);
        onAddFeedback(title, content, isAnonymous);
        
        // Simulate submission
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitSuccess(true);
            setTitle('');
            setContent('');
            setIsAnonymous(true);

            setTimeout(() => {
                setSubmitSuccess(false);
            }, 3000); // Hide success message after 3 seconds
        }, 1000);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">Suggestion Box</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                {submitSuccess ? (
                    <div className="text-center p-8">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                        <h4 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Feedback Submitted</h4>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thank you for your input. We value your feedback.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Have a suggestion, concern, or compliment? Share it with the administration here. Your feedback helps improve our institution.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="feedback-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Title / Subject
                            </label>
                            <input
                                type="text"
                                id="feedback-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 form-input"
                                placeholder="e.g., Library Opening Hours"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="feedback-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Your Feedback
                            </label>
                            <textarea
                                id="feedback-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={6}
                                className="mt-1 form-input"
                                placeholder="Please provide details here..."
                                required
                            />
                        </div>
                        <div>
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="is-anonymous"
                                        type="checkbox"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                        className="focus:ring-[var(--color-primary)] h-4 w-4 text-[var(--color-primary)] border-slate-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="is-anonymous" className="font-medium text-slate-700 dark:text-slate-300">
                                        Submit Anonymously
                                    </label>
                                    <p className="text-slate-500 dark:text-slate-400">If checked, the administrator will not see your name.</p>
                                </div>
                            </div>
                            {!isAnonymous && (
                                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 text-yellow-700 dark:text-yellow-200">
                                    <p className="text-sm">Your identity will be visible to the administrator.</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn-primary"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
             <style>{`
                .form-input { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>
        </div>
    );
};
