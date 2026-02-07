
import React, { useState, useCallback } from 'react';
import type { Subject, User, AllocationRequest, Priority } from '../types';
import { generateJustification } from '../services/geminiService';
import { SparklesIcon, XIcon, CheckCircleIcon, PaperAirplaneIcon, ArrowPathIcon } from './icons/index';

interface ChangeRequestModalProps {
  allocation: AllocationRequest;
  subject: Subject;
  user: User;
  onClose: () => void;
  onSubmit: (requestId: string, justification: string, newPriority: Priority) => Promise<any> | void;
}

export const ChangeRequestModal: React.FC<ChangeRequestModalProps> = ({ allocation, subject, user, onClose, onSubmit }) => {
  const [justification, setJustification] = useState(allocation.justification || '');
  const [priority, setPriority] = useState<Priority>(allocation.priority || 'Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const generatedText = await generateJustification(user, subject);
      setJustification(generatedText);
    } catch (error) {
      console.error("Error generating justification:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [user, subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert("Please provide a justification for the change.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(allocation.id, justification, priority);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-700 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Allocation Adjustment</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Request a curriculum load modification</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{subject.name}</p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{subject.code} • Currently Assigned</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Proposed Load Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'High'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${priority === p ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white dark:bg-slate-700 text-slate-400 border-slate-100 dark:border-slate-600 hover:border-indigo-200'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2 ml-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Reason for modification</label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || isSubmitting}
                className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:underline disabled:opacity-50"
              >
                <SparklesIcon className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Analyzing...' : 'Draft with AI'}
              </button>
            </div>
            <textarea
              value={justification}
              onChange={e => setJustification(e.target.value)}
              rows={4}
              className="form-input w-full resize-none p-4"
              placeholder="Explain why you wish to adjust this allocation..."
              required
            />
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
              {isSubmitting ? 'Submitting...' : 'Submit Modification Request'}
            </button>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 py-2">Discard & Keep Current Load</button>
          </div>
        </form>
      </div>
      <style>{`
        .form-input { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
        .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
      `}</style>
    </div>
  );
};
