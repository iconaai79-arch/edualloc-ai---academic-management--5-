
import React, { useMemo, useState } from 'react';
import type { Subject, Course, TimetableEntry, LessonStructure, LetterheadConfig } from '../types';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { EyeIcon } from './icons/EyeIcon';

import { generateCourseProgressPdf } from '../services/pdfService';

interface CourseProgressReportProps {
    subjects: Subject[];
    courses: Course[];
    allTimetableEntries: TimetableEntry[];
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
    onPreviewPdf?: (url: string, filename: string) => void;
}

const calculateTotalPeriods = (structure: LessonStructure[] | undefined): number => {
    if (!structure || !Array.isArray(structure)) return 0;
    return structure.reduce((sum, s) => sum + (s.periods || 0) * (s.count || 0), 0);
};

export const CourseProgressReport: React.FC<CourseProgressReportProps> = ({
    subjects, courses, allTimetableEntries, letterheadConfig, footerImageUrl, onPreviewPdf
}) => {
    const [courseFilter, setCourseFilter] = useState('all');
    const [levelFilter, setLevelFilter] = useState('all');
    const [isGenerating, setIsGenerating] = useState(false);

    const filteredCourses = useMemo(() => {
        if (courseFilter === 'all') return courses;
        return courses.filter(c => c.id === courseFilter);
    }, [courses, courseFilter]);

    const reportData = useMemo(() => {
        return filteredCourses.map(course => {
            const rawLevels = (course.levels && course.levels.length > 0)
                ? course.levels
                : [{ id: course.id, name: course.name, subjectIds: (course as any).subjectIds || subjects.map(s => s.id) }];
            const courseLevels = rawLevels.filter(l => levelFilter === 'all' || l.id === levelFilter);
            const levelStats = courseLevels.map(level => {
                const levelSubjectIds = level.subjectIds || [];
                const levelSubjects = subjects.filter(s => levelSubjectIds.includes(s.id) || levelSubjectIds.length === 0);

                const subjectProgress = levelSubjects.map(subject => {
                    const meta = (level.subjectMetadata || []).find(m => m.subjectId === subject.id);
                    const structure = meta?.lessonStructure || subject.lessonStructure || [];
                    const required = calculateTotalPeriods(structure);
                    const scheduled = allTimetableEntries.filter(entry =>
                        entry.subjectId === subject.id &&
                        (entry.courseLevelId === level.id || entry.courseId === course.id)
                    ).length;

                    return {
                        id: subject.id,
                        name: subject.name,
                        code: subject.code,
                        required,
                        scheduled,
                        percent: required > 0 ? Math.min(100, Math.round((scheduled / required) * 100)) : 100
                    };
                });

                const totalRequired = subjectProgress.reduce((sum, s) => sum + s.required, 0);
                const totalScheduled = subjectProgress.reduce((sum, s) => sum + s.scheduled, 0);
                const overallPercent = totalRequired > 0 ? Math.min(100, Math.round((totalScheduled / totalRequired) * 100)) : 100;

                return {
                    id: level.id,
                    name: level.name,
                    overallPercent,
                    subjects: subjectProgress
                };
            });

            return {
                id: course.id,
                name: course.name,
                levels: levelStats
            };
        }).filter(c => c.levels.length > 0);
    }, [subjects, filteredCourses, allTimetableEntries, levelFilter]);

    const handlePreviewPdf = async () => {
        setIsGenerating(true);
        try {
            const pdfUrl = await generateCourseProgressPdf(
                reportData,
                "Academic Coverage Analysis Report",
                letterheadConfig,
                footerImageUrl || null
            );
            onPreviewPdf?.(pdfUrl, `Course_Progress_Report.pdf`);
        } catch (err) {
            console.error(err);
            alert("Failed to generate PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in-up">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Coverage Analysis</h3>
                    <p className="text-sm text-slate-500">Comparison of required teaching hours vs. actual scheduled hours.</p>
                </div>

                <div className="flex flex-wrap gap-2 no-print">
                    <button
                        onClick={() => window.print()}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 hover:text-indigo-600 transition-all shadow-sm"
                        title="Print View"
                    >
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handlePreviewPdf}
                        disabled={isGenerating}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isGenerating ? "Preparing..." : <><EyeIcon className="w-4 h-4" /> PDF Preview</>}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 no-print">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Filter Course</label>
                    <select
                        value={courseFilter}
                        onChange={(e) => { setCourseFilter(e.target.value); setLevelFilter('all'); }}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                        <option value="all">All Courses</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Filter Stream/Level</label>
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    >
                        <option value="all">All Streams</option>
                        {courseFilter !== 'all' && courses.find(c => c.id === courseFilter)?.levels?.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {reportData.map(course => (
                <div key={course.id} className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4">
                        <AcademicCapIcon className="w-6 h-6 text-indigo-600" />
                        <h4 className="text-xl font-black uppercase text-slate-800 dark:text-slate-100">{course.name}</h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {course.levels.map(level => (
                            <div key={level.id} className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-6">
                                    <h5 className="font-black text-slate-500 uppercase tracking-widest text-[10px]">{level.name} - Overall Coverage</h5>
                                    <span className={`text-lg font-black ${level.overallPercent >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                        {level.overallPercent}%
                                    </span>
                                </div>

                                <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 mb-8 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${level.overallPercent >= 100 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-indigo-500'}`}
                                        style={{ width: `${level.overallPercent}%` }}
                                    ></div>
                                </div>

                                <div className="space-y-4">
                                    {level.subjects.map(subject => (
                                        <div key={subject.id} className="group">
                                            <div className="flex justify-between items-end mb-1">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{subject.name}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{subject.code}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black mr-2 text-slate-500">{subject.scheduled} / {subject.required} Pds</span>
                                                    <span className={`text-xs font-black ${subject.percent >= 100 ? 'text-emerald-600' : subject.percent < 50 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {subject.percent}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-700 ${subject.percent >= 100 ? 'bg-emerald-500' : subject.percent < 50 ? 'bg-rose-500' : 'bg-indigo-400'}`}
                                                    style={{ width: `${subject.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {reportData.length === 0 && (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <ExclamationTriangleIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No matching records found.</p>
                </div>
            )}
        </div>
    );
};

