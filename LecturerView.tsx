
import React from 'react';
import type { 
    Subject, User, AllocationRequest, Department, Priority, 
    TimetableEntry, Room, AcademicYear, Semester, TimetableSettings, 
    Course, LetterheadConfig, AllocationRequestPreferences, UserTask, Institution 
} from './types.ts';
import { LecturerView as LecturerViewComponent } from './components/LecturerView.tsx';

export interface LecturerViewProps {
  user: User;
  users: User[];
  subjects: Subject[];
  departments: Department[];
  courses: Course[];
  rooms: Room[];
  requests: AllocationRequest[];
  allocations: AllocationRequest[];
  timeOffRequests: any[];
  // FIXED: Updated onSubmitRequest signature
  onSubmitRequest: (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: AllocationRequestPreferences | undefined, courseLevelSelections: Record<string, string[]>) => Promise<boolean>;
  onWithdrawRequest: (requestId: string) => void;
  onDeallocationRequest: (requestId: string, justification: string) => void;
  onAllocationChangeRequest: (requestId: string, justification: string, newPriority: Priority) => void;
  getSubjectById: (id: string) => Subject | undefined;
  getRoomById: (id: string) => any | undefined;
  getLecturerById: (id: string) => User | undefined;
  generatedTimetable: TimetableEntry[];
  allTimetableEntries: TimetableEntry[];
  activeAcademicYear?: AcademicYear | null;
  activeSemester?: Semester | null;
  academicYears: AcademicYear[];
  semesters: Semester[];
  timetableSettings: TimetableSettings;
  letterheadConfig: LetterheadConfig;
  // FIXED: Added missing footerImageUrl prop
  footerImageUrl: string | null;
  userTasks: UserTask[];
  onAddTask: (data: { title: string; dueDate?: string; }) => void;
  onUpdateTask: (taskId: string, isComplete: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  currentInstitution?: Institution | null;
  onShareLesson?: (entryId: string, teacherId: string | null) => void;
}

export const LecturerView: React.FC<LecturerViewProps> = (props) => {
    return <LecturerViewComponent {...(props as any)} />;
};

export default LecturerView;
