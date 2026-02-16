
import React, { useMemo } from 'react';
import type { TimetableEntry, Subject, User, Room, Course, TimetableSettings } from '../types';
import { timeToMinutes } from '../utils/timeUtils';
import { generatePastelColor } from '../utils/colorUtils';

interface LecturerTimetableListProps {
    entries: TimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    courses: Course[];
    timetableSettings: TimetableSettings;
}

export const LecturerTimetableList: React.FC<LecturerTimetableListProps> = ({
    entries,
    getSubjectById,
    getRoomById,
    courses,
    timetableSettings
}) => {
    const dayOrder = timetableSettings.operatingDays || [];

    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            const dayDiff = dayOrder.indexOf(a.day as any) - dayOrder.indexOf(b.day as any);
            if (dayDiff !== 0) return dayDiff;
            return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
        });
    }, [entries, dayOrder]);

    if (entries.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 font-medium italic">
                No lessons scheduled for the current selection.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Day</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Time</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Class / Grade</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Room</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedEntries.map((entry) => {
                        const subject = getSubjectById(entry.subjectId);
                        const room = getRoomById(entry.roomId);

                        let className = 'N/A';
                        for (const c of courses) {
                            const lvl = c.levels.find(l => (l.subjectIds || []).includes(entry.subjectId));
                            if (lvl) {
                                className = `${c.code} ${lvl.name}`;
                                break;
                            }
                        }

                        return (
                            <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-900 dark:text-white uppercase">{entry.day}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">{entry.startTime} - {entry.endTime}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: generatePastelColor(entry.subjectId) }} />
                                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{subject?.name || subject?.shortName || subject?.code}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-tight">{className}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-indigo-600 dark:text-indigo-400">{room?.name || 'N/A'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
