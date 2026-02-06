import React, { useState, useRef, useMemo } from 'react';
import type { Assignment, Submission, Subject, User, SubmissionStatus } from './types.ts';
import { PlusIcon, DocumentArrowDownIcon, PencilIcon, XIcon, CheckIcon, ArchiveBoxIcon, SparklesIcon } from './components/icons/index.ts';
import { Tooltip } from './components/Tooltip.tsx';

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
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-widest";
    if (status === 'graded') {
      return <span className={`${baseClasses} bg-green-50 text-green-700`}>{status}</span>;
    }
    if (status === 'late') {
      return <span className={`${baseClasses} bg-red-50 text-red-700`}>{status}</span>;
    }
    return <span className={`${baseClasses} bg-blue-50 text-blue-700`}>{status}</span>;
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

    const userMap = useMemo(() => new Map((users || []).map(u => [u.id, u.name])), [users]);

    const lecturerAssignments = useMemo(() => {
        return (assignments || [])
            .filter(a => a.lecturerId === user.id && (subjectFilter === 'all' || a.subjectId === subjectFilter))
            // FIXED: Standardized usage of dueDate based on type definition
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [assignments, user.id, subjectFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !subjectId || !dueDate || !file) {
            alert('Please complete the registry entry.');
            return;
        }
        setIsUploading(true);
        try {
            const fileDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });
            onAddAssignment({
                lecturerId: user.id,
                subjectId,
                title,
                fileDataUrl,
                fileName: file.name,
                fileType: file.type,
                // FIXED: Populated both due_date and dueDate to match type definition and satisfy Omit
                due_date: dueDate,
                dueDate: dueDate,
            });
            setTitle(''); setDueDate(''); setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsAdding(false);
        } catch (error) {
            alert("File upload failed.");
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleSubmissionUpdate = (submissionId: string, field: 'grade' | 'feedback', value: string) => {
        const originalSubmission = (submissions || []).find(s => s.id === submissionId);
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
            const originalSubmission = (submissions || []).find(s => s.id === submissionId);
            const dataToUpdate: Partial<Pick<Submission, 'grade' | 'feedback'>> = {};
            const typedUpdates = updates as SubmissionUpdate;
            if (typedUpdates.grade !== undefined && typedUpdates.grade !== originalSubmission?.grade) dataToUpdate.grade = typedUpdates.grade;
            if (typedUpdates.feedback !== undefined && typedUpdates.feedback !== originalSubmission?.feedback) dataToUpdate.feedback = typedUpdates.feedback;
            if (Object.keys(dataToUpdate).length > 0) onUpdateSubmission(submissionId, dataToUpdate);
        });
        setSubmissionUpdates({});
        alert('Registry grades synchronized.');
    };

    if (viewingAssignment) {
        const subject = (allocatedSubjects || []).find(s => s.id === viewingAssignment.subjectId);
        const submissionsForAssignment = (submissions || []).filter(s => s.assignmentId === viewingAssignment.id);
        
        return (
            <div className="space-y-6 animate-fade-in-up">
                <button onClick={() => setViewingAssignment(null)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline flex items-center gap-2">&larr; Return to Library</button>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{viewingAssignment.title}</h3>
                        {/* FIXED: Standardized usage of dueDate */}
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subject?.name} • Due: {new Date(viewingAssignment.dueDate).toLocaleDateString()}</p>
                    </div>
                    <button onClick={handleSaveGrades} className="btn-primary h-12 px-8 shadow-indigo-100 uppercase text-xs tracking-widest">Commit Grades</button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Member</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry Sync</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Feedback</th>
                                    <th className="px-8 py-5 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {submissionsForAssignment.map(sub => (
                                    <tr key={sub.id} className="hover:bg-slate-50/50">
                                        <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{userMap.get(sub.studentId) || 'Unknown Student'}</td>
                                        <td className="px-8 py-5 whitespace-nowrap font-mono text-xs text-slate-400">{new Date(sub.submittedAt).toLocaleString()}</td>
                                        <td className="px-8 py-5"><SubmissionStatusBadge status={sub.status} /></td>
                                        <td className="px-8 py-5"><input type="text" value={submissionUpdates[sub.id]?.grade ?? sub.grade ?? ''} onChange={e => handleSubmissionUpdate(sub.id, 'grade', e.target.value)} className="w-16 h-10 border rounded-xl text-center font-black uppercase text-xs" /></td>
                                        <td className="px-8 py-5"><input type="text" value={submissionUpdates[sub.id]?.feedback ?? sub.feedback ?? ''} onChange={e => handleSubmissionUpdate(sub.id, 'feedback', e.target.value)} className="w-full h-10 border rounded-xl px-4 text-xs italic" placeholder="Add remark..." /></td>
                                        <td className="px-8 py-5 text-right"><a href={sub.fileDataUrl} download={sub.fileName} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Download</a></td>
                                    </tr>
                                ))}
                                {submissionsForAssignment.length === 0 && (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-black uppercase tracking-[0.3em] opacity-30">Registry Empty</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Content Repository</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assignments & Courseware</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="form-select h-11 text-[10px] font-black uppercase tracking-widest w-48">
                        <option value="all">Full Curriculum</option>
                        {(allocatedSubjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={() => setIsAdding(!isAdding)} className="btn-primary h-11 flex items-center gap-2 px-8 uppercase text-[10px] font-black tracking-widest shadow-indigo-100">
                        {isAdding ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />} {isAdding ? 'Cancel' : 'Dispatch Assignment'}
                    </button>
                </div>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Dispatch Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="e.g. End of Unit Assessment" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Curriculum Link</label>
                            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="form-select" required>
                                {(allocatedSubjects || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Registry Deadline</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="form-input" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Document Attachment</label>
                            <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="mt-1 file-input" required />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <button type="submit" disabled={isUploading} className="btn-primary h-12 px-12 shadow-indigo-200">
                             {isUploading ? 'Syncing...' : 'Dispatch to Students'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lecturerAssignments.map(asg => {
                    const subject = (allocatedSubjects || []).find(s => s.id === asg.subjectId);
                    const subCount = (submissions || []).filter(s => s.assignmentId === asg.id).length;
                    return (
                        <div key={asg.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm transition-all hover:shadow-xl hover:border-indigo-200 group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900 rounded-2xl text-indigo-600 shadow-sm">
                                    <ArchiveBoxIcon className="w-6 h-6" />
                                </div>
                                {/* FIXED: Standardized usage of dueDate */}
                                <span className="text-[10px] font-black uppercase text-slate-400">{new Date(asg.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex-grow">
                                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{asg.title}</h4>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">{subject?.name}</p>
                            </div>
                            <div className="mt-8 pt-6 border-t flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{subCount}</span>
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Submissions<br/>Recorded</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => setViewingAssignment(asg)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><SparklesIcon className="w-5 h-5" /></button>
                                    <button onClick={() => { if(window.confirm('Purge this record?')) onDeleteAssignment(asg.id); }} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><XIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {lecturerAssignments.length === 0 && (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-[3rem] border-4 border-dashed border-slate-50 dark:border-slate-800 text-center opacity-30">
                        <ArchiveBoxIcon className="w-20 h-20 text-slate-200 mb-6" />
                        <h4 className="text-2xl font-black uppercase tracking-[0.3em]">Registry Empty</h4>
                    </div>
                )}
            </div>
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .file-input { display: block; width: 100%; text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all; }
            `}</style>
        </div>
    );
};