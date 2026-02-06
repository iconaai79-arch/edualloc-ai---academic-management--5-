import React from 'react';
import type { User, Course, StudentAttendance, TimetableEntry, Subject, Room, Building, TimetableSettings } from '../types';
import { UserIcon } from './icons';

interface ParentViewProps {
    user: User;
    users: User[];
    courses: Course[];
    studentAttendances: StudentAttendance[];
    generatedTimetable: TimetableEntry[];
    subjects: Subject[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    timetableSettings: TimetableSettings;
    buildings: Building[];
}

const ChildCard: React.FC<{ child: User, course?: Course, attendances: StudentAttendance[], timetable: TimetableEntry[], subjects: Subject[] }> = ({ child, course, attendances, timetable, subjects }) => {
    const childAttendances = attendances.filter(a => a.studentId === child.id);
    const totalLessons = timetable.filter(t => child.enrolledSubjectIds?.includes(t.subjectId)).length;
    const presentCount = childAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendanceRate = totalLessons > 0 ? (presentCount / totalLessons) * 100 : 100;
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                    <h4 className="font-bold text-xl text-slate-900 dark:text-white">{child.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{course?.name || 'N/A'}</p>
                </div>
            </div>
            <div className="mt-6">
                <h5 className="text-sm font-semibold mb-2">Academic Summary</h5>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <p className="text-xs text-slate-500">Enrolled Subjects</p>
                        <p className="text-2xl font-bold">{child.enrolledSubjectIds?.length || 0}</p>
                    </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <p className="text-xs text-slate-500">Attendance Rate (Weekly)</p>
                        <p className={`text-2xl font-bold ${attendanceRate >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{attendanceRate.toFixed(0)}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ParentView: React.FC<ParentViewProps> = ({ user, users, courses, studentAttendances, generatedTimetable, subjects }) => {
    const children = users.filter(u => user.studentIds?.includes(u.id));

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Parent Dashboard</h2>
            <div>
                <h3 className="text-xl font-semibold mb-4">My Children ({children.length})</h3>
                {children.length > 0 ? (
                    <div className="space-y-6">
                        {children.map(child => {
                            const course = courses.find(c => c.id === child.courseId);
                            return (
                                <ChildCard 
                                    key={child.id} 
                                    child={child} 
                                    course={course} 
                                    attendances={studentAttendances}
                                    timetable={generatedTimetable}
                                    subjects={subjects}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-slate-500 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">No children linked to this account.</p>
                )}
            </div>
        </div>
    );
};
