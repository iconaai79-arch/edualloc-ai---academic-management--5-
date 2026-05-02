
import React, { useState, useMemo, useCallback } from 'react';
import type { User, Assessment, AssessmentMark, Subject, Course, AssessmentType } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';


interface AssessmentManagerProps {
    user: User;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    allocatedSubjects: Subject[];
    users: User[];
    courses: Course[];
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssessment: (assessmentId: string) => void;
    onSaveAssessmentMarks: (assessmentId: string, marksData: { studentId: string; marks: number | null; comments?: string }[]) => void;
}

const NewAssessmentForm: React.FC<{
    user: User;
    allocatedSubjects: Subject[];
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onCancel: () => void;
}> = ({ user, allocatedSubjects, onAddAssessment, onCancel }) => {
    const [title, setTitle] = useState('');
    const [subjectId, setSubjectId] = useState(allocatedSubjects[0]?.id || '');
    const [type, setType] = useState<AssessmentType>('formative');
    const [description, setDescription] = useState('');
    const [maxMarks, setMaxMarks] = useState<number | ''>(100);
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !subjectId || !maxMarks || !assessmentDate) {
            alert('Please fill all required fields.');
            return;
        }
        onAddAssessment({
            lecturerId: user.id,
            title,
            subjectId,
            type,
            description,
            maxMarks,
            assessmentDate,
            status: 'Draft',
        });
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg shadow-sm space-y-4 my-6">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Create New Assessment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Subject</label>
                    <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="mt-1 form-select">
                        {allocatedSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Assessment Type</label>
                    <select value={type} onChange={e => setType(e.target.value as AssessmentType)} required className="mt-1 form-select capitalize">
                        <option value="formative">Formative</option>
                        <option value="summative">Summative</option>
                        <option value="diagnostic">Diagnostic</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 form-input" placeholder="e.g., Mid-term Exam, Quiz 1" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Max Marks</label>
                    <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value === '' ? '' : parseInt(e.target.value, 10))} required min="1" className="mt-1 form-input" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Assessment Date</label>
                    <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} required className="mt-1 form-input" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Description (Optional)</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 form-input" placeholder="e.g., Covers chapters 1-3"></textarea>
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Assessment</button>
            </div>
        </form>
    );
};

