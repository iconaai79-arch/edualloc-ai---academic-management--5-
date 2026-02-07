import React, { useState, useMemo } from 'react';
import type { User, Subject, AllocationRequest, TaAssignment } from '../types';
import { XIcon, UserGroupIcon } from './icons';

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
    }
  };
  
  const handleRemoveTa = (taId: string) => {
    setCurrentTaIds(prev => prev.filter(id => id !== taId));
  };
  
  const handleSaveChanges = () => {
    onSave(allocation.subjectId, allocation.lecturerId, currentTaIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserGroupIcon className="w-6 h-6 text-[var(--color-primary)]" />
                Manage Teaching Assistants
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                For {subject?.name} ({subject?.code})
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
              <XIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Current TAs ({currentTAs.length})</h4>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
              {currentTAs.length > 0 ? (
                currentTAs.map(ta => (
                  <div key={ta.id} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                    <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{ta.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{ta.email}</p>
                    </div>
                    <button onClick={() => handleRemoveTa(ta.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No teaching assistants assigned to this subject.</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Add New TA</h4>
            <div className="mt-2 flex items-center gap-2">
                <select 
                    value={newTaId} 
                    onChange={e => setNewTaId(e.target.value)}
                    className="form-select flex-grow"
                >
                    <option value="" disabled>Select a Student or Practice Teacher to add as TA</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <button onClick={handleAddTa} className="btn-secondary" disabled={!newTaId}>Add</button>
            </div>
          </div>

        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse">
          <button onClick={handleSaveChanges} className="btn-primary">Save Changes</button>
          <button onClick={onClose} className="btn-secondary mr-3">Cancel</button>
        </div>
      </div>
      <style>{`
        .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 2.5rem 0.5rem 0.75rem; background-color: white; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
        .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
        .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
        .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
        .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
      `}</style>
    </div>
  );
};