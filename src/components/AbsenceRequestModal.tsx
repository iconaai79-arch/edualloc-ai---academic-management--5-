import React, { useState } from 'react';
import type { TimetableEntry, Subject } from '../types';

interface AbsenceRequestModalProps {
  timetableEntry: TimetableEntry;
  subject: Subject | undefined;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const AbsenceRequestModal: React.FC<AbsenceRequestModalProps> = ({ timetableEntry, subject, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
        alert("Please provide a reason for your absence.");
        return;
    }
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request Absence</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You are requesting absence for the following lesson:
            </p>
            <div className="mt-2 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{subject?.name} ({subject?.code})</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{timetableEntry.day}, {timetableEntry.startTime} - {timetableEntry.endTime}</p>
            </div>


            <div className="mt-4">
              <label htmlFor="absence_reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reason for Absence
              </label>
              <div className="mt-1">
                <textarea
                  id="absence_reason"
                  name="absence_reason"
                  rows={4}
                  className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a brief reason for your unavailability..."
                  required
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Submit Request
            </button>
            <button
              type="button"
              onClick={onClose}
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

