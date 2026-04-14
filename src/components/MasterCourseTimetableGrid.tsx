
import React, { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, User, Room, Course, TimetableSettings, AcademicYear, Semester, Institution, CourseLevel, Conflict } from '../types';
import { generatePastelColor } from '../utils/colorUtils';
import { timeToMinutes, generatePeriodLabels } from '../utils/timeUtils';
import { getInitials } from '../utils/stringUtils';
import { RectangleStackIcon } from './icons/RectangleStackIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { isSchoolInstitution } from '../utils/roleUtils';


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
    timetableConflicts?: Conflict[];
    layoutMode: 'horizontal' | 'vertical';
    onLayoutModeChange: (mode: 'horizontal' | 'vertical') => void;
}

export const MasterCourseTimetableGrid: React.FC<MasterCourseTimetableGridProps> = ({
    entries: generatedTimetable,
    courses,
    subjects,
    lecturers,
    rooms,
    timetableSettings,
    selectedCourseId,
    currentInstitution,
    getSubjectById,
    getLecturerById,
    getRoomById,
    timetableConflicts,
    layoutMode,
    onLayoutModeChange
}) => {
    const isSchool = isSchoolInstitution(currentInstitution);
    // const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal'); // LIFTED TO PARENT
    const daysOfWeek = timetableSettings.operatingDays;
    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings, true), [timetableSettings]); // ENABLE BREAKS
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;

    const relevantCourses = useMemo(() => {
        if (selectedCourseId && selectedCourseId !== 'all') {
            return courses.filter(c => c.id === selectedCourseId);
        }
        return courses;
    }, [courses, selectedCourseId]);

    const workloadData = useMemo(() => {
        return relevantCourses.map(course => {
            const courseSubjects = subjects.filter(s => s && (course.levels || []).some(l => l && (l.subjectIds || []).includes(s.id)));
            const subjectCount = courseSubjects.length;
            const totalPeriods = courseSubjects.reduce((sum, s) => {
                const structurePeriods = s.lessonStructure?.reduce((pSum, ls) => pSum + (ls.count * ls.periods), 0) || 0;
                return sum + structurePeriods;
            }, 0);
            const totalHours = (totalPeriods * timetableSettings.periodLengthMinutes) / 60;
            return {
                name: course.name,
                subjectCount,
                totalPeriods,
                totalHours,
            };
        });
    }, [relevantCourses, subjects, timetableSettings.periodLengthMinutes]);

    const overallTotals = useMemo(() => {
        return workloadData.reduce((acc, curr) => {
            acc.subjectCount += curr.subjectCount;
            acc.totalPeriods += curr.totalPeriods;
            acc.totalHours += curr.totalHours;
            return acc;
        }, { subjectCount: 0, totalPeriods: 0, totalHours: 0 });
    }, [workloadData]);

    const getCellEntries = (level: CourseLevel, day: string, period: any) => {
        if (!level) return [];
        return generatedTimetable.filter(e =>
            e && e.day === day &&
            (level.subjectIds || []).includes(e.subjectId) &&
            timeToMinutes(e.startTime) === timeToMinutes(period.startTime)
        );
    };

    const renderHorizontalLayout = () => (
        <div className="space-y-12 animate-fade-in no-break">
            {relevantCourses.map((course) => {
                const courseEntries = generatedTimetable.filter(e =>
                    e && (course.levels || []).some(l => l && (l.subjectIds || []).includes(e.subjectId))
                );

                return (
                    <div key={course.id} className="space-y-4 break-inside-avoid">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-r-2xl">
                            <RectangleStackIcon className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                {course.name} ({course.code})
                            </h3>
                        </div>

                        <div className="overflow-x-auto shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/80 dark:bg-slate-950/50">
                                        <th className="p-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-r border-slate-200 dark:border-slate-800 w-24">Class / Time</th>
                                        {periodHeaders.map((p, i) => (
                                            <th key={i} colSpan={p.colSpan} className={`p-2 text-center text-[10px] font-black uppercase tracking-widest border-l border-slate-200/50 dark:border-slate-800/50 ${p.isBreak ? 'text-slate-400 bg-slate-50/50' : 'text-slate-500'}`}>
                                                {p.label}
                                                <span className="block font-mono text-[8px] opacity-60 mt-1">{p.startTime} - {p.endTime}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                                    {daysOfWeek.map(day => {
                                        const occupiedSlots = new Set<string>();
                                        return (
                                            <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="p-3 bg-slate-50/30 dark:bg-slate-950/20 border-r border-slate-100 dark:border-slate-800">
                                                    <div className="text-[10px] font-black text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-widest leading-none rotate-0">
                                                        {day.substring(0, 3)}
                                                    </div>
                                                </td>
                                                {periodHeaders.map((period, periodIndex) => {
                                                    const slotKey = `${day}-${period.startTime}`;
                                                    if (occupiedSlots.has(period.startTime)) return null;

                                                    const slotEntries = (courseEntries || []).filter(e =>
                                                        e.day === day &&
                                                        timeToMinutes(e.startTime) === timeToMinutes(period.startTime)
                                                    );

                                                    if (period.isBreak) {
                                                        // Mark all spanned slots as occupied
                                                        for (let k = 0; k < period.colSpan; k++) {
                                                            const nextPeriod = periodHeaders[periodIndex + k];
                                                            if (nextPeriod) occupiedSlots.add(nextPeriod.startTime);
                                                        }
                                                        return (
                                                            <td key={slotKey} colSpan={period.colSpan} className="p-1 border border-slate-100 dark:border-slate-800 text-center align-middle bg-slate-50/50 dark:bg-slate-900/30 print:bg-gray-50">
                                                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest select-none block mx-auto" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>BREAK</span>
                                                            </td>
                                                        );
                                                    }

                                                    if (slotEntries.length > 0) {
                                                        const primaryEntry = slotEntries[0];
                                                        const duration = timeToMinutes(primaryEntry.endTime) - timeToMinutes(primaryEntry.startTime);
                                                        const colSpan = Math.max(1, Math.round(duration / cellSpanMinutes));

                                                        // Mark occupied slots
                                                        for (let k = 0; k < colSpan; k++) {
                                                            const nextPeriod = periodHeaders[periodIndex + k];
                                                            if (nextPeriod) occupiedSlots.add(nextPeriod.startTime);
                                                        }

                                                        // In horizontal layout, slotEntries contains ALL entries for ALL levels of this course in this slot.
                                                        // To determine if a specific group (Level) has a "BLOCK", we'd need to group by level.
                                                        // However, the horizontal layout is already an aggregate view. 
                                                        // If multiple subjects appear in the same slot for the same course, 
                                                        // they should arguably be shown individually if they belong to different classes, 
                                                        // UNLESS they are concurrent for the same class.
                                                        // Existing code iterates over `slotEntries.map`.
                                                        // Let's refine this: if ANY level has > 1 subject in this slot, we might want to flag it.
                                                        // But the UI here is a "Course Map". 
                                                        // If we want to satisfy "BLOCK PATHWAY SUBJECTS SHOULD DISPLAY AS BLOCK", 
                                                        // we should probably check if there are multiple entries for the SAME level.

                                                        return (
                                                            <td key={slotKey} colSpan={colSpan} className="p-1 border border-slate-100 dark:border-slate-800 text-center align-middle">
                                                                <div className="flex h-full gap-1">
                                                                    {/* Group by Level ID locally or just check if we should 'BLOCK'ify individual items */}
                                                                    {(() => {
                                                                        // Count entries per level
                                                                        const levelCounts: Record<string, number> = {};
                                                                        slotEntries.forEach(e => {
                                                                            if (!e) return;
                                                                            // Find which level this entry belongs to (it might belong to multiple subjectIds in different levels)
                                                                            (course.levels || []).forEach(l => {
                                                                                if (l && (l.subjectIds || []).includes(e.subjectId)) {
                                                                                    levelCounts[l.id] = (levelCounts[l.id] || 0) + 1;
                                                                                }
                                                                            });
                                                                        });

                                                                        // If any level has > 1 entries, we show BLOCK for those entries?
                                                                        // This gets complex in the aggregate view. 
                                                                        // Let's stick to the simplest interpretation: if there are multiple entries for the same slot in this aggregate view, 
                                                                        // we render them as before, BUT if they belong to a block (multiple entries per level), we could label them.

                                                                        // Actually, if the user sees "Maths, English" for Level 1 in the same cell, that's what they want to see as "BLOCK".

                                                                        return slotEntries.map((entry, idx) => {
                                                                            if (!entry) return null;
                                                                            const levelEntryCount = (course.levels || []).find(l => l && (l.subjectIds || []).includes(entry.subjectId)) ?
                                                                                (course.levels || []).filter(l => l && (l.subjectIds || []).includes(entry.subjectId))
                                                                                    .reduce((max, l) => Math.max(max, levelCounts[l.id] || 0), 0) : 0;

                                                                            const isBlockPart = levelEntryCount > 1;
                                                                            const subject = getSubjectById(entry.subjectId);
                                                                            const lecturer = getLecturerById(entry.lecturerId);
                                                                            const room = getRoomById(entry.roomId);
                                                                            const isConflicting = timetableConflicts?.some(c =>
                                                                                c.type === 'consecutive_subject' &&
                                                                                c.day === day &&
                                                                                c.conflictingEntries.some(ce => ce.id === entry.id)
                                                                            );

                                                                            if (isBlockPart && idx === slotEntries.findIndex(e => e && (course.levels || []).some(l => l && (l.subjectIds || []).includes(e.subjectId) && (l.subjectIds || []).includes(entry.subjectId)))) {
                                                                                // Only show BLOCK once per level group if needed?
                                                                                // This is getting messy. Let's just follow the vertical layout pattern:
                                                                                // If entries.length > 1 for the SAME group, it's a block.
                                                                            }

                                                                            return (
                                                                                <div key={entry.id} className={`flex-1 rounded-xl p-2 shadow-sm border ${isConflicting ? 'border-red-500 ring-2 ring-red-200 animate-pulse' : 'border-black/5'}`} style={{ backgroundColor: generatePastelColor(entry.subjectId) }}>
                                                                                    <div className="text-[10px] leading-tight text-slate-900 dark:text-white font-black uppercase tracking-tighter flex items-center justify-center gap-1">
                                                                                        {isConflicting && <span title="Consecutive Lesson Violation" className="text-red-600">⚠️</span>}
                                                                                        <span className="block">{subject?.shortName || subject?.code}</span>
                                                                                    </div>
                                                                                    <div className="text-[9px] text-slate-600 font-bold mt-1 opacity-70">
                                                                                        <span className="block">{getInitials(lecturer?.name || '')} • {room?.shortName || room?.name}</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    return <td key={slotKey} className="border border-slate-100 dark:border-slate-800"></td>
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderVerticalLayout = () => (
        <div className="space-y-12 animate-fade-in">
            {relevantCourses.map(course => (
                <div key={course.id} className="space-y-8">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter border-b-4 border-indigo-600 pb-2 inline-block print:text-black print:border-black">
                        {course.name} ({course.code})
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block">
                        {(course.levels || []).map(level => {
                            if (!level) return null;
                            return (
                            <div key={level.id} className="bg-white dark:bg-slate-800 shadow-sm rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 print:shadow-none print:border-2 print:border-slate-200 print:mb-8 print:break-inside-avoid">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 print:bg-gray-50 print:py-2">
                                    <h4 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest print:text-black">
                                        {level.name}
                                    </h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 print:bg-gray-100">
                                                <th className="p-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest w-24">Day</th>
                                                {periodHeaders.map((p, i) => (
                                                    <th key={i} colSpan={p.colSpan} className="p-2 text-center text-[10px] font-black uppercase text-slate-400 border-l border-slate-200/50 dark:border-slate-700/50">
                                                        {p.label}
                                                        <span className="block font-mono text-[8px] opacity-60">{p.startTime} - {p.endTime}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {daysOfWeek.map(day => {
                                                const occupiedSlots = new Set<number>();
                                                return (
                                                    <tr key={day} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                                        <td className="p-3 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 print:bg-gray-50">{day}</td>
                                                        {periodHeaders.map((period, periodIndex) => {
                                                            if (occupiedSlots.has(periodIndex)) return null;

                                                            if (period.isBreak) {
                                                                // Mark all spanned slots as occupied
                                                                for (let k = 0; k < period.colSpan; k++) {
                                                                    occupiedSlots.add(periodIndex + k);
                                                                }
                                                                return (
                                                                    <td key={periodIndex} colSpan={period.colSpan} className="p-1 border-l border-slate-100 dark:border-slate-800 align-middle bg-slate-50/50 dark:bg-slate-900/40 text-center">
                                                                        <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block mx-auto" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>BREAK</span>
                                                                    </td>
                                                                );
                                                            }

                                                            const entries = getCellEntries(level, day, period);
                                                            if (entries && entries.length > 0) {
                                                                const primaryEntry = entries[0];
                                                                const subject = subjects.find(s => s.id === primaryEntry.subjectId);
                                                                const lecturer = lecturers.find(l => l.id === primaryEntry.lecturerId);
                                                                const room = rooms.find(r => r.id === primaryEntry.roomId);

                                                                const duration = timeToMinutes(primaryEntry.endTime) - timeToMinutes(primaryEntry.startTime);
                                                                const colSpan = Math.round(duration / cellSpanMinutes);

                                                                for (let k = 0; k < colSpan; k++) occupiedSlots.add(periodIndex + k);

                                                                return (
                                                                    <td key={periodIndex} colSpan={colSpan} className="p-1 border-l border-slate-100 dark:border-slate-800 align-middle text-center">
                                                                        <div className="flex h-full gap-1">
                                                                            {entries.map((entry) => {
                                                                                const s = subjects.find(sub => sub.id === entry.subjectId);
                                                                                const l = lecturers.find(lec => lec.id === entry.lecturerId);
                                                                                const r = rooms.find(rom => rom.id === entry.roomId);

                                                                                return (
                                                                                    <div key={entry.id} className="flex-1 rounded-xl p-2 text-center shadow-sm border border-black/5" style={{ backgroundColor: generatePastelColor(entry.subjectId) }}>
                                                                                        <p className="text-[10px] font-black text-slate-900 uppercase leading-none truncate">{s?.shortName || s?.code}</p>
                                                                                        <p className="text-[8px] font-bold text-slate-500 mt-1 truncate">{getInitials(l?.name || '')} • {r?.shortName || r?.name}</p>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            }
                                                            return <td key={periodIndex} className="p-1 border-l border-slate-100 dark:border-slate-800"></td>;
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center no-print">
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => onLayoutModeChange('horizontal')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${layoutMode === 'horizontal' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <RectangleStackIcon className="w-4 h-4" />
                        Grid Layout
                    </button>
                    <button
                        onClick={() => onLayoutModeChange('vertical')}
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
                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest print:text-black">{isSchoolInstitution(currentInstitution) ? 'Grade' : 'Course'}</th>
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
