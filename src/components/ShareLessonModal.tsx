import React, { useState } from 'react';
import type { TimetableEntry, User, Subject, Room } from '../types';
import { XIcon } from './icons/XIcon';


interface ShareLessonModalProps {
  lesson: TimetableEntry;
  practiceTeachers: User[];
  getSubjectById: (id: string) => Subject | undefined;
  getRoomById: (id: string) => Room | undefined;
  onClose: () => void;
  onShare: (entryId: string, teacherId: string | null) => void;
}

export const ShareLessonModal: React.FC<ShareLessonModalProps> = ({
  lesson,
  practiceTeachers,
  getSubjectById,
  getRoomById,
  onClose,
  onShare,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(lesson.sharedWithPracticeTeacherId || '');
  const subject = getSubjectById(lesson.subjectId);
  const room = getRoomById(lesson.roomId);
  const currentlySharedWith = practiceTeachers.find(p => p.id === lesson.sharedWithPracticeTeacherId);

  const handleShare = () => {
    if (selectedTeacherId) {
      onShare(lesson.id, selectedTeacherId);
      onClose();
    } else {
      alert('Please select a practice teacher.');
    }
  };

  const handleUnshare = () => {
    onShare(lesson.id, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Share Lesson</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Share <span className="font-semibold">{subject?.name}</span> ({lesson.day}, {lesson.startTime}) with a practice teacher.
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
              <XIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="mt-4">
            <label htmlFor="teacher-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Practice Teacher
            </label>
            <select
              id="teacher-select"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600"
            >
              <option value="">-- Select a Teacher --</option>
              {practiceTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          
          {currentlySharedWith && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-md text-sm text-blue-800 dark:text-blue-200">
              This lesson is currently shared with <span className="font-semibold">{currentlySharedWith.name}</span>.
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex justify-between">
          <div>
            {lesson.sharedWithPracticeTeacherId && (
              <button
                type="button"
                onClick={handleUnshare}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:w-auto sm:text-sm"
              >
                Un-share Lesson
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={!selectedTeacherId || selectedTeacherId === lesson.sharedWithPracticeTeacherId}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {lesson.sharedWithPracticeTeacherId ? 'Update Share' : 'Share Lesson'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