export const AssessmentManager: React.FC<AssessmentManagerProps> = ({
    user, assessments, assessmentMarks, allocatedSubjects, users, courses, onAddAssessment, onDeleteAssessment, onSaveAssessmentMarks
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [marks, setMarks] = useState<Map<string, { marks: number | null; comments: string }>>(new Map());
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const lecturerAssessments = useMemo(() =>
        assessments.filter(a => a.lecturerId === user.id).sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()),
        [assessments, user.id]
    );

    const studentsForSelectedAssessment = useMemo(() => {
        if (!selectedAssessment) return [];
        const subjectId = selectedAssessment.subjectId;
        const relevantCourseLevels: { courseId: string, courseLevelId: string }[] = [];
        courses.forEach(course => {
            course.levels.forEach(level => {
                if (level.subjectIds.includes(subjectId)) {
                    relevantCourseLevels.push({ courseId: course.id, courseLevelId: level.id });
                }
            });
        });
        return users.filter(u => u.role === 'student' && relevantCourseLevels.some(cl => u.courseId === cl.courseId && u.courseLevelId === cl.courseLevelId))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedAssessment, courses, users]);

    const handleSelectAssessment = useCallback((assessment: Assessment) => {
        setSelectedAssessment(assessment);
        const initialMarks = new Map<string, { marks: number | null; comments: string }>();
        const existingMarks = assessmentMarks.filter(m => m.assessmentId === assessment.id);
        existingMarks.forEach(mark => {
            initialMarks.set(mark.studentId, { marks: mark.marks, comments: mark.comments || '' });
        });
        setMarks(initialMarks);
    }, [assessmentMarks]);

    const handleMarkChange = (studentId: string, value: string) => {
        const numValue = value === '' ? null : parseInt(value, 10);
        if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > selectedAssessment!.maxMarks)) {
            return;
        }
        setMarks(prev => new Map(prev).set(studentId, { ...(prev.get(studentId) || { comments: '' }), marks: numValue }));
    };

    const handleCommentChange = (studentId: string, value: string) => {
        setMarks(prev => new Map(prev).set(studentId, { ...(prev.get(studentId) || { marks: null }), comments: value }));
    };

    const handleSaveMarks = () => {
        if (!selectedAssessment) return;
        setSaveStatus('saving');
        const marksData = Array.from(marks.entries()).map(([studentId, data]) => ({
            studentId,
            marks: data.marks,
            comments: data.comments,
        }));
        onSaveAssessmentMarks(selectedAssessment.id, marksData);
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 1000);
    };

    if (selectedAssessment) {
        return (
            <div className="space-y-4">
                 <button onClick={() => setSelectedAssessment(null)} className="text-sm font-medium text-[var(--color-primary)] hover:brightness-125">&larr; Back to Assessments</button>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold">{selectedAssessment.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {allocatedSubjects.find(s => s.id === selectedAssessment.subjectId)?.name} | Max Marks: {selectedAssessment.maxMarks}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Student</th>
                                <th className="w-32 px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Marks</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Comments</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {studentsForSelectedAssessment.map(student => {
                                const studentMark = marks.get(student.id);
                                return (
                                    <tr key={student.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="font-medium text-slate-900 dark:text-white">{student.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{student.staffId}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                value={studentMark?.marks ?? ''}
                                                onChange={e => handleMarkChange(student.id, e.target.value)}
                                                min="0"
                                                max={selectedAssessment.maxMarks}
                                                className="form-input w-full"
                                                placeholder={`/ ${selectedAssessment.maxMarks}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={studentMark?.comments || ''}
                                                onChange={e => handleCommentChange(student.id, e.target.value)}
                                                className="form-input w-full"
                                                placeholder="Optional comments..."
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end items-center gap-4">
                     {saveStatus === 'saved' && <span className="text-sm font-medium text-green-600 flex items-center gap-2"><CheckIcon className="w-5 h-5"/> Marks Saved!</span>}
                    <button onClick={handleSaveMarks} disabled={saveStatus === 'saving'} className="btn-primary">{saveStatus === 'saving' ? 'Saving...' : 'Save Marks'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; transition: filter 0.15s; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); } .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
            `}</style>
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">My Assessments</h3>
                <button onClick={() => setIsAdding(true)} className="btn-primary inline-flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> New Assessment
                </button>
            </div>
            {isAdding && (
                <NewAssessmentForm user={user} allocatedSubjects={allocatedSubjects} onAddAssessment={onAddAssessment} onCancel={() => setIsAdding(false)} />
            )}
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg">
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {lecturerAssessments.map(assessment => {
                        const subject = allocatedSubjects.find(s => s.id === assessment.subjectId);
                        return (
                            <li key={assessment.id} className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{assessment.title}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                                        <span className="font-semibold text-[var(--color-primary)]">{subject?.name}</span>
                                        <span className="capitalize px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">{assessment.type}</span>
                                        <span>Date: {new Date(assessment.assessmentDate).toLocaleDateString()}</span>
                                        <span>Max Marks: {assessment.maxMarks}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    <button onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete the assessment "${assessment.title}"? This will also remove all marks entered.`)) {
                                            onDeleteAssessment(assessment.id);
                                        }
                                    }} className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                                    <button onClick={() => handleSelectAssessment(assessment)} className="btn-secondary text-sm">Enter Marks</button>
                                </div>
                            </li>
                        );
                    })}
                     {lecturerAssessments.length === 0 && <li className="p-6 text-center text-slate-500">No assessments created yet.</li>}
                </ul>
            </div>
        </div>
    );
};

