
import React, { useMemo } from 'react';
import type { Department, Course, TimetableEntry, Subject, User, Room, TimetableSettings, CourseLevel, Institution } from '../types';
import { timeToMinutes, generatePeriodLabels } from '../utils/timeUtils';
import { generatePastelColor } from '../utils/colorUtils';
import { getInitials } from '../utils/stringUtils';

interface DepartmentalMasterTimetableProps {
    departments: Department[];
    courses: Course[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    generatedTimetable: TimetableEntry[];
    timetableSettings: TimetableSettings;
    currentInstitution?: Institution | null;
}

export const DepartmentalMasterTimetable: React.FC<DepartmentalMasterTimetableProps> = ({ departments, courses, subjects, lecturers, rooms, generatedTimetable, timetableSettings, currentInstitution }) => {
    const daysOfWeek = timetableSettings.operatingDays || [];
    const periodHeaders = useMemo(() => generatePeriodLabels(timetableSettings), [timetableSettings]);
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;
    
    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const courseLabel = isSchool ? 'Grade' : 'Course';
    const levelLabel = isSchool ? 'Stream' : 'Level';

    const safeGeneratedTimetable = Array.isArray(generatedTimetable) ? generatedTimetable : [];

    const getCellEntry = (level: CourseLevel, day: string, period: { startTime: string; endTime: string; }) => {
        const periodStartMinutes = timeToMinutes(period.startTime);
        return safeGeneratedTimetable.find(e => 
            e && e.day === day &&
            (level.subjectIds || []).includes(e.subjectId) &&
            timeToMinutes(e.startTime) === periodStartMinutes
        );
    };

    const safeDepartments = Array.isArray(departments) ? departments : [];
    const safeCourses = Array.isArray(courses) ? courses : [];

    return (
        <div className="space-y-8">
            {safeDepartments.map(department => {
                if (!department) return null;
                const departmentCourses = safeCourses.filter(c => c && c.departmentId === department.id);
                if (departmentCourses.length === 0) return null;

                return (
                    <div key={department.id} className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden print:overflow-visible print:shadow-none print:border-none print:break-inside-avoid">
                        <div className="p-4 bg-slate-100 dark:bg-slate-700 print:bg-transparent print:p-0 print:mb-2">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white print:text-black">{department.name}</h3>
                        </div>
                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="min-w-full border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50 print:bg-gray-100">
                                        <th className="p-2 border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-700/50 z-10 print:static print:bg-transparent print:text-black" rowSpan={2}>{courseLabel}</th>
                                        <th className="p-2 border border-slate-200 dark:border-slate-600 sticky left-24 bg-slate-50 dark:bg-slate-700/50 z-10 print:static print:bg-transparent print:text-black" rowSpan={2}>{levelLabel}</th>
                                        {daysOfWeek.map(day => (
                                            <th key={day} colSpan={periodHeaders.length} className="p-2 border border-slate-200 dark:border-slate-600 font-bold text-slate-900 dark:text-white print:text-black">{day}</th>
                                        ))}
                                    </tr>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50 print:bg-gray-50">
                                        {daysOfWeek.map(day => periodHeaders.map(period => (
                                            <th key={`${day}-${period.label}`} className="p-1 border border-slate-200 dark:border-slate-600 font-normal text-[10px] whitespace-normal text-slate-700 dark:text-slate-300 print:text-black">
                                                <span className="font-semibold">{period.label}</span><br/>{period.startTime}-{period.endTime}
                                            </th>
                                        )))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {departmentCourses.flatMap(course => 
                                        (course.levels || []).map((level, levelIndex) => {
                                            const occupiedSlots = new Set<string>();
                                            return (
                                            <tr key={level.id} className="border-t border-slate-200 dark:border-slate-600">
                                                {levelIndex === 0 && (
                                                    <td rowSpan={(course.levels || []).length} className="p-2 border border-slate-200 dark:border-slate-600 font-semibold sticky left-0 bg-white dark:bg-slate-800 z-10 align-top print:static print:bg-transparent print:text-black">
                                                        {course.name}
                                                    </td>
                                                )}
                                                <td className="p-2 border border-slate-200 dark:border-slate-600 font-medium sticky left-24 bg-white dark:bg-slate-800 z-10 print:static print:bg-transparent print:text-black">{level.name}</td>
                                                {daysOfWeek.flatMap(day => periodHeaders.map((period, periodIndex) => {
                                                    const slotKey = `${day}-${periodIndex}`;
                                                    if (occupiedSlots.has(slotKey)) return null;

                                                    const entry = getCellEntry(level, day, period);
                                                    if (entry) {
                                                        const subject = (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === entry.subjectId);
                                                        const lecturer = (Array.isArray(lecturers) ? lecturers : []).find(l => l && l.id === entry.lecturerId);
                                                        const room = (Array.isArray(rooms) ? rooms : []).find(r => r && r.id === entry.roomId);
                                                        const duration = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
                                                        const colSpan = Math.max(1, Math.round(duration / cellSpanMinutes));
                                                        for(let k=0; k<colSpan; k++) occupiedSlots.add(`${day}-${periodIndex + k}`);

                                                        return (
                                                            <td key={slotKey} colSpan={colSpan} className="p-1 border border-slate-200 dark:border-slate-600 text-center align-middle print:border-slate-400" style={{backgroundColor: generatePastelColor(entry.subjectId)}}>
                                                                <div className="text-[10px] leading-tight text-slate-900 print:text-black">
                                                                    <strong className="block">{subject?.shortName || subject?.code}</strong>
                                                                    <span className="block">{getInitials(lecturer?.name || '')}</span>
                                                                    <em className="block text-slate-600 print:text-black">{room?.shortName || room?.name}</em>
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    return <td key={slotKey} className="border border-slate-200 dark:border-slate-600 print:border-slate-300"></td>
                                                }))}
                                            </tr>
                                        )})
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
