
import React, { useMemo } from 'react';
import type { Room, TimetableEntry, Course, Subject } from '../types';
import { BuildingOfficeIcon, UserGroupIcon, ExclamationTriangleIcon, CheckCircleIcon } from './icons';

interface EnrollmentCapacityReportProps {
    rooms: Room[];
    allTimetableEntries: TimetableEntry[];
    courseSizes: Map<string, number>;
    courses: Course[];
    subjects: Subject[];
}

export const EnrollmentCapacityReport: React.FC<EnrollmentCapacityReportProps> = ({
    rooms,
    allTimetableEntries,
    courseSizes,
    courses,
    subjects
}) => {
    const analysis = useMemo(() => {
        const roomUsage = rooms.map(room => {
            const sessions = allTimetableEntries.filter(e => e.roomId === room.id);

            const sessionInsights = sessions.map(session => {
                const enrollment = courseSizes.get(session.courseLevelId) || 0;
                const capacity = room.capacity || 0;
                const ratio = capacity > 0 ? (enrollment / capacity) * 100 : 0;
                const isOvercrowded = enrollment > capacity;

                const courseName = courses.find(c => c.id === session.courseId)?.name || 'Unknown Course';
                const levelName = courses.flatMap(c => c.levels).find(l => l?.id === session.courseLevelId)?.name || 'Unknown Level';
                const subjectName = subjects.find(s => s.id === session.subjectId)?.name || 'Unknown Subject';

                return {
                    day: session.day,
                    time: session.startTime,
                    subjectName,
                    className: `${courseName} - ${levelName}`,
                    enrollment,
                    capacity,
                    ratio,
                    isOvercrowded
                };
            });

            const maxEnrollment = sessionInsights.length > 0 ? Math.max(...sessionInsights.map(s => s.enrollment)) : 0;
            const avgRatio = sessionInsights.length > 0 ? sessionInsights.reduce((sum, s) => sum + s.ratio, 0) / sessionInsights.length : 0;
            const overcrowdedSessions = sessionInsights.filter(s => s.isOvercrowded).length;

            return {
                roomId: room.id,
                roomName: room.name,
                capacity: room.capacity,
                sessionCount: sessions.length,
                maxEnrollment,
                avgRatio,
                overcrowdedSessions,
                sessionInsights
            };
        });

        return roomUsage.sort((a, b) => b.overcrowdedSessions - a.overcrowdedSessions || b.avgRatio - a.avgRatio);
    }, [rooms, allTimetableEntries, courseSizes, courses, subjects]);

    return (
        <div className="space-y-10 animate-fade-in-up">
            <header>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Space vs. Enrollment Analysis</h3>
                <p className="text-sm text-slate-500">Identifying overcrowding risks and optimizing lecture hall utilization based on actual student density.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Critical Areas</h4>
                    <p className="text-3xl font-black text-rose-600 tracking-tighter">
                        {analysis.filter(r => r.overcrowdedSessions > 0).length} Rooms
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Avg. Occupancy</h4>
                    <p className="text-3xl font-black text-indigo-600 tracking-tighter">
                        {Math.round(analysis.reduce((sum, r) => sum + r.avgRatio, 0) / (analysis.length || 1))}%
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Optimized Space</h4>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                        {analysis.filter(r => r.avgRatio > 50 && r.avgRatio <= 100).length} Rooms
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Low Utilization</h4>
                    <p className="text-3xl font-black text-amber-600 tracking-tighter">
                        {analysis.filter(r => r.sessionCount > 0 && r.avgRatio < 30).length} Rooms
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Facility / Space</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Capacity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Peak Density</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Coverage</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Risk Assessment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                            {analysis.map(room => (
                                <tr key={room.roomId} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${room.overcrowdedSessions > 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
                                                <BuildingOfficeIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{room.roomName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{room.sessionCount} Active Sessions</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="text-sm font-black text-slate-600 dark:text-slate-400">{room.capacity}</span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <UserGroupIcon className="w-3 h-3" />
                                            {room.maxEnrollment} Students
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="max-w-[120px] mx-auto">
                                            <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
                                                <span>{Math.round(room.avgRatio)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-700 ${room.avgRatio > 100 ? 'bg-rose-500' : room.avgRatio > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(100, room.avgRatio)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        {room.overcrowdedSessions > 0 ? (
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl animate-pulse">
                                                <ExclamationTriangleIcon className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">
                                                    {room.overcrowdedSessions} Overcrowded Session(s)
                                                </span>
                                            </div>
                                        ) : room.sessionCount === 0 ? (
                                            <span className="text-[10px] font-black uppercase text-slate-400">Not in Use</span>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 text-emerald-600">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">Optimal</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
