
import React, { useState } from 'react';
import type { User, TimetableEntry, Subject, Room, TimetableSettings, ObservationNote, Course } from '../types';
import { TimetableGrid } from './TimetableGrid';
import { JoinedLessonsManager } from './JoinedLessonsManager';
import { DigitalCatalog } from './Library/DigitalCatalog';
import { BookOpenIcon } from './icons/BookOpenIcon';

interface PracticeTeacherViewProps {
  user: User;
  subjects: Subject[];
  courses: Course[];
  rooms: Room[];
  generatedTimetable: TimetableEntry[];
  getSubjectById: (id: string) => Subject | undefined;
  getRoomById: (id: string) => Room | undefined;
  getLecturerById: (id: string) => User | undefined;
  timetableSettings: TimetableSettings;
  observationNotes: ObservationNote[];
  onSaveObservationNote: (noteData: Omit<ObservationNote, 'id' | 'timestamp' | 'institutionId'>) => void;
  books: Book[];
}

export const PracticeTeacherView: React.FC<PracticeTeacherViewProps> = ({
  user,
  subjects,
  courses,
  rooms,
  generatedTimetable,
  getSubjectById,
  getRoomById,
  getLecturerById,
  timetableSettings,
  observationNotes,
  onSaveObservationNote,
  books,
}) => {
  const [activeTab, setActiveTab] = useState('timetable');

  const myTimetable = generatedTimetable.filter(
    (entry) => entry.sharedWithPracticeTeacherId === user.id
  );

  const renderPracticeTeacherCellFooter = (entry: TimetableEntry) => {
    const mainLecturer = getLecturerById(entry.lecturerId);
    return (
      <p className="text-xs mt-1 text-teal-700 dark:text-teal-300 font-semibold">
        Main Lecturer: {mainLecturer?.name || '...'}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Practice Teacher Dashboard</h2>

      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`${activeTab === 'timetable'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            My Timetable
          </button>
          <button
            onClick={() => setActiveTab('manager')}
            className={`${activeTab === 'manager'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Joined Lessons Manager
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`${activeTab === 'library'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Digital Library
          </button>
        </nav>
      </div>

      {activeTab === 'timetable' && (
        <div id="practiceteacher-timetable-section">
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            This is your timetable of lessons shared with you by other lecturers for your teaching practice.
          </p>
          <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg">
            <TimetableGrid
              entries={myTimetable}
              subjects={subjects}
              courses={courses}
              rooms={rooms}
              getSubjectById={getSubjectById}
              getRoomById={getRoomById}
              getLecturerById={getLecturerById}
              timetableSettings={timetableSettings}
              renderCellFooter={renderPracticeTeacherCellFooter}
            />
          </div>
        </div>
      )}

      {activeTab === 'manager' && (
        <JoinedLessonsManager
          user={user}
          joinedLessons={myTimetable}
          getSubjectById={getSubjectById}
          getLecturerById={getLecturerById}
          observationNotes={observationNotes}
          onSaveObservationNote={onSaveObservationNote}
        />
      )}

      {activeTab === 'library' && (
        <div className="animate-fade-in bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
           <div className="flex justify-between items-end mb-8">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Academic Resources</h3>
                    <p className="text-slate-500 font-medium text-sm">Browse the institutional repository for teaching aids and research materials.</p>
                </div>
            </div>
            <DigitalCatalog 
                books={books} 
                onReserve={async (id) => {
                    alert(`Reservation for asset ${id} queued for approval.`);
                }} 
            />
        </div>
      )}
    </div>
  );
};
