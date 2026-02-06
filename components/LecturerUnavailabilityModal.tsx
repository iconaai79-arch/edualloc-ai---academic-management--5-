import React, { useState } from 'react';
import type { User, Unavailability } from '../types';
import { XIcon } from './icons/XIcon';

interface LecturerUnavailabilityModalProps {
  lecturer: User;
  onClose: () => void;
  onAdd: (lecturerId: string, unavailability: Omit<Unavailability, 'id' | 'status'>) => void;
  onUpdate: (lecturerId: string, unavailabilityId: string, data: Partial<Omit<Unavailability, 'id'>>) => void;
  onDelete: (lecturerId: string, unavailabilityId: string) => void;
}

export const LecturerUnavailabilityModal: React.FC<LecturerUnavailabilityModalProps> = ({ lecturer, onClose, onAdd, onUpdate, onDelete }) => {
  const [day, setDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'>('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert('Start time must be before end time.');
      return;
    }
    onAdd(lecturer.id, { day, startTime, endTime });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Unavailability</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">For {lecturer.name}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
              <XIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          
          <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Existing Time Off</h4>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                {(lecturer.unavailability && lecturer.unavailability.length > 0) ? (
                    lecturer.unavailability.map(u => (
                        <div key={u.id} className={`flex justify-between items-center p-2 rounded-md transition-colors ${u.status === 'inactive' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <p className={`text-sm ${u.status === 'inactive' ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                <span className="font-semibold">{u.day}:</span> {u.startTime} - {u.endTime}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onUpdate(lecturer.id, u.id, { status: u.status === 'active' ? 'inactive' : 'active' })}
                                    className={`px-2 py-1 text-xs font-semibold rounded-md ${
                                        u.status === 'active' 
                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900' 
                                        : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900'
                                    }`}
                                >
                                    {u.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete this unavailability for ${u.day} ${u.startTime} - ${u.endTime}?`)) {
                                        onDelete(lecturer.id, u.id);
                                    }
                                }} className="p-1 rounded-md text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500 italic">No unavailability periods defined.</p>
                )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Add New Unavailability</h4>
             <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="unavailability-day" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Day</label>
                    <select id="unavailability-day" value={day} onChange={e => setDay(e.target.value as any)} className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600">
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                        <option>Saturday</option>
                        <option>Sunday</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="unavailability-start" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Start Time</label>
                    <input type="time" id="unavailability-start" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                </div>
                 <div>
                    <label htmlFor="unavailability-end" className="block text-sm font-medium text-slate-700 dark:text-slate-300">End Time</label>
                    <input type="time" id="unavailability-end" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600" />
                </div>
            </div>
             <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:w-auto sm:text-sm"
                >
                  Add Time Off
                </button>
            </div>
          </form>
        </div>
         <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] sm:w-auto sm:text-sm"
            >
              Done
            </button>
        </div>
      </div>
    </div>
  );
};