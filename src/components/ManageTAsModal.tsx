import React, { useState, useMemo } from 'react';
import type { User, Subject, AllocationRequest, TaAssignment } from '../types';
import { XIcon } from './icons/XIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';

interface ManageTAsModalProps {
  allocation: AllocationRequest;
  subject?: Subject;
  allUsers: User[];
  taAssignments: TaAssignment[];
  onClose: () => void;
  onSave: (subjectId: string, lecturerId: string, newTaIds: string[]) => void;
}

export const ManageTAsModal: React.FC<ManageTAsModalProps> = ({
  allocation,
  subject,
  allUsers,
  taAssignments,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'recruit'>('team');

  const currentTaAssignments = useMemo(() =>
    taAssignments.filter(a =>
      a.subjectId === allocation.subjectId &&
      a.academicYearId === allocation.academicYearId &&
      a.semesterId === allocation.semesterId
    ),
    [taAssignments, allocation]
  );

  const [currentTaIds, setCurrentTaIds] = useState<string[]>(() => currentTaAssignments.map(a => a.taId));
  const [newTaId, setNewTaId] = useState<string>('');

  const currentTAs = useMemo(() =>
    allUsers.filter(u => currentTaIds.includes(u.id)),
    [allUsers, currentTaIds]);

  const availableUsers = useMemo(() =>
    allUsers.filter(u =>
      (u.role === 'practice_teacher' || u.role === 'student') &&
      u.id !== allocation.lecturerId &&
      !currentTaIds.includes(u.id)
    ),
    [allUsers, allocation.lecturerId, currentTaIds]);

  const handleAddTa = () => {
    if (newTaId && !currentTaIds.includes(newTaId)) {
      setCurrentTaIds(prev => [...prev, newTaId]);
      setNewTaId('');
      setActiveTab('team');
    }
  };

  const handleRemoveTa = (taId: string) => {
    setCurrentTaIds(prev => prev.filter(id => id !== taId));
  };

  const handleSaveChanges = () => {
    onSave(allocation.subjectId, allocation.lecturerId, currentTaIds);
    onClose();
  };

  const renderTeamTab = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-3">
        {currentTAs.length > 0 ? (
          currentTAs.map(ta => (
            <div key={ta.id} className="flex justify-between items-center p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-100 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs">
                  {ta.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{ta.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{ta.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveTa(ta.id)}
                className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12 p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
            <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No assistants assigned</p>
            <button
              onClick={() => setActiveTab('recruit')}
              className="mt-6 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-all"
            >
              Recruit New TA
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecruitTab = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="p-10 bg-slate-50 dark:bg-slate-950 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-inner">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center">
            <UserPlusIcon className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">Resource Pool</h5>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">Select a qualified candidate</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <select
              value={newTaId}
              onChange={e => setNewTaId(e.target.value)}
              className="form-select pl-4"
            >
              <option value="" disabled>Select a Student or Practice Teacher</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  [{u.role.replace('_', ' ')}] {u.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddTa}
            disabled={!newTaId}
            className="w-full py-5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] shadow-xl shadow-emerald-100 dark:shadow-none transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            Confirm Appointment <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 flex gap-4">
        <SparklesIcon className="w-5 h-5 text-indigo-600 mt-1" />
        <p className="text-[11px] font-medium text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
          Appointed Teaching Assistants will gain access to unit materials and attendance records for the duration of this semester.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>

        {/* Header Section */}
        <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
              <UserGroupIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Teaching Assistants</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {subject?.name || 'Unit Assignment'} portal
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
            <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-10 border-b border-slate-100 dark:border-slate-800 flex gap-8">
          {(['team', 'recruit'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-4 pt-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab === 'team' ? 'Active Team' : 'Recruit New'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />
              )}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-grow bg-slate-50/20 dark:bg-slate-900/20">
          {activeTab === 'team' ? renderTeamTab() : renderRecruitTab()}
        </div>

        {/* Footer Section */}
        <div className="p-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
          <button
            onClick={onClose}
            className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95 shadow-xl flex items-center justify-center gap-2"
          >
            Save Assignment Changes <CheckCircleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        .form-select { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #f1f5f9; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; outline: none; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
        .dark .form-select { border-color: #1e293b; background-color: #020617; color: #f1f5f9; }
        .form-select:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};