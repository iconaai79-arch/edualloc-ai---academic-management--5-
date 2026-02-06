import React, { useMemo } from 'react';
import type { ExamTimetableEntry, Subject, User, Room, Building, Course } from './types';

interface ExamTimetableGridProps {
    entries: ExamTimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined; // For invigilator
    getRoomById: (id: string) => Room | undefined;
    buildings: Building[];
    courses: Course[];
    title: string;
}

export const ExamTimetableGrid: React.FC<ExamTimetableGridProps> = ({ entries, getSubjectById, getLecturerById, getRoomById, buildings, courses, title }) => {
    const groupedByDate = useMemo(() => {
        const groups = new Map<string, ExamTimetableEntry[]>();
        entries.forEach(entry => {
            const date = entry.date;
            if (!groups.has(date)) {
                groups.set(date, []);
            }
            groups.get(date)!.push(entry);
        });
        return new Map([...groups.entries()].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()));
    }, [entries]);

    if (entries.length === 0) {
        return <div className="p-6 text-center text-slate-500">No exam schedule found.</div>;
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">{title}</h3>
            {Array.from(groupedByDate.entries()).map(([date, dateEntries]) => (
                <div key={date}>
                    <h4 className="font-bold text-lg mb-2">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Subject</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Course & Level</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Room</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Invigilator</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {dateEntries.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(entry => {
                                    const subject = getSubjectById(entry.subjectId);
                                    const room = getRoomById(entry.roomId);
                                    const invigilator = getLecturerById(entry.invigilatorId);
                                    const building = room ? buildings.find(b => b.id === room.buildingId) : undefined;
                                    const roomText = room ? `${building?.name || ''} - ${room.name}` : 'N/A';
                                    const course = courses.find(c => c.id === entry.courseId);
                                    const level = course?.levels.find(l => l.id === entry.courseLevelId);
                                    const courseText = course ? `${course.name} (${level?.name || 'N/A'})` : 'N/A';
                                    
                                    return (
                                        <tr key={entry.id}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{entry.startTime} - {entry.endTime}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{subject?.name} ({subject?.code})</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{courseText}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{roomText}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm">{invigilator?.name}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};