import React from 'react';
import type { TaAssignment, Subject, User, TimetableEntry, Room, TimetableSettings, Course } from '../types';
import { TimetableGrid } from './TimetableGrid';

interface TAAssignmentsViewProps {
  assignments: TaAssignment[];
  subjects: Subject[];
  users: User[];
  courses: Course[];
  rooms: Room[];
  timetable: TimetableEntry[];
  getSubjectById: (id: string) => Subject | undefined;
  getLecturerById: (id: string) => User | undefined;
  getRoomById: (id: string) => Room | undefined;
  timetableSettings: TimetableSettings;
}

export const TAAssignmentsView: React.FC<TAAssignmentsViewProps> = ({
  assignments,
  subjects,
  users,
  courses,
  rooms,
  timetable,
  getSubjectById,
  getLecturerById,
  getRoomById,
  timetableSettings
}) => {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight">TA Dashboard</h2>
      <p className="text-slate-500 dark:text-slate-400">
        You are a Teaching Assistant for the following subjects. This is a read-only view of their schedules.
      </p>

      {assignments.length > 0 ? (
        assignments.map(assignment => {
          const subject = getSubjectById(assignment.subjectId);
          const lecturer = getLecturerById(assignment.lecturerId);
          const subjectTimetable = timetable.filter(entry => entry.subjectId === assignment.subjectId);

          if (!subject) return null;

          return (
            <div key={assignment.id} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-2xl font-bold text-[var(--color-primary)]">{subject.name} ({subject.code})</h3>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                Primary Lecturer: {lecturer?.name || 'Unknown'}
              </p>

              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2">Weekly Schedule</h4>
                <TimetableGrid
                  entries={subjectTimetable}
                  subjects={subjects}
                  courses={courses}
                  rooms={rooms}
                  getSubjectById={getSubjectById}
                  getLecturerById={getLecturerById}
                  getRoomById={getRoomById}
                  timetableSettings={timetableSettings}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
          <p className="text-slate-500 dark:text-slate-400">You have not been assigned as a TA for any subjects.</p>
        </div>
      )}
    </div>
  );
};

