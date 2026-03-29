import React, { useState, useMemo, useEffect } from 'react';
import type { User, Assessment, AssessmentMark, Subject, Course, Department, LetterheadConfig, AssessmentType } from '../types';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';


interface AssessmentReportsProps {
    currentUser: User;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    users: User[];
    subjects: Subject[];
    courses: Course[];
    departments: Department[];
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
}

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(100, Math.max(0, value));
    let colorClass = 'bg-sky-500';
    if (percentage < 40) colorClass = 'bg-red-500';
    else if (percentage < 70) colorClass = 'bg-yellow-500';
    else colorClass = 'bg-green-500';

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

export const AssessmentReports: React.FC<AssessmentReportsProps> = ({ currentUser, assessments, assessmentMarks, users, subjects, courses, departments }) => {
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');

    const visibleCourses = useMemo(() => {
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            return courses.filter(c => c.departmentId === currentUser.departmentId);
        }
        return courses;
    }, [currentUser, courses]);

    const visibleSubjects = useMemo(() => {
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            return subjects.filter(s => s.departmentId === currentUser.departmentId);
        }
        return subjects;
    }, [currentUser, subjects]);

    const visibleAssessments = useMemo(() => {
        let filtered = assessments;
        if (selectedSubjectId !== 'all') {
            filtered = filtered.filter(a => a.subjectId === selectedSubjectId);
        } else if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            const subjectIds = new Set(visibleSubjects.map(s => s.id));
            filtered = filtered.filter(a => subjectIds.has(a.subjectId));
        }
        return filtered;
    }, [assessments, selectedSubjectId, currentUser, visibleSubjects]);

    const reportData = useMemo(() => {
        if (selectedAssessmentId === 'all') return [];

        const assessment = assessments.find(a => a.id === selectedAssessmentId);
        if (!assessment) return [];
        
        const marksForAssessment = assessmentMarks.filter(m => m.assessmentId === selectedAssessmentId);
        
        const studentsInCourse = selectedCourseId === 'all'
            ? users.filter(u => u.role === 'student')
            : users.filter(u => u.role === 'student' && u.courseId === selectedCourseId);

        return studentsInCourse.map(student => {
            const mark = marksForAssessment.find(m => m.studentId === student.id);
            const score = mark?.marks ?? null;
            const percentage = score !== null ? (score / assessment.maxMarks) * 100 : null;
            return {
                student,
                score,
                percentage,
                comments: mark?.comments || '',
            };
        }).sort((a,b) => a.student.name.localeCompare(b.student.name));

    }, [selectedAssessmentId, selectedCourseId, assessments, assessmentMarks, users]);

    const courseOptions = useMemo(() => {
        if (selectedSubjectId !== 'all') {
            const courseIds = new Set<string>();
            courses.forEach(course => {
                course.levels.forEach(level => {
                    if (level.subjectIds.includes(selectedSubjectId)) {
                        courseIds.add(course.id);
                    }
                });
            });
            return visibleCourses.filter(c => courseIds.has(c.id));
        }
        return visibleCourses;
    }, [selectedSubjectId, courses, visibleCourses]);

    // Reset filters when dependencies change
    useEffect(() => {
        setSelectedCourseId('all');
        setSelectedAssessmentId('all');
    }, [selectedSubjectId]);
    
    useEffect(() => {
        setSelectedAssessmentId('all');
    }, [selectedCourseId]);


    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Filter by Subject</label>
                        <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="mt-1 form-select">
                            <option value="all">All Subjects</option>
                            {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Filter by Course</label>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="mt-1 form-select">
                            <option value="all">All Courses</option>
                            {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Select Assessment</label>
                        <select value={selectedAssessmentId} onChange={e => setSelectedAssessmentId(e.target.value)} className="mt-1 form-select">
                            <option value="all">-- Select to view results --</option>
                            {visibleAssessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            {selectedAssessmentId !== 'all' && (
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Percentage</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {reportData.map(({ student, score, percentage, comments }) => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-xs text-slate-500">{student.staffId}</p>
                                    </td>
                                    <td className="px-6 py-4 font-semibold">{score ?? 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        {percentage !== null ? (
                                            <div className="flex items-center gap-2">
                                                <ProgressBar value={percentage} />
                                                <span>{percentage.toFixed(1)}%</span>
                                            </div>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{comments || '-'}</td>
                                </tr>
                            ))}
                             {reportData.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-10 text-slate-500">No students or marks found for this selection.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <style>{`.form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }`}</style>
        </div>
    );
};
