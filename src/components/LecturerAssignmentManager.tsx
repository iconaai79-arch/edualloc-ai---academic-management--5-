import React, { useState, useRef, useMemo } from 'react';
import type { Assignment, Submission, Subject, User, SubmissionStatus } from '../types';
import { apiService } from '../services/apiService';
// Added XIcon to the imports
import { PlusIcon } from './icons/PlusIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { XIcon } from './icons/XIcon';

import { Tooltip } from './Tooltip';

interface LecturerAssignmentManagerProps {
    user: User;
    users: User[];
    assignments: Assignment[];
    submissions: Submission[];
    allocatedSubjects: Subject[];
    onAddAssignment: (data: Omit<Assignment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssignment: (assignmentId: string) => void;
    onUpdateSubmission: (submissionId: string, data: Partial<Pick<Submission, 'grade' | 'feedback'>>) => void;
}

const SubmissionStatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";
    if (status === 'graded') {
        return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`}>{status}</span>;
    }
    if (status === 'late') {
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>{status}</span>;
    }
    return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>{status}</span>;
};


export const LecturerAssignmentManager: React.FC<LecturerAssignmentManagerProps> = ({ user, users, assignments, submissions, allocatedSubjects, onAddAssignment, onDeleteAssignment, onUpdateSubmission }) => {
    const [title, setTitle] = useState('');
    const [subjectId, setSubjectId] = useState(allocatedSubjects[0]?.id || '');
    const [dueDate, setDueDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [subjectFilter, setSubjectFilter] = useState('all');

    const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);

    type SubmissionUpdate = { grade?: string; feedback?: string };
    const [submissionUpdates, setSubmissionUpdates] = useState<Record<string, SubmissionUpdate>>({});

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !subjectId || !dueDate || !file) {
            alert('Please fill all fields and select a file.');
            return;
        }
        setIsUploading(true);

        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'pdf';
            const path = `assignments/${user.institutionId}/${user.id}/${timestamp}.${ext}`;

            const uploadedUrl = await apiService.uploadFile('eduai', path, file);

            if (!uploadedUrl) {
                alert("Failed to upload assignment file.");
                return;
            }

            onAddAssignment({
                lecturerId: user.id,
                subjectId,
                title,
                fileDataUrl: uploadedUrl,
                fileName: file.name,
                fileType: file.type,
                // FIXED: Populated both due_date and dueDate to match type definition
                due_date: dueDate,
                dueDate: dueDate,
            });

            setTitle('');
            setSubjectId(allocatedSubjects[0]?.id || '');
            setDueDate('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsAdding(false);
        } catch (error) {
            console.error("File upload failed:", error);
            alert("There was an error uploading the file. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmissionUpdate = (submissionId: string, field: 'grade' | 'feedback', value: string) => {
        const originalSubmission = submissions.find(s => s.id === submissionId);
        setSubmissionUpdates(prev => ({
            ...prev,
            [submissionId]: {
                grade: field === 'grade' ? value : (prev[submissionId]?.grade ?? originalSubmission?.grade ?? ''),
                feedback: field === 'feedback' ? value : (prev[submissionId]?.feedback ?? originalSubmission?.feedback ?? ''),
            }
        }));
    };

    const handleSaveGrades = () => {
        Object.entries(submissionUpdates).forEach(([submissionId, updates]) => {
            const submissionUpdate = updates as SubmissionUpdate;
            if (Object.keys(submissionUpdate).length > 0) {
                const originalSubmission = submissions.find(s => s.id === submissionId);
                const dataToUpdate: Partial<Pick<Submission, 'grade' | 'feedback'>> = {};
                if (submissionUpdate.grade !== undefined && submissionUpdate.grade !== originalSubmission?.grade) {
                    dataToUpdate.grade = submissionUpdate.grade;
                }
                if (submissionUpdate.feedback !== undefined && submissionUpdate.feedback !== originalSubmission?.feedback) {
                    dataToUpdate.feedback = submissionUpdate.feedback;
                }
                if (Object.keys(dataToUpdate).length > 0) {
                    onUpdateSubmission(submissionId, dataToUpdate);
                }
            }
        });
        setSubmissionUpdates({});
        alert('Grades and feedback have been saved.');
    };

    const handleDownloadAll = () => {
        if (!viewingAssignment) return;
        const submissionsForAssignment = submissions.filter(s => s.assignmentId === viewingAssignment.id);
        if (submissionsForAssignment.length === 0) {
            alert('There are no submissions to download.');
            return;
        }
        submissionsForAssignment.forEach(submission => {
            const link = document.createElement('a');
            link.href = submission.fileDataUrl;
            const studentName = (userMap.get(submission.studentId) || 'unknown_student').replace(/\s+/g, '_');
            link.download = `${studentName}_${submission.fileName}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const lecturerAssignments = useMemo(() => {
        return assignments
            // FIXED: Changed filter check to a.dueDate for consistency
            .filter(a => a.lecturerId === user.id && (subjectFilter === 'all' || a.subjectId === subjectFilter))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [assignments, user.id, subjectFilter]);

    return (
        <div className="space-y-6">
            <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: white; }
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .file-input { display: block; width: 100%; text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)]/10 file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/20 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600; }
            `}</style>

            {!viewingAssignment ? (
                <>
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">My Assignments</h3>
                        <button onClick={() => setIsAdding(!isAdding)} className="btn-primary inline-flex items-center gap-2">
                            {isAdding ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                            {isAdding ? 'Cancel' : 'New Assignment'}
                        </button>
                    </div>

                    {isAdding && (
                        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm space-y-4 animate-fade-in-up">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Title</label>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 form-input" placeholder="e.g. Mid-term Project" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Subject</label>
                                    <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="mt-1 form-select">
                                        {allocatedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Due Date</label>
                                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="mt-1 form-input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">File</label>
                                    <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files![0])} required className="mt-1 file-input" />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={isUploading} className="btn-primary">
                                    {isUploading ? 'Uploading...' : 'Create Assignment'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium">Filter by Subject:</label>
                                <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="form-select text-sm py-1">
                                    <option value="all">All Subjects</option>
                                    {allocatedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                            {lecturerAssignments.map(asg => (
                                <li key={asg.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{asg.title}</p>
                                            <p className="text-sm text-[var(--color-primary)] font-medium">
                                                {allocatedSubjects.find(s => s.id === asg.subjectId)?.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due: {new Date(asg.dueDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => setViewingAssignment(asg)} className="btn-secondary text-sm">View Submissions</button>
                                            <button onClick={() => onDeleteAssignment(asg.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {lecturerAssignments.length === 0 && (
                                <li className="p-10 text-center text-slate-500">No assignments found.</li>
                            )}
                        </ul>
                    </div>
                </>
            ) : (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setViewingAssignment(null)} className="text-sm font-medium text-[var(--color-primary)] hover:brightness-125">&larr; Back to Assignments</button>
                        <button onClick={handleDownloadAll} className="btn-secondary text-sm inline-flex items-center gap-2"><DocumentArrowDownIcon className="w-4 h-4" /> Download All Submissions</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm mb-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold">{viewingAssignment.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {allocatedSubjects.find(s => s.id === viewingAssignment.subjectId)?.name} |
                            Submissions: {submissions.filter(s => s.assignmentId === viewingAssignment.id).length}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Submitted</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Grade</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Feedback</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {submissions.filter(s => s.assignmentId === viewingAssignment.id).map(sub => (
                                    <tr key={sub.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{userMap.get(sub.studentId)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><SubmissionStatusBadge status={sub.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="text"
                                                value={submissionUpdates[sub.id]?.grade ?? sub.grade ?? ''}
                                                onChange={e => handleSubmissionUpdate(sub.id, 'grade', e.target.value)}
                                                className="form-input w-20 text-center"
                                                placeholder="Grade"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={submissionUpdates[sub.id]?.feedback ?? sub.feedback ?? ''}
                                                onChange={e => handleSubmissionUpdate(sub.id, 'feedback', e.target.value)}
                                                className="form-input min-w-[200px]"
                                                placeholder="Enter feedback..."
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a href={sub.fileDataUrl} download={sub.fileName} className="text-[var(--color-primary)] hover:underline text-sm font-medium">Download</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleSaveGrades} className="btn-primary">Save All Changes</button>
                    </div>
                </div>
            )}
        </div>
    );
};
