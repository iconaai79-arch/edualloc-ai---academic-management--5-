import React, { useState } from 'react';
import type { User, Unavailability } from '../types';
import { XIcon } from './icons/XIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';

interface LecturerUnavailabilityModalProps {
  lecturer: User;
  onClose: () => void;
  onAdd: (lecturerId: string, unavailability: Omit<Unavailability, 'id' | 'status'>) => void;
  onUpdate: (lecturerId: string, unavailabilityId: string, data: Partial<Omit<Unavailability, 'id'>>) => void;
  onDelete: (lecturerId: string, unavailabilityId: string) => void;
}

export const LecturerUnavailabilityModal: React.FC<LecturerUnavailabilityModalProps> = ({ lecturer, onClose, onAdd, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
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
    setActiveTab('list');
  };

  const renderListTab = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
        <div className="flex justify-between items-center mb-6 pl-1">
          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Recorded Unavailability</h4>
          <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">{(lecturer.unavailability || []).length} Slots</span>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {(lecturer.unavailability && lecturer.unavailability.length > 0) ? (
            lecturer.unavailability.map(u => (
              <div key={u.id} className={`p-4 rounded-2xl flex justify-between items-center transition-all group ${u.status === 'inactive' ? 'bg-slate-100 dark:bg-slate-800/50 opacity-60' : 'bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800'}`}>
                <div className="flex gap-4 items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-tight ${u.status === 'inactive' ? 'bg-slate-200 dark:bg-slate-700 text-slate-400' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600'}`}>
                    {u.day.substring(0, 3)}
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${u.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                      {u.startTime} — {u.endTime}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.status === 'active' ? 'Active Restriction' : 'Dormant'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdate(lecturer.id, u.id, { status: u.status === 'active' ? 'inactive' : 'active' })}
                    className={`p-2 rounded-xl transition-all ${u.status === 'active'
                        ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 hover:bg-amber-600 hover:text-white'
                        : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                      }`}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete this unavailability?`)) {
                        onDelete(lecturer.id, u.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <CalendarDaysIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No restrictions logged</p>
              <button onClick={() => setActiveTab('add')} className="text-[10px] font-black uppercase text-indigo-600 mt-2 hover:underline">Add New Slot</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAddTab = () => (
    <div className="space-y-8 animate-fade-in-up">
      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
              Target Day
            </label>
            <select value={day} onChange={e => setDay(e.target.value as any)} className="form-select">
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
              <option>Saturday</option>
              <option>Sunday</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-indigo-500" />
                Start Time
              </label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-indigo-500" />
                End Time
              </label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="form-input" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-95 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> Add Time Off
        </button>
      </form>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>

        {/* Header Section */}
        <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
              <ClockIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Time Off Log</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Registry for {lecturer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
            <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-10 border-b border-slate-100 dark:border-slate-800 flex gap-8 bg-slate-50/30 dark:bg-slate-900/30">
          {(['list', 'add'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 pt-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'list' ? 'Existing Periods' : 'Add New Entry'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />
              )}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
          {activeTab === 'list' ? renderListTab() : renderAddTab()}
        </div>

        {/* Footer Section */}
        <div className="p-10 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95 shadow-xl"
          >
            Finalize Registry
          </button>
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
      `}</style>
    </div>
  );
};