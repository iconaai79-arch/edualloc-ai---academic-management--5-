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
    selectedCourseId?: string;
    selectedLevelId?: string;
    academicYears: AcademicYear[];
    activeSemester: Semester | null;
    isSchool?: boolean;
    currentInstitution?: Institution | null;
    timetableConflicts?: Conflict[];
    layoutMode: 'horizontal' | 'vertical' | 'weekly';
    onLayoutModeChange: (mode: 'horizontal' | 'vertical' | 'weekly') => void;
    selectedDay?: string;
    allocations?: AllocationRequest[];
    onMoveLesson?: (entryId: string, newDay: string, newStartTime: string) => void;
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
    onLayoutModeChange,
    selectedDay = 'Monday',
    selectedLevelId = 'all',
    allocations = [],
    onMoveLesson
}) => {
    const isSchool = isSchoolInstitution(currentInstitution);
    const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<{ levelId: string, day: string, startTime: string } | null>(null);

    const daysOfWeek = timetableSettings.operatingDays;
    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings, true), [timetableSettings]); 
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;

    const handleDragStart = (e: React.DragEvent, entry: TimetableEntry) => {
        if (!onMoveLesson) return;
        setDraggedEntryId(entry.id);
        e.dataTransfer.setData('text/plain', entry.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedEntryId(null);
        setHoveredSlot(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, levelId: string, day: string, startTime: string) => {
        if (!onMoveLesson) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (hoveredSlot?.day !== day || hoveredSlot?.startTime !== startTime || hoveredSlot?.levelId !== levelId) {
            setHoveredSlot({ levelId, day, startTime });
        }
    };

    const handleDrop = (e: React.DragEvent, levelId: string, day: string, startTime: string) => {
        if (!onMoveLesson) return;
        e.preventDefault();
        const entryId = e.dataTransfer.getData('text/plain');
        setHoveredSlot(null);
        if (entryId) {
            onMoveLesson(entryId, day, startTime);
        }
    };

    const relevantCourses = useMemo(() => {
        let list = courses || [];
        // Filter out courses that don't match the selected course ID
        if (selectedCourseId && selectedCourseId !== 'all') {
            list = list.filter(c => c && c.id === selectedCourseId);
        }
        
        // If a specific level is selected, filter to show only that level within its course
        if (selectedLevelId && selectedLevelId !== 'all') {
            list = list.map(course => ({
                ...course,
                levels: (course.levels || []).filter(l => l && String(l.id) === String(selectedLevelId))
            })).filter(course => (course.levels || []).length > 0);
        }
        
        // Return the full list without filtering by allocations to ensure visibility of all grades
        return list;
    }, [courses, selectedCourseId, selectedLevelId, allocations]);

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
        const lid = String(level.id);
        const isGeneral = lid.startsWith('gen_');
        const courseId = isGeneral ? lid.split('_')[1] : null;

        return generatedTimetable.filter(e => {
            if (!e || e.day !== day) return false;
            if (timeToMinutes(e.startTime) !== timeToMinutes(period.startTime)) return false;

            if (isGeneral) {
                const eCourseId = String(e.courseId || (e as any).course_id || '');
                return eCourseId === courseId;
            }

            return (String(e.courseLevelId) === lid || String((e as any).course_level_id) === lid);
        });
    };

    const renderHorizontalLayout = () => (
        <div className="space-y-12 animate-fade-in no-break">
            {relevantCourses.map((course) => {
                const levelIds = (course.levels || []).filter(l => l).map(l => String(l.id));
                const courseEntries = generatedTimetable.filter(e => {
                    if (!e) return false;
                    const isCourseMatch = String(e.courseId) === String(course.id) || String((e as any).course_id) === String(course.id);
                    if (!isCourseMatch) return false;

                    if (e.courseLevelId || (e as any).course_level_id) {
                        const eid = String(e.courseLevelId || (e as any).course_level_id);
                        return levelIds.includes(eid);
                    }
                    return true;
                });

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
                                        <th className="p-3 text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-r border-slate-200 dark:border-slate-800 w-24">Class</th>
                                        {periodHeaders.map((p, i) => (
                                            <th key={i} colSpan={p.colSpan} className={`p-2 text-center text-[10px] font-black uppercase tracking-widest border-l border-slate-200/50 dark:border-slate-800/50 ${p.isBreak ? 'text-slate-400 bg-slate-50/50' : 'text-slate-500'}`}>
                                                {p.label}
                                                <span className="block font-mono text-[8px] opacity-60 mt-1">{p.startTime} - {p.endTime}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                                    {(course.levels || []).map(level => {
                                        const occupiedSlots = new Set<string>();
                                        const levelEntries = (courseEntries || []).filter(e => 
                                            String(e.courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)
                                        );

                                        return (
                                            <tr key={level.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="p-3 bg-slate-50/30 dark:bg-slate-950/20 border-r border-slate-100 dark:border-slate-800">
                                                    <div className="text-[10px] font-black text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-widest leading-tight">
                                                        {level.name}
                                                    </div>
                                                </td>
                                                {periodHeaders.map((period, periodIndex) => {
                                                    const slotKey = `${level.id}-${period.startTime}`;
                                                    if (occupiedSlots.has(period.startTime)) return null;

                                                    const periodStartMinutes = timeToMinutes(period.startTime);
                                                    const periodEndMinutes = timeToMinutes(period.endTime);
                                                    const slotEntries = (levelEntries || []).filter(e =>
                                                        e.day === selectedDay &&
                                                        timeToMinutes(e.startTime) >= periodStartMinutes &&
                                                        timeToMinutes(e.startTime) < periodEndMinutes
                                                    );

                                                    if (period.isBreak) {
                                                        // Mark all spanned slots as occupied
                                                        for (let k = 0; k < period.colSpan; k++) {
                                                            const nextPeriod = periodHeaders[periodIndex + k];
                                                            if (nextPeriod) occupiedSlots.add(nextPeriod.startTime);
                                                        }
                                                        return (
                                                            <td key={slotKey} colSpan={period.colSpan} className="p-1 border border-slate-100 dark:border-slate-800 text-center align-middle bg-slate-50/50 dark:bg-slate-900/30 print:bg-gray-50">
                                                                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest select-none block mx-auto" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{period.label || 'BREAK'}</span>
                                                            </td>
                                                        );
                                                    }

                                                    if (slotEntries.length > 0) {
                                                        const slotEndMinutes = timeToMinutes(period.endTime);
                                                        const maxEntryEndMinutes = Math.max(...slotEntries.map(e => timeToMinutes(e.endTime)));
                                                        
                                                        // Calculate colSpan
                                                        let colSpan = 1;
                                                        if (maxEntryEndMinutes > slotEndMinutes + 10) { 
                                                            for (let k = periodIndex + 1; k < periodHeaders.length; k++) {
                                                                if (timeToMinutes(periodHeaders[k].startTime) < maxEntryEndMinutes - 5) {
                                                                    colSpan++;
                                                                } else {
                                                                    break;
                                                                }
                                                            }
                                                        }

                                                        // Mark occupied slots
                                                        for (let k = 0; k < colSpan; k++) {
                                                            const nextPeriod = periodHeaders[periodIndex + k];
                                                            if (nextPeriod) occupiedSlots.add(nextPeriod.startTime);
                                                        }

                                                        return (
                                                            <td 
                                                                key={slotKey} 
                                                                colSpan={colSpan} 
                                                                className={`p-0.5 border border-slate-100 dark:border-slate-800 text-center align-middle relative transition-all duration-200 ${hoveredSlot?.levelId === level.id && hoveredSlot?.day === selectedDay && hoveredSlot?.startTime === period.startTime ? 'bg-indigo-50/50 ring-2 ring-inset ring-indigo-500 z-10' : ''}`}
                                                                onDragOver={(e) => handleDragOver(e, String(level.id), selectedDay, period.startTime)}
                                                                onDrop={(e) => handleDrop(e, String(level.id), selectedDay, period.startTime)}
                                                            >
                                                                <div className="flex flex-col h-full gap-0.5 min-h-[50px]">
                                                                    {slotEntries.map((entry) => {
                                                                        const subject = getSubjectById(entry.subjectId);
                                                                        const lecturer = getLecturerById(entry.lecturerId);
                                                                        const room = getRoomById(entry.roomId);
                                                                        const isConflicting = (timetableConflicts || []).some(c =>
                                                                            c.day === selectedDay &&
                                                                            c.conflictingEntries.some(ce => ce.id === entry.id)
                                                                        );

                                                                        return (
                                                                            <div 
                                                                                key={entry.id} 
                                                                                draggable={!!onMoveLesson}
                                                                                onDragStart={(e) => handleDragStart(e, entry)}
                                                                                onDragEnd={handleDragEnd}
                                                                                className={`flex-1 rounded-md p-1.5 shadow-sm border-l-2 transition-all group/card relative ${onMoveLesson ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02]' : ''} ${isConflicting ? 'border-red-500 ring-1 ring-red-200' : 'border-black/10'}`} 
                                                                                style={{ 
                                                                                    backgroundColor: generatePastelColor(entry.subjectId),
                                                                                    borderLeftColor: isConflicting ? '#ef4444' : generatePastelColor(entry.subjectId + 'border').replace('80%', '40%'),
                                                                                    opacity: draggedEntryId === entry.id ? 0.4 : 1
                                                                                }}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-0.5">
                                                                                    <span className="text-[8px] font-black text-slate-800/60 uppercase tracking-tighter truncate max-w-[30px]">{subject?.code}</span>
                                                                                    <span className="text-[7px] font-mono bg-black/5 px-1 rounded text-slate-600 truncate">{room?.shortName || room?.name || 'N/R'}</span>
                                                                                </div>
                                                                                <div className="text-[10px] leading-none text-slate-900 font-black uppercase tracking-tighter mb-1 px-0.5 truncate">
                                                                                    {subject?.name}
                                                                                </div>
                                                                                <div className="flex items-center justify-between mt-auto pt-0.5 border-t border-black/5">
                                                                                    <span className="text-[7px] font-bold text-slate-500 uppercase truncate">{lecturer?.name?.split(' ').pop()}</span>
                                                                                    {isConflicting && <span className="text-red-600 animate-pulse text-[8px]">⚠️</span>}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    return <td key={slotKey} className="p-1 border border-slate-100 dark:border-slate-800" />;
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
                                                                        <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest block mx-auto" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{period.label}</span>
                                                                    </td>
                                                                );
                                                            }

                                                            const entries = getCellEntries(level, day, period);
                                                            if (entries && entries.length > 0) {
                                                                const slotEndMinutes = timeToMinutes(period.endTime);
                                                                const maxEntryEndMinutes = Math.max(...entries.map(e => timeToMinutes(e.endTime)));
                                                                
                                                                let colSpan = 1;
                                                                if (maxEntryEndMinutes > slotEndMinutes + 10) { 
                                                                    for (let k = periodIndex + 1; k < periodHeaders.length; k++) {
                                                                        if (timeToMinutes(periodHeaders[k].startTime) < maxEntryEndMinutes - 5) {
                                                                            colSpan++;
                                                                        } else {
                                                                            break;
                                                                        }
                                                                    }
                                                                }

                                                                for (let k = 0; k < colSpan; k++) occupiedSlots.add(periodIndex + k);

                                                                const levelCounts: Record<string, number> = {};
                                                                entries.forEach(e => {
                                                                    if (!e) return;
                                                                    const lid = String(e.courseLevelId || (e as any).course_level_id || '');
                                                                    levelCounts[lid] = (levelCounts[lid] || 0) + 1;
                                                                });

                                                                return (
                                                                    <td key={periodIndex} colSpan={colSpan} className="p-1 border-l border-slate-100 dark:border-slate-800 align-middle text-center">
                                                                        <div className="flex h-full gap-1">
                                                                            {entries.map((entry) => {
                                                                                const entryLid = String(entry.courseLevelId || (entry as any).course_level_id || '');
                                                                                const isBlockPart = (levelCounts[entryLid] || 0) > 1;
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

    const renderWeeklyLayout = () => (
        <div className="animate-fade-in no-break border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full border-collapse table-fixed">
                    <thead>
                        {/* Day Headers row */}
                        <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <th className="p-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] border-r border-slate-200 dark:border-slate-800 w-32 sticky left-0 bg-slate-100 dark:bg-slate-950 z-30">
                                Curriculum Map
                            </th>
                            {daysOfWeek.map(day => (
                                <th key={day} colSpan={periodHeaders.length} className="p-2 text-center text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 border-l border-slate-200 dark:border-slate-800 bg-indigo-50/30">
                                    {day}
                                </th>
                            ))}
                        </tr>
                        {/* Periods row */}
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                            <th className="sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 border-r border-slate-200 dark:border-slate-800" />
                            {daysOfWeek.map(day => (
                                periodHeaders.map((p, i) => (
                                    <th key={`${day}-${i}`} className={`p-1 text-center text-[8px] font-black uppercase tracking-tighter border-l border-slate-100 dark:border-slate-800 w-24 ${p.isBreak ? 'text-slate-300' : 'text-slate-500'}`}>
                                        <div className="flex flex-col items-center">
                                            <span>{p.label}</span>
                                            <span className="opacity-40 font-mono scale-90">{p.startTime.split(':')[0]}<sup>{p.startTime.split(':')[1]}</sup></span>
                                        </div>
                                    </th>
                                ))
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {relevantCourses.flatMap(course => (course.levels || []).map(level => {
                            if (!level) return null;
                            const levelEntries = generatedTimetable.filter(e => 
                                String(e.courseLevelId) === String(level.id) || String((e as any).course_level_id) === String(level.id)
                            );

                            return (
                                <tr key={level.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors h-24">
                                    <td className="p-3 sticky left-0 bg-white dark:bg-slate-900 z-20 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{level.name}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{course.code}</span>
                                        </div>
                                    </td>
                                    {daysOfWeek.map(day => {
                                        const occupiedSlots = new Set<string>();
                                        return periodHeaders.map((period, periodIndex) => {
                                            const slotKey = `${level.id}-${day}-${period.startTime}`;
                                            if (occupiedSlots.has(period.startTime)) return null;

                                            const periodStartMinutes = timeToMinutes(period.startTime);
                                            const periodEndMinutes = timeToMinutes(period.endTime);
                                            const slotEntries = levelEntries.filter(e =>
                                                e.day === day &&
                                                timeToMinutes(e.startTime) >= periodStartMinutes &&
                                                timeToMinutes(e.startTime) < periodEndMinutes
                                            );

                                            if (period.isBreak) {
                                                return (
                                                    <td key={slotKey} className="p-0.5 border-l border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 text-center align-middle">
                                                        <div className="w-1 h-full bg-slate-100 dark:bg-slate-800 mx-auto rounded-full" />
                                                    </td>
                                                );
                                            }

                                            if (slotEntries.length > 0) {
                                                // Simplified colSpan logic for weekly view to keep it compact
                                                let colSpan = 1; 
                                                // (In true aSC style, cards usually fit in their assigned period box)

                                                return (
                                                    <td 
                                                        key={slotKey} 
                                                        colSpan={colSpan} 
                                                        className={`p-0.5 border-l border-slate-100 dark:border-slate-800 relative group/slot transition-all duration-200 ${hoveredSlot?.levelId === level.id && hoveredSlot?.day === day && hoveredSlot?.startTime === period.startTime ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-500' : ''}`}
                                                        onDragOver={(e) => handleDragOver(e, String(level.id), day, period.startTime)}
                                                        onDrop={(e) => handleDrop(e, String(level.id), day, period.startTime)}
                                                    >
                                                        <div className="flex h-full gap-0.5">
                                                            {slotEntries.map(entry => {
                                                                const subject = getSubjectById(entry.subjectId);
                                                                const lecturer = getLecturerById(entry.lecturerId);
                                                                const room = getRoomById(entry.roomId);
                                                                const isConflicting = (timetableConflicts || []).some(c =>
                                                                    c.day === day && c.conflictingEntries.some(ce => ce.id === entry.id)
                                                                );

                                                                return (
                                                                    <div 
                                                                        key={entry.id}
                                                                        draggable={!!onMoveLesson}
                                                                        onDragStart={(e) => handleDragStart(e, entry)}
                                                                        onDragEnd={handleDragEnd}
                                                                        className={`flex-1 rounded shadow-sm border-l-2 p-1 flex flex-col justify-between overflow-hidden transition-all ${onMoveLesson ? 'cursor-grab active:cursor-grabbing hover:scale-105 hover:z-50 hover:shadow-lg' : ''} ${isConflicting ? 'border-red-500 ring-1 ring-red-200' : 'border-black/10'}`}
                                                                        style={{ 
                                                                            backgroundColor: generatePastelColor(entry.subjectId),
                                                                            borderLeftColor: isConflicting ? '#ef4444' : generatePastelColor(entry.subjectId + 'border').replace('80%', '40%'),
                                                                            opacity: draggedEntryId === entry.id ? 0.3 : 1
                                                                        }}
                                                                        title={`${subject?.name}\n${lecturer?.name}\n${room?.name}`}
                                                                    >
                                                                        <div className="text-[9px] font-black text-slate-900 truncate tracking-tighter leading-none">{subject?.shortName || subject?.code}</div>
                                                                        <div className="flex justify-between items-center mt-1">
                                                                            <span className="text-[6px] font-bold text-slate-600 truncate max-w-[50%]">{room?.shortName || room?.name}</span>
                                                                            <span className="text-[6px] font-mono font-bold text-slate-500">{getInitials(lecturer?.name || '')}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td 
                                                    key={slotKey} 
                                                    className={`p-0.5 border-l border-slate-100 dark:border-slate-800 transition-colors duration-150 ${hoveredSlot?.levelId === level.id && hoveredSlot?.day === day && hoveredSlot?.startTime === period.startTime ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-500' : 'hover:bg-slate-50/50'}`}
                                                    onDragOver={(e) => handleDragOver(e, String(level.id), day, period.startTime)}
                                                    onDrop={(e) => handleDrop(e, String(level.id), day, period.startTime)}
                                                />
                                            );
                                        })
                                    })}
                                </tr>
                            );
                        }))}
                    </tbody>
                </table>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
            `}</style>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center no-print">
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => onLayoutModeChange('weekly')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${layoutMode === 'weekly' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <RectangleStackIcon className="w-4 h-4" />
                        Weekly Master
                    </button>
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

            {layoutMode === 'weekly' ? renderWeeklyLayout() : layoutMode === 'horizontal' ? renderHorizontalLayout() : renderVerticalLayout()}

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

