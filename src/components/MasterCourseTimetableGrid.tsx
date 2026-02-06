
import React, { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, User, Room, Course, TimetableSettings, AcademicYear, Semester, Institution, CourseLevel } from '../types';
import { generatePastelColor } from '../utils/colorUtils';
import { timeToMinutes, generatePeriodLabels } from '../utils/timeUtils';
import { getInitials } from '../utils/stringUtils';
import { RectangleStackIcon, ArrowsRightLeftIcon } from './icons';
import { TimetableGrid } from './TimetableGrid.tsx';

interface MasterCourseTimetableGridProps {
    entries: TimetableEntry[];
    courses: Course[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    timetableSettings: TimetableSettings;
    selectedCourseId?: string; // Optional: for highlighting or filtering
    academicYears: AcademicYear[];
    activeSemester: Semester | null;
    isSchool?: boolean;
    currentInstitution?: Institution | null;
}

export const MasterCourseTimetableGrid: React.FC<MasterCourseTimetableGridProps> = ({
    entries: generatedTimetable,
    courses,
    subjects,
    lecturers,
    rooms,
    timetableSettings,
    selectedCourseId,
    isSchool,
    currentInstitution,
    getSubjectById,
    getLecturerById,
    getRoomById
}) => {
    const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');
    const daysOfWeek = timetableSettings.operatingDays || [];
    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings), [timetableSettings]);
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;

    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    const safeTimetable = Array.isArray(generatedTimetable) ? generatedTimetable : [];

    const relevantCourses = useMemo(() => {
        if (selectedCourseId && selectedCourseId !== 'all') {
            return safeCourses.filter(c => c && c.id === selectedCourseId);
        }
        return safeCourses.filter(c => c);
    }, [safeCourses, selectedCourseId]);

    const workloadData = useMemo(() => {
        return relevantCourses.map(course => {
            const courseSubjects = safeSubjects.filter(s => s && (course.levels || []).some(l => l && (l.subjectIds || []).includes(s.id)));
            const subjectCount = courseSubjects.length;
            const totalPeriods = courseSubjects.reduce((sum, s) => {
                const structurePeriods = s.lessonStructure?.reduce((pSum, ls) => pSum + (ls.count * ls.periods), 0) || 0;
                return sum + structurePeriods;
            }, 0);
            const totalHours = (totalPeriods * (timetableSettings.periodLengthMinutes || 40)) / 60;
            return {
                name: course.name,
                subjectCount,
                totalPeriods,
                totalHours,
            };
        });
    }, [relevantCourses, safeSubjects, timetableSettings]);

    const overallTotals = useMemo(() => {
        return workloadData.reduce((acc, curr) => {
            acc.subjectCount += curr.subjectCount;
            acc.totalPeriods += curr.totalPeriods;
            acc.totalHours += curr.totalHours;
            return acc;
        }, { subjectCount: 0, totalPeriods: 0, totalHours: 0 });
    }, [workloadData]);

    const getCellEntry = (level: CourseLevel, day: string, period: { startTime: string; endTime: string; }) => {
        const periodStartMinutes = timeToMinutes(period.startTime);
        
        const entry = safeTimetable.find(e => 
            e && e.day === day &&
            (level.subjectIds || []).includes(e.subjectId) &&
            timeToMinutes(e.startTime) === periodStartMinutes
        );
        return entry;
    };

    const renderHorizontalLayout = () => (
        <div className="space-y-8 animate-fade-in">
            {relevantCourses.map(course => {
                const profile = (currentInstitution?.scheduleProfiles || []).find(p => p && p.id === course.scheduleProfileId);
                const safeLevels = Array.isArray(course.levels) ? course.levels : [];

                return (
                <div key={course.id} className="bg-white dark:bg-slate-800 shadow-sm rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 print:overflow-visible print:shadow-none print:border-none print:break-inside-avoid">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 print:bg-transparent print:p-0 print:mb-2">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter print:text-black">
                            {course.name} ({course.code})
                            {profile && <span className="ml-2 text-sm text-indigo-600">[{profile.name}]</span>}
                        </h3>
                    </div>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="min-w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 print:bg-gray-100">
                                    <th className="p-4 border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 print:static print:bg-transparent print:text-black font-black uppercase text-[10px] tracking-widest text-slate-500" rowSpan={2}>
                                        {isSchool ? 'Stream' : 'Level'}
                                    </th>
                                    {daysOfWeek.map(day => (
                                        <th key={day} colSpan={periodHeaders.length} className="p-2 border border-slate-200 dark:border-slate-600 font-black text-[10px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 print:text-black">{day}</th>
                                    ))}
                                </tr>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 print:bg-gray-50">
                                    {daysOfWeek.map(day => periodHeaders.map(period => (
                                        <th key={`${day}-${period.label}`} className="p-1 border border-slate-200 dark:border-slate-600 font-bold text-[9px] text-slate-400 dark:text-slate-500 print:text-black uppercase">
                                            <span className="block">{period.label}</span>
                                            <span className="block font-mono opacity-60">{period.startTime}</span>
                                        </th>
                                    )))}
                                </tr>
                            </thead>
                            <tbody>
                                {safeLevels.map(level => {
                                    if (!level) return null;
                                    const occupiedSlots = new Set<string>(); // "day-periodIndex"
                                    return (
                                        <tr key={level.id} className="border-t border-slate-200 dark:border-slate-600">
                                            <td className="p-4 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 z-10 print:static print:bg-transparent print:text-black">{level.name}</td>
                                            {daysOfWeek.flatMap(day => periodHeaders.map((period, periodIndex) => {
                                                const slotKey = `${day}-${periodIndex}`;
                                                if (occupiedSlots.has(slotKey)) return null;

                                                const entry = getCellEntry(level, day, period);
                                                if (entry) {
                                                    const subject = getSubjectById(entry.subjectId);
                                                    const lecturer = getLecturerById(entry.lecturerId);
                                                    const room = getRoomById(entry.roomId);
                                                    
                                                    const duration = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
                                                    const colSpan = Math.round(duration / cellSpanMinutes);

                                                    for(let k=0; k<colSpan; k++) {
                                                        occupiedSlots.add(`${day}-${periodIndex + k}`);
                                                    }

                                                    return (
                                                        <td key={slotKey} colSpan={colSpan} className="p-1 border border-slate-200 dark:border-slate-600 text-center align-middle print:border-slate-400">
                                                            <div className="rounded-xl p-2 shadow-sm border border-black/5" style={{backgroundColor: generatePastelColor(entry.subjectId)}}>
                                                                <div className="text-[10px] leading-tight text-slate-900 font-black uppercase tracking-tighter">
                                                                    <span className="block">{subject?.shortName || subject?.code}</span>
                                                                </div>
                                                                <div className="text-[9px] text-slate-600 font-bold mt-1 opacity-70">
                                                                    <span className="block">{getInitials(lecturer?.name || '')} • {room?.shortName || room?.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                return <td key={slotKey} className="border border-slate-100 dark:border-slate-700 print:border-slate-300"></td>
                                            }))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )})}
        </div>
    );

    const renderVerticalLayout = () => (
        <div className="space-y-12 animate-fade-in">
            {relevantCourses.map(course => {
                const profile = (currentInstitution?.scheduleProfiles || []).find(p => p && p.id === course.scheduleProfileId);
                const safeLevels = Array.isArray(course.levels) ? course.levels : [];
                
                const courseEntries = safeTimetable.filter(e => {
                    if (!e) return false;
                    return safeLevels.some(l => l && (l.subjectIds || []).includes(e.subjectId));
                });

                return (
                <div key={course.id} className="space-y-8">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter border-b-4 border-indigo-600 pb-2 inline-block print:text-black print:border-black">
                        {course.name} ({course.code})
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
                        {safeLevels.map(level => {
                             if (!level) return null;
                             const levelEntries = courseEntries.filter(e => e && (level.subjectIds || []).includes(e.subjectId));

                             return (
                                <div key={level.id} className="bg-white dark:bg-slate-800 shadow-sm rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 print:shadow-none print:border-2 print:border-slate-200 print:mb-8 print:break-inside-avoid">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 print:bg-gray-50 print:py-2">
                                        <h4 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest print:text-black">
                                            {level.name}
                                        </h4>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-inner">
                                        <TimetableGrid 
                                            entries={levelEntries}
                                            getSubjectById={getSubjectById}
                                            getLecturerById={getLecturerById}
                                            getRoomById={getRoomById}
                                            timetableSettings={timetableSettings}
                                            scheduleProfile={profile}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )})}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center no-print">
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={() => setLayoutMode('horizontal')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${layoutMode === 'horizontal' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <RectangleStackIcon className="w-4 h-4" />
                        Grid Layout
                    </button>
                    <button 
                        onClick={() => setLayoutMode('vertical')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${layoutMode === 'vertical' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowsRightLeftIcon className="w-4 h-4 rotate-90" />
                        List Layout
                    </button>
                </div>
            </div>

            {layoutMode === 'horizontal' ? renderHorizontalLayout() : renderVerticalLayout()}

            {relevantCourses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center opacity-40">
                    <RectangleStackIcon className="w-16 h-16 text-slate-100 dark:text-slate-700 mb-4" />
                    <h4 className="text-lg font-black text-slate-300 uppercase tracking-[0.2em]">No Curriculum Data Matching Filters</h4>
                </div>
            )}
            
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 print:break-inside-avoid print:shadow-none print:border print:border-slate-300">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-6 print:text-black">Workload Utilisation Summary</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 print:bg-gray-100">
                            <tr>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest print:text-black">{isSchool ? 'Grade' : 'Course'}</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest print:text-black">Units Count</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest print:text-black">Contact Periods</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest print:text-black">Total Hours/wk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                            {workloadData.map((data, index) => (
                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                    <td className="px-8 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white print:text-black">{data.name}</td>
                                    <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 print:text-black">{data.subjectCount}</td>
                                    <td className="px-8 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 print:text-black">{data.totalPeriods}</td>
                                    <td className="px-8 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 dark:text-indigo-400 print:text-black">{data.totalHours.toFixed(2)}h</td>
                                </tr>
                            ))}
                        </tbody>
                        {workloadData.length > 1 && (
                            <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold print:bg-gray-100">
                                <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                    <td className="px-8 py-4 text-sm uppercase tracking-widest print:text-black">Aggregate Total</td>
                                    <td className="px-8 py-4 text-sm print:text-black">{overallTotals.subjectCount}</td>
                                    <td className="px-8 py-4 text-sm print:text-black">{overallTotals.totalPeriods}</td>
                                    <td className="px-8 py-4 text-sm text-indigo-600 dark:text-indigo-400 print:text-black">{overallTotals.totalHours.toFixed(2)}h</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};
