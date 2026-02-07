
import React, { useState, useMemo } from 'react';
import type { TimetableEntry, Room, RoomConflict, LetterheadConfig } from '../types';
import { generateAdvisoryReportPdf } from '../services/pdfService';
import { ExclamationIcon, CheckIcon } from './icons';

interface AdvisoryReportViewProps {
    generatedTimetable: TimetableEntry[];
    rooms: Room[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
}

export const AdvisoryReportView: React.FC<AdvisoryReportViewProps> = ({
    generatedTimetable,
    rooms,
    letterheadConfig,
    logoUrl,
    footerImageUrl,
}) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const totalRoomCapacity = useMemo(() => {
        return rooms.reduce((acc, room) => acc + (room.isShared ? room.concurrentSessions || 1 : 1), 0);
    }, [rooms]);

    const roomConflicts = useMemo<RoomConflict[]>(() => {
        if (generatedTimetable.length === 0 || rooms.length === 0) {
            return [];
        }

        const lessonCounts = new Map<string, number>(); // Key: "Day-StartTime"

        for (const entry of generatedTimetable) {
            const key = `${entry.day}-${entry.startTime}`;
            lessonCounts.set(key, (lessonCounts.get(key) || 0) + 1);
        }

        const conflicts: RoomConflict[] = [];

        for (const [key, count] of lessonCounts.entries()) {
            if (count > totalRoomCapacity) {
                const [day, startTime] = key.split('-');
                const entry = generatedTimetable.find(e => e.day === day && e.startTime === startTime);
                if (entry) {
                    conflicts.push({
                        day,
                        startTime,
                        endTime: entry.endTime,
                        concurrentLessons: count,
                        roomShortfall: count - totalRoomCapacity,
                    });
                }
            }
        }

        return conflicts.sort((a, b) => {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            if (a.day !== b.day) return days.indexOf(a.day) - days.indexOf(b.day);
            return a.startTime.localeCompare(b.startTime);
        });
    }, [generatedTimetable, rooms, totalRoomCapacity]);

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const pdfDataUri = await generateAdvisoryReportPdf(
                roomConflicts,
                rooms.length,
                letterheadConfig,
                logoUrl,
                footerImageUrl
            );
            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `Room_Advisory_Report.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('An error occurred while generating the PDF report.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    
    if (generatedTimetable.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <ExclamationIcon className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Advisory Report</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A timetable must be generated first before an advisory report can be created.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <h3 className="text-xl font-semibold">Room Allocation Advisory Report</h3>
                <button
                    onClick={handleGeneratePdf}
                    disabled={isGeneratingPdf || roomConflicts.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--color-primary)] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeneratingPdf ? 'Generating PDF...' : 'Generate PDF Report'}
                </button>
            </div>
            
             <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                <h4 className="text-lg font-medium text-slate-800 dark:text-slate-100">Report Summary</h4>
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Concurrent Room Capacity</p>
                        <p className="mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{totalRoomCapacity}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${roomConflicts.length > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'}`}>
                        <p className={`text-sm font-medium ${roomConflicts.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>Conflicting Time Slots</p>
                        <p className={`mt-1 text-3xl font-semibold ${roomConflicts.length > 0 ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>{roomConflicts.length}</p>
                    </div>
                 </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                 <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Day</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Time Slot</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Concurrent Lessons</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Available Capacity</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">Room Shortfall</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {roomConflicts.length > 0 ? (
                            roomConflicts.map((conflict, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{conflict.day}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{conflict.startTime} - {conflict.endTime}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{conflict.concurrentLessons}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{totalRoomCapacity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">{conflict.roomShortfall}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                                    <CheckIcon className="mx-auto h-8 w-8 text-green-500" />
                                    <p className="mt-2">No room allocation conflicts found in the current timetable.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
