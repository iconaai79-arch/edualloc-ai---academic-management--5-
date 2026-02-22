import React from 'react';
import type { Conflict, User, Room, Subject } from '../types';
import { ExclamationTriangleIcon, CheckIcon } from './icons';

interface ConflictReportProps {
    conflicts: Conflict[];
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    getSubjectById: (id: string) => Subject | undefined;
}

export const ConflictReport: React.FC<ConflictReportProps> = ({ conflicts, getLecturerById, getRoomById, getSubjectById }) => {

    if (conflicts.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <CheckIcon className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">No Conflicts Found</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The current timetable has no double bookings for lecturers or rooms.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-lg shadow-sm">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                            Timetable Conflict Report
                        </h3>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                            A total of {conflicts.length} conflict(s) were detected. Please review and resolve these issues by regenerating the timetable or adjusting allocations.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {conflicts.map((conflict, index) => {
                    const resourceName = conflict.type === 'room'
                        ? `Room: ${getRoomById(conflict.resourceId)?.name || 'Unknown'}`
                        : `Lecturer: ${getLecturerById(conflict.resourceId)?.name || 'Unknown'}`;

                    return (
                        <div key={index} className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">
                                    <span className="capitalize">{conflict.type}</span> Conflict - {resourceName}
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {conflict.day} at {conflict.startTime}
                                </p>
                            </div>
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {conflict.conflictingEntries.map(entry => {
                                    const subject = getSubjectById(entry.subjectId);
                                    const lecturer = getLecturerById(entry.lecturerId);
                                    const room = getRoomById(entry.roomId);
                                    return (
                                        <li key={entry.id} className="p-4">
                                            <p className="font-semibold text-sm text-[var(--color-primary)]">{subject?.name || 'Unknown Subject'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Lecturer: {lecturer?.name || 'N/A'}, Room: {room?.name || 'N/A'}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};