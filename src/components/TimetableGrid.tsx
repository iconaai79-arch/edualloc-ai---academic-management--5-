
import React, { useMemo, useState } from 'react';
import type { TimetableEntry, Subject, User, Room, TimetableSettings, Course } from '../types';
import { generatePastelColor } from '../utils/colorUtils';
import { GRID_TIME_STEP_MINUTES, timeToMinutes, minutesToTime, generatePeriodLabels, generateDisplaySlots } from '../utils/timeUtils';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

import { getInitials } from '../utils/stringUtils';
import { checkMoveValidity } from '../utils/conflictUtils';

interface TimetableGridProps {
    entries: TimetableEntry[];
    subjects: Subject[];
    courses: Course[];
    rooms: Room[];
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
    subjects,
    courses,
    rooms,
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
        return generatePeriodLabels(timetableSettings, true);
    }, [timetableSettings]);

    // `displaySlots` are the actual time slots used for the <td> elements
    const displaySlots = useMemo(() => generateDisplaySlots(timetableSettings, true), [timetableSettings]);
    const cellSpanMinutes = timetableSettings.cellSpanMinutes || 60;

    const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
    const [hoveredSlot, setHoveredSlot] = useState<{ day: string, startTime: string } | null>(null);

    const dropValidation = useMemo(() => {
        if (!draggedEntryId || !hoveredSlot) return null;
        return checkMoveValidity(
            draggedEntryId,
            hoveredSlot.day,
            hoveredSlot.startTime,
            entries,
            rooms,
            courses,
            subjects,
            timetableSettings
        );
    }, [draggedEntryId, hoveredSlot, entries, rooms, courses, subjects, timetableSettings]);

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
        setHoveredSlot(null);
        (e.target as HTMLElement).style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, day: string, startTime: string) => {
        if (!isEditable) return;
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';

        if (hoveredSlot?.day !== day || hoveredSlot?.startTime !== startTime) {
            setHoveredSlot({ day, startTime });
        }
    };

    const handleDrop = (e: React.DragEvent, day: string, startTime: string) => {
        if (!isEditable || !onMoveLesson) return;
        e.preventDefault();
        const entryId = e.dataTransfer.getData('text/plain');
        setHoveredSlot(null);
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

                            const slotEndMinutes = timeToMinutes(slot.end);
                            const entriesStartingInSlot = entries.filter(entry =>
                                entry.day === day &&
                                timeToMinutes(entry.startTime) >= slotStartMinutes &&
                                timeToMinutes(entry.startTime) < slotEndMinutes
                            );

                            const isBreakSlot = timetableSettings.breaks.some(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);
                            const breakObj = timetableSettings.breaks.find(b => b.status !== 'inactive' && b.startTime === slot.start && b.endTime === slot.end);

                            if (entriesStartingInSlot.length > 0) {
                                const maxEntryEndMinutes = Math.max(...entriesStartingInSlot.map(e => timeToMinutes(e.endTime)));
                                const isBlocked = entriesStartingInSlot.length > 1;
                                let colSpan = 1;

                                if (maxEntryEndMinutes > slotEndMinutes) {
                                    if (isBlocked) {
                                        for (let k = i + 1; k < displaySlots.length; k++) {
                                            if (timeToMinutes(displaySlots[k].start) < maxEntryEndMinutes) {
                                                colSpan++;
                                            } else {
                                                break;
                                            }
                                        }
                                    } else {
                                        // Enforce one-period fidelity for single entries as requested
                                        colSpan = 1;
                                    }
                                }

                                // Mark future slots as occupied for the max duration
                                for (let j = 1; j < colSpan; j++) {
                                    const nextSlotIndex = i + j;
                                    if (displaySlots[nextSlotIndex]) {
                                        rowOccupiedSlots.add(timeToMinutes(displaySlots[nextSlotIndex].start));
                                    }
                                }

                                rowCells.push(
                                    <td
                                        key={`${day}-${slot.start}`}
                                        colSpan={colSpan}
                                        className={`p-1 border border-slate-200 dark:border-slate-600 align-top relative transition-colors duration-200 ${hoveredSlot?.day === day && hoveredSlot?.startTime === slot.start
                                            ? dropValidation?.isValid
                                                ? 'bg-emerald-50/80 dark:bg-emerald-900/40 ring-2 ring-inset ring-emerald-500'
                                                : 'bg-rose-50/80 dark:bg-rose-900/40 ring-2 ring-inset ring-rose-500'
                                            : ''
                                            }`}
                                        style={{ minWidth: (colSpan * 64) + 'px' }}
                                        onDragOver={(e) => handleDragOver(e, day, slot.start)}
                                        onDrop={(e) => handleDrop(e, day, slot.start)}
                                    >
                                        <div className="flex h-full gap-1 overflow-hidden">
                                            {entriesStartingInSlot.map((entry) => {
                                                const subject = getSubjectById(entry.subjectId);
                                                const lecturer = getLecturerById(entry.lecturerId);
                                                const room = getRoomById(entry.roomId);

                                                if (!subject || !lecturer || !room) return null;

                                                const bgColor = generatePastelColor(subject.id);
                                                const textColor = '#1e293b';
                                                const borderColor = subject.isComplete ? '#94a3b8' : generatePastelColor(subject.id + 'border').replace('80%', '60%');

                                                return (
                                                    <div
                                                        key={entry.id}
                                                        draggable={isEditable}
                                                        onDragStart={(e) => handleDragStart(e, entry)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`flex-1 flex flex-col rounded-lg shadow-sm hover:shadow-md transition-all border-l-[4px] overflow-hidden min-w-[50px] ${isEditable ? 'cursor-grab active:cursor-grabbing hover:-translate-y-0.5' : ''}`}
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
                                                                <ExclamationTriangleIcon className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}

                                                        <div className="p-1.5 flex flex-col h-full justify-between">
                                                            <div className="space-y-0.5">
                                                                <div className="flex justify-between items-start gap-1">
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 leading-tight truncate">{subject.code}</span>
                                                                    <span className="text-[8px] font-mono bg-black/10 px-1 py-0.5 rounded text-slate-800 font-semibold truncate">{room.shortName || room.name}</span>
                                                                </div>
                                                                <p className="font-bold text-[10px] leading-tight line-clamp-2 text-slate-900">{subject.name}</p>
                                                            </div>

                                                            <div className="mt-1 pt-0.5 border-t border-black/10 flex flex-col gap-0">
                                                                <p className="text-[9px] font-medium text-slate-700 truncate flex items-center gap-1">
                                                                    <span className="w-3.5 h-3.5 bg-slate-200 rounded-full flex items-center justify-center text-[7px] font-bold text-slate-600">{getInitials(lecturer.name)}</span>
                                                                    {lecturer.name.split(' ').pop()}
                                                                </p>
                                                                {renderCellActions && renderCellActions(entry)}
                                                                {renderCellFooter && renderCellFooter(entry)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                );

                                i += colSpan - 1;
                            } else if (isBreakSlot) {
                                rowCells.push(
                                    <td key={`break-${day}-${breakObj?.id}`} className="p-1 border border-slate-200 dark:border-slate-600 align-top bg-slate-50/50 dark:bg-slate-700/30">
                                        <div className="h-full flex items-center justify-center rounded-sm">
                                            <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 tracking-widest uppercase rotate-180 whitespace-nowrap [writing-mode:vertical-lr]">
                                                {breakObj?.name || 'BREAK'}
                                            </span>
                                        </div>
                                    </td>
                                );
                            } else {
                                rowCells.push(
                                    <td
                                        key={`${day}-${slot.start}`}
                                        className={`p-1 border border-slate-200 dark:border-slate-600 align-top transition-colors duration-200 ${hoveredSlot?.day === day && hoveredSlot?.startTime === slot.start
                                            ? dropValidation?.isValid
                                                ? 'bg-emerald-50/80 dark:bg-emerald-900/40 ring-2 ring-inset ring-emerald-500'
                                                : 'bg-rose-50/80 dark:bg-rose-900/40 ring-2 ring-inset ring-rose-500'
                                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                            }`}
                                        style={{ minWidth: '64px' }}
                                        onDragOver={(e) => handleDragOver(e, day, slot.start)}
                                        onDrop={(e) => handleDrop(e, day, slot.start)}
                                    />
                                );
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
