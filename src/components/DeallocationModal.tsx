
import React, { useState } from 'react';
import type { Subject } from '../types';
import { ArrowPathIcon } from './icons/index';

interface DeallocationModalProps {
  subject: Subject;
  onClose: () => void;
  onSubmit: (justification: string) => Promise<any> | void;
}

export const DeallocationModal: React.FC<DeallocationModalProps> = ({ subject, onClose, onSubmit }) => {
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(justification);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request De-allocation</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You are requesting to be de-allocated from: <span className="font-semibold">{subject.name} ({subject.code})</span>.
            </p>

            <div className="mt-4">
              <label htmlFor="deallocation_justification" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reason for De-allocation <span className="text-xs text-slate-400">(Optional)</span>
              </label>
              <div className="mt-1">
                <textarea
                  id="deallocation_justification"
                  name="deallocation_justification"
                  rows={4}
                  className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why you need to be de-allocated from this subject..."
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting && <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Processing...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
