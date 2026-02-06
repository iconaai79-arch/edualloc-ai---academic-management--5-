
import React, { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, User, Room, TimetableSettings, ScheduleProfile } from '../types';
import { generatePastelColor } from '../utils/colorUtils';
import { GRID_TIME_STEP_MINUTES, timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { ExclamationTriangleIcon } from './icons/index.ts';
import { getInitials } from '../utils/stringUtils';

interface TimetableGridProps {
    entries: TimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    timetableSettings: TimetableSettings;
    renderCellActions?: (entry: TimetableEntry) => React.ReactNode;
    renderCellFooter?: (entry: TimetableEntry) => React.ReactNode;
    daysToShow?: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
    onMoveLesson?: (entryId: string, newDay: string, newStartTime: string) => void;
    isEditable?: boolean;
    scheduleProfile?: ScheduleProfile;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
    entries = [],
    getSubjectById,
    getLecturerById,
    getRoomById,
    timetableSettings,
    renderCellActions,
    renderCellFooter,
    daysToShow,
    onMoveLesson,
    isEditable = false,
    scheduleProfile
}) => {
    const activeSettings = useMemo(() => {
        if (!scheduleProfile) return timetableSettings;
        return {
            ...timetableSettings,
            startTime: scheduleProfile.startTime || timetableSettings.startTime,
            endTime: scheduleProfile.endTime || timetableSettings.endTime,
            operatingDays: scheduleProfile.operatingDays || timetableSettings.operatingDays || [],
            periods: scheduleProfile.periods || timetableSettings.periods || [],
            breaks: scheduleProfile.breaks || timetableSettings.breaks || [],
            cellSpanMinutes: scheduleProfile.cellSpanMinutes || timetableSettings.cellSpanMinutes || 60
        };
    }, [timetableSettings, scheduleProfile]);

    const daysOfWeek = useMemo(() => daysToShow || activeSettings?.operatingDays || [], [daysToShow, activeSettings]);
    const periodHeaders = useMemo(() => generatePeriodLabels(activeSettings), [activeSettings]);
    const displaySlots = useMemo(() => generateDisplaySlots(activeSettings), [activeSettings]);
    const cellSpanMinutes = activeSettings?.cellSpanMinutes || 60; 

    const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, entry: TimetableEntry) => {
        if (!isEditable) return;
        setDraggedEntryId(entry.id);
        e.dataTransfer.setData('text/plain', entry.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedEntryId(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isEditable) return;
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, day: string, startTime: string) => {
        if (!isEditable || !onMoveLesson) return;
        e.preventDefault();
        const entryId = e.dataTransfer.getData('text/plain');
        if (entryId) {
            onMoveLesson(entryId, day, startTime);
        }
    };

    return (
        <div className="overflow-x-auto print:overflow-visible text-slate-900 dark:text-slate-100">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th rowSpan={2} className="px-3 py-3 text-left text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-700 min-w-[70px] z-10">
                            Day
                        </th>
                        {periodHeaders.map((period, idx) => (
                            <th key={`label-${idx}`} colSpan={period.colSpan} className="px-1 py-2 text-center text-[10px] font-black text-slate-500 dark:text-slate-300 tracking-widest border border-slate-200 dark:border-slate-600 uppercase">
                                {period.label}
                            </th>
                        ))}
                    </tr>
                    <tr>
                        {periodHeaders.map((period, idx) => (
                            <th key={`time-${idx}`} colSpan={period.colSpan} className="px-1 py-1 text-center font-mono text-[9px] text-slate-400 dark:text-slate-500 tracking-tighter border border-slate-200 dark:border-slate-600">
                                {period.startTime}-{period.endTime}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {daysOfWeek.map(day => {
                        const rowCells: React.ReactNode[] = [];
                        const rowOccupiedSlots = new Set<number>(); 

                        for (let i = 0; i < displaySlots.length; i++) {
                            const slot = displaySlots[i];
                            const slotStartMinutes = timeToMinutes(slot.start);

                            if (rowOccupiedSlots.has(slotStartMinutes)) {
                                continue;
                            }

                            // Defensive: Ensure entries is an array
                            const safeEntries = Array.isArray(entries) ? entries : [];
                            const entriesStartingInSlot = safeEntries.filter(entry => 
                                entry && entry.day === day && 
                                timeToMinutes(entry.startTime) === slotStartMinutes
                            );

                            if (entriesStartingInSlot.length > 0) {
                                const entry = entriesStartingInSlot[0]; 
                                const subject = getSubjectById(entry.subjectId);
                                const lecturer = getLecturerById(entry.lecturerId);
                                const room = getRoomById(entry.roomId);

                                if (!subject || !lecturer || !room) continue;

                                const entryDurationMinutes = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
                                const colSpan = Math.max(1, Math.round(entryDurationMinutes / cellSpanMinutes));

                                for(let k = 0; k < colSpan; k++) {
                                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                }

                                const bgColor = generatePastelColor(subject.id);
                                const textColor = '#1e293b'; 
                                const borderColor = subject.isComplete ? '#94a3b8' : generatePastelColor(subject.id + 'border').replace('80%', '60%');

                                rowCells.push(
                                    <td
                                        key={`${day}-${slot.start}`}
                                        colSpan={colSpan}
                                        className="p-1 border border-slate-200 dark:border-slate-600 align-top relative"
                                        style={{ minWidth: (colSpan * 64) + 'px' }}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day, slot.start)}
                                    >
                                        <div
                                            draggable={isEditable}
                                            onDragStart={(e) => handleDragStart(e, entry)}
                                            onDragEnd={handleDragEnd}
                                            className={`h-full flex flex-col rounded-xl shadow-sm hover:shadow-md transition-all border-l-[6px] overflow-hidden ${isEditable ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5' : ''}`}
                                            style={{ 
                                                backgroundColor: bgColor, 
                                                color: textColor,
                                                borderLeftColor: borderColor,
                                                opacity: draggedEntryId === entry.id ? 0.5 : 1
                                            }}
                                            title={`${subject.name}\n${lecturer.name}\n${room.name}`}
                                        >
                                            {entry.isConflicting && (
                                                <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 shadow-lg z-20 animate-bounce" title="Conflict Detected">
                                                    <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                            
                                            <div className="p-2 flex flex-col h-full justify-between">
                                                <div className="space-y-1">
                                                     <div className="flex justify-between items-start gap-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80 leading-tight">{subject.code}</span>
                                                        <span className="text-[8px] font-mono bg-black/10 px-1.5 py-0.5 rounded text-slate-800 font-black">{room.shortName || room.name}</span>
                                                     </div>
                                                    <p className="font-bold text-[10px] leading-snug line-clamp-2 text-slate-900 uppercase tracking-tighter">{subject.name}</p>
                                                </div>
                                                
                                                <div className="mt-2 pt-1 border-t border-black/10 flex flex-col gap-0.5">
                                                    <p className="text-[9px] font-bold text-slate-700 truncate flex items-center gap-1">
                                                        <span className="w-4 h-4 bg-white/50 rounded-full flex items-center justify-center text-[7px] font-black text-slate-600">{getInitials(lecturer.name)}</span>
                                                        {lecturer.name.split(' ').pop()}
                                                    </p>
                                                    {renderCellActions && renderCellActions(entry)}
                                                    {renderCellFooter && renderCellFooter(entry)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                );

                                i += colSpan - 1; 
                            } else {
                                const breaks = Array.isArray(activeSettings?.breaks) ? activeSettings.breaks : [];
                                const breakHere = breaks.find(b => b && b.status !== 'inactive' && b.startTime && b.endTime && timeToMinutes(b.startTime) < timeToMinutes(slot.end) && timeToMinutes(b.endTime) > timeToMinutes(slot.start));

                                if (breakHere && timeToMinutes(breakHere.startTime) === slotStartMinutes) {
                                    const breakDuration = timeToMinutes(breakHere.endTime) - timeToMinutes(breakHere.startTime);
                                    const colSpan = Math.max(1, Math.round(breakDuration / cellSpanMinutes));

                                    for (let k = 0; k < colSpan; k++) {
                                        rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                    }
                                    rowCells.push(
                                        <td key={`break-${day}-${breakHere.id}`} colSpan={colSpan} className="p-1 border border-slate-200 dark:border-slate-600 align-top bg-slate-50/50 dark:bg-slate-700/30">
                                            <div className="h-full flex items-center justify-center rounded-sm">
                                                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 tracking-[0.3em] uppercase rotate-90 whitespace-nowrap">
                                                    {breakHere.name}
                                                </span>
                                            </div>
                                        </td>
                                    );
                                    i += colSpan - 1;
                                } else if (!rowOccupiedSlots.has(slotStartMinutes)) {
                                    rowCells.push(
                                        <td 
                                            key={`${day}-${slot.start}`} 
                                            className="p-1 border border-slate-100 dark:border-slate-700/50 align-top hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors" 
                                            style={{ minWidth: '64px' }}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, day, slot.start)}
                                        />
                                    );
                                }
                            }
                        }

                        return (
                            <tr key={day} className="group">
                                <td className="p-2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-700 min-w-[70px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {day}
                                </td>
                                {rowCells}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
