
import React, { useState } from 'react';
import type { Subject } from '../types';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';

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
    <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Section */}
        <div className="p-10 pb-6 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-rose-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-rose-200 dark:shadow-rose-900/40">
              <TrashIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Request Deallocation</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Assignment Management Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
            <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-10 pt-6 space-y-8">
            {/* Context Notice */}
            <div className="p-5 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex gap-4 items-start">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                <InformationCircleIcon className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-400 uppercase tracking-tight">Important Notice</p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-500/80 font-medium leading-relaxed mt-1">
                  You are formalizing a request to be unassigned from <span className="font-black underline">{subject.name} ({subject.code})</span>. This requires administrative verification.
                </p>
              </div>
            </div>

            {/* Justification Field */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                <ClipboardListIcon className="w-4 h-4 text-rose-500" />
                Justification (Optional)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain the necessity for this change in assignment..."
                rows={5}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Footer Section */}
          <div className="p-10 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex justify-end gap-4">
            <button 
                type="button"
                onClick={onClose}
                className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
                Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-grow px-10 py-4 rounded-2xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-700 active:scale-95 shadow-xl shadow-rose-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Deallocation Request'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .form-textarea { display: block; width: 100%; border-radius: 1.5rem; border: 1px solid #f1f5f9; padding: 1.25rem; background-color: #fff; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; resize: none; }
        .dark .form-textarea { border-color: #1e293b; background-color: #020617; color: #f1f5f9; }
        .form-textarea:focus { border-color: #e11d48; outline: none; box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.1); }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

