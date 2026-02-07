
import React, { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, User, Room, TimetableSettings } from '../types';
import { generatePastelColor } from '../utils/colorUtils';
import { GRID_TIME_STEP_MINUTES, timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { ExclamationTriangleIcon } from './icons';
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
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
    entries,
    getSubjectById,
    getLecturerById,
    getRoomById,
    timetableSettings,
    renderCellActions,
    renderCellFooter,
    daysToShow,
    onMoveLesson,
    isEditable = false,
}) => {
    const daysOfWeek = useMemo(() => daysToShow || timetableSettings.operatingDays, [daysToShow, timetableSettings]);
    
    // `periodHeaders` define the main column structure
    const periodHeaders = useMemo(() => {
        return generatePeriodLabels(timetableSettings);
    }, [timetableSettings]);

    // `displaySlots` are the actual time slots used for the <td> elements
    const displaySlots = useMemo(() => generateDisplaySlots(timetableSettings), [timetableSettings]);
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60; 

    const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, entry: TimetableEntry) => {
        if (!isEditable) return;
        setDraggedEntryId(entry.id);
        e.dataTransfer.setData('text/plain', entry.id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a subtle transparency to the element being dragged
        (e.target as HTMLElement).style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedEntryId(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isEditable) return;
        e.preventDefault(); // Necessary to allow dropping
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
        <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th rowSpan={2} className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-700 min-w-[70px] z-10">
                            Day
                        </th>
                        {periodHeaders.map(period => (
                            <th key={`label-${period.label}`} colSpan={period.colSpan} className="px-1 py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-300 tracking-wider border border-slate-200 dark:border-slate-600">
                                {period.label}
                            </th>
                        ))}
                    </tr>
                    <tr>
                        {periodHeaders.map(period => (
                            <th key={`time-${period.label}`} colSpan={period.colSpan} className="px-1 py-1 text-center text-xs font-medium text-slate-500 dark:text-slate-300 tracking-wider border border-slate-200 dark:border-slate-600">
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

                            const entriesStartingInSlot = entries.filter(entry => 
                                entry.day === day && 
                                timeToMinutes(entry.startTime) === slotStartMinutes
                            );

                            if (entriesStartingInSlot.length > 0) {
                                const entry = entriesStartingInSlot[0]; 
                                const subject = getSubjectById(entry.subjectId);
                                const lecturer = getLecturerById(entry.lecturerId);
                                const room = getRoomById(entry.roomId);

                                if (!subject || !lecturer || !room) continue;

                                const entryDurationMinutes = timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime);
                                const colSpan = Math.round(entryDurationMinutes / cellSpanMinutes);

                                for(let k = 0; k < colSpan; k++) {
                                    rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                }

                                const bgColor = generatePastelColor(subject.id);
                                const textColor = '#1e293b'; // slate-800 for readability
                                const borderColor = subject.isComplete ? '#94a3b8' : generatePastelColor(subject.id + 'border').replace('80%', '60%'); // Darker shade for border

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
                                            className={`h-full flex flex-col rounded-lg shadow-sm hover:shadow-md transition-all border-l-[6px] overflow-hidden ${isEditable ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5' : ''}`}
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
                                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-tight">{subject.code}</span>
                                                        <span className="text-[9px] font-mono bg-black/10 px-1.5 py-0.5 rounded text-slate-800 font-semibold">{room.shortName || room.name}</span>
                                                     </div>
                                                    <p className="font-bold text-xs leading-snug line-clamp-2 text-slate-900">{subject.name}</p>
                                                </div>
                                                
                                                <div className="mt-2 pt-1 border-t border-black/10 flex flex-col gap-0.5">
                                                    <p className="text-[10px] font-medium text-slate-700 truncate flex items-center gap-1">
                                                        <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-600">{getInitials(lecturer.name)}</span>
                                                        {lecturer.name.split(' ').pop()}
                                                    </p>
                                                    {entry.duration && entry.duration !== cellSpanMinutes && (
                                                        <p className="text-[9px] opacity-70 text-right">{entry.startTime}-{entry.endTime}</p>
                                                    )}
                                                    {renderCellActions && renderCellActions(entry)}
                                                    {renderCellFooter && renderCellFooter(entry)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                );

                                i += colSpan - 1; 
                            } else {
                                const breakHere = timetableSettings.breaks.find(b => b.status !== 'inactive' && timeToMinutes(b.startTime) < timeToMinutes(slot.end) && timeToMinutes(b.endTime) > timeToMinutes(slot.start));

                                if (breakHere && timeToMinutes(breakHere.startTime) === slotStartMinutes) {
                                    const breakDuration = timeToMinutes(breakHere.endTime) - timeToMinutes(breakHere.startTime);
                                    const colSpan = Math.max(1, Math.round(breakDuration / cellSpanMinutes));

                                    for (let k = 0; k < colSpan; k++) {
                                        rowOccupiedSlots.add(slotStartMinutes + (k * cellSpanMinutes));
                                    }
                                    rowCells.push(
                                        <td key={`break-${day}-${breakHere.id}`} colSpan={colSpan} className="p-1 border border-slate-200 dark:border-slate-600 align-top bg-slate-50/50 dark:bg-slate-700/30">
                                            <div className="h-full flex items-center justify-center rounded-sm">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase rotate-90 whitespace-nowrap">
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
                                            className="p-1 border border-slate-200 dark:border-slate-600 align-top hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" 
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
                                <td className="p-2 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 sticky left-0 bg-slate-50 dark:bg-slate-700 min-w-[70px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
