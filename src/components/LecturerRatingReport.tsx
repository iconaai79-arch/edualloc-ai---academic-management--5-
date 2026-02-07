import React, { useMemo, useState } from 'react';
import type { LessonRating, User, Subject, Department } from '../types';
import { StarIcon } from './icons';

interface LecturerRatingReportProps {
    ratings: LessonRating[];
    lecturers: User[];
    subjects: Subject[];
    departments: Department[];
    currentUser: User;
}

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className={`w-5 h-5 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`} />
            ))}
        </div>
    );
};

export const LecturerRatingReport: React.FC<LecturerRatingReportProps> = ({ ratings, lecturers, subjects, departments, currentUser }) => {
    const [expandedLecturer, setExpandedLecturer] = useState<string | null>(null);

    const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
    const departmentMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);

    const visibleLecturers = useMemo(() => {
        const staff = lecturers.filter(u => u.role === 'lecturer' || u.role === 'hod');
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            return staff.filter(u => u.departmentId === currentUser.departmentId);
        }
        return staff;
    }, [lecturers, currentUser]);

    const lecturerStats = useMemo(() => {
        return visibleLecturers.map(lecturer => {
            const lecturerRatings = ratings.filter(r => r.lecturerId === lecturer.id);
            const totalRatings = lecturerRatings.length;
            const averageRating = totalRatings > 0 ? lecturerRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0;
            const comments = lecturerRatings
                .filter(r => r.comment)
                .map(r => ({
                    comment: r.comment!,
                    timestamp: r.timestamp,
                    timetableEntryId: r.timetableEntryId,
                }))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return {
                lecturer,
                totalRatings,
                averageRating,
                comments,
            };
        }).sort((a, b) => b.averageRating - a.averageRating);
    }, [visibleLecturers, ratings]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">Lecturer Rating Analysis</h3>
            {lecturerStats.length === 0 ? (
                <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400">No rating data is available yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lecturerStats.map(stat => (
                        <div key={stat.lecturer.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                            <div className="p-6">
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white">{stat.lecturer.name}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{departmentMap.get(stat.lecturer.departmentId || '') || 'No Department'}</p>
                                <div className="mt-4 flex items-center gap-4">
                                    <RatingStars rating={stat.averageRating} />
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {stat.averageRating.toFixed(2)}
                                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> ({stat.totalRatings} ratings)</span>
                                    </p>
                                </div>
                                {stat.comments.length > 0 && (
                                    <button
                                        onClick={() => setExpandedLecturer(expandedLecturer === stat.lecturer.id ? null : stat.lecturer.id)}
                                        className="mt-4 text-sm font-medium text-[var(--color-primary)] hover:brightness-125"
                                    >
                                        {expandedLecturer === stat.lecturer.id ? 'Hide Comments' : `View ${stat.comments.length} Comments`}
                                    </button>
                                )}
                            </div>
                            {expandedLecturer === stat.lecturer.id && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto">
                                    <h5 className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-100">Anonymous Comments</h5>
                                    <ul className="space-y-3">
                                        {stat.comments.map((c, index) => {
                                            const entryId = c.timetableEntryId;
                                            const subjectId = ratings.find(r => r.timetableEntryId === entryId)?.timetableEntryId;
                                            const subject = subjectMap.get(subjectId || ''); // This logic is a bit off, need to get subject from timetable entry
                                            return (
                                                <li key={index} className="text-sm text-slate-600 dark:text-slate-300 border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                                                    <p className="italic">"{c.comment}"</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                        {/* Subject info is not directly on rating; would need to find timetable entry. Omitting for now for simplicity. */}
                                                        {new Date(c.timestamp).toLocaleString()}
                                                    </p>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};