import React, { useState, useRef, useMemo } from 'react';
import type { Assignment, Submission, Subject, User, SubmissionStatus } from '../types';
import { apiService } from '../services/apiService';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { CheckIcon } from './icons/CheckIcon';


interface StudentAssignmentManagerProps {
    user: User;
    assignments: Assignment[];
    submissions: Submission[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    onAddSubmission: (data: Omit<Submission, 'id' | 'institutionId'>) => void;
}

const AssignmentItem: React.FC<{
    assignment: Assignment;
    subject?: Subject;
    lecturer?: User;
    submission?: Submission;
    onSelectFile: (assignmentId: string, file: File) => void;
    isUploading: boolean;
    submittingId: string | null;
    startSubmission: (assignmentId: string) => void;
}> = ({ assignment, subject, lecturer, submission, onSelectFile, isUploading, submittingId, startSubmission }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = assignment.fileDataUrl;
        link.download = assignment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        const fileType = assignment.fileType;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups to print the assignment.');
            return;
        }

        if (fileType.startsWith('image/')) {
            printWindow.document.write(`<html><head><title>Print</title></head><body><img loading="lazy" src="${assignment.fileDataUrl}" style="max-width: 100%;" onload="window.print(); window.close();" /></body></html>`);
        } else if (fileType === 'application/pdf') {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print Assignment</title>
                    <style>
                        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
                        iframe { border: none; width: 100%; height: 100%; }
                    </style>
                </head>
                <body>
                    <iframe id="pdfFrame" src="${assignment.fileDataUrl}" title="PDF Print"></iframe>
                    <script>
                        const iframe = document.getElementById('pdfFrame');
                        iframe.onload = () => {
                            setTimeout(() => {
                                try {
                                    iframe.contentWindow.focus();
                                    iframe.contentWindow.print();
                                } catch (e) {
                                    console.error("Iframe print failed, falling back to window print:", e);
                                    window.print();
                                }
                            }, 1000);
                        };
                    </script>
                </body>
                </html>
            `);
        } else {
            printWindow.location.href = assignment.fileDataUrl;
        }
        printWindow.document.close();
    };

    /* FIXED: Changed dueDate to due_date to match type definition */
    const isOverdue = new Date(assignment.due_date) < new Date();
    const isSubmittingThis = submittingId === assignment.id;

    return (
        <li className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{assignment.title}</p>
                    <p className="text-sm text-[var(--color-primary)] font-medium">{subject?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">From: {lecturer?.name || 'N/A'}</p>
                    {/* FIXED: Changed dueDate to due_date to match type definition */}
                    <p className={`text-xs font-semibold mt-1 ${isOverdue && !submission ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        Due: {new Date(assignment.due_date).toLocaleDateString()} {isOverdue && !submission ? '(Overdue)' : ''}
                    </p>
                </div>
                {!submission && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={handleDownload} className="btn-secondary text-sm inline-flex items-center gap-2"><DocumentArrowDownIcon className="w-4 h-4" /> Download</button>
                        <button onClick={handlePrint} className="btn-secondary text-sm inline-flex items-center gap-2"><PrinterIcon className="w-4 h-4" /> Print</button>
                    </div>
                )}
            </div>
            {submission ? (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md text-green-800 bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                    <CheckIcon className="w-5 h-5" />
                    Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {isSubmittingThis ? (
                        <div className="flex items-center gap-4">
                            <input type="file" ref={fileInputRef} onChange={e => onSelectFile(assignment.id, e.target.files![0])} className="file-input flex-grow" required />
                            <button type="button" disabled={isUploading} className="btn-primary text-sm">{isUploading ? 'Uploading...' : 'Submit'}</button>
                        </div>
                    ) : (
                        <button onClick={() => startSubmission(assignment.id)} className="btn-primary text-sm">Submit Work</button>
                    )}
                </div>
            )}
        </li>
    );
};


export const StudentAssignmentManager: React.FC<StudentAssignmentManagerProps> = ({ user, assignments, submissions, getSubjectById, getLecturerById, onAddSubmission }) => {
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const enrolledSubjectIds = new Set(user.enrolledSubjectIds || []);
    /* FIXED: Changed dueDate to due_date to match type definition */
    const relevantAssignments = assignments.filter(a => enrolledSubjectIds.has(a.subjectId))
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const studentSubmissions = submissions.filter(s => s.studentId === user.id);
    const submittedAssignmentIds = new Set(studentSubmissions.map(s => s.assignmentId));

    const newAssignments = relevantAssignments.filter(a => !submittedAssignmentIds.has(a.id));
    const submittedAssignments = relevantAssignments.filter(a => submittedAssignmentIds.has(a.id));

    const handleSelectFile = (assignmentId: string, selectedFile: File) => {
        if (submittingId === assignmentId && selectedFile) {
            setFile(selectedFile);
            // Immediately trigger submission after file selection
            handleSubmit(assignmentId, selectedFile);
        }
    };

    const handleSubmit = async (assignmentId: string, fileToSubmit: File) => {
        if (!fileToSubmit) {
            alert('Please select a file to submit.');
            return;
        }

        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) {
            alert('Could not find the assignment to submit to.');
            return;
        }

        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const ext = fileToSubmit.name.split('.').pop() || 'pdf';
            const path = `submissions/${assignment.institutionId}/${assignmentId}/${user.id}/${timestamp}.${ext}`;

            const uploadedUrl = await apiService.uploadFile('eduai', path, fileToSubmit);

            if (!uploadedUrl) {
                alert("Failed to upload submission.");
                return;
            }

            /* FIXED: Changed dueDate to due_date to match type definition */
            const isLate = new Date() > new Date(assignment.due_date);
            const status: SubmissionStatus = isLate ? 'late' : 'submitted';

            onAddSubmission({
                assignmentId,
                studentId: user.id,
                fileDataUrl: uploadedUrl,
                fileName: fileToSubmit.name,
                fileType: fileToSubmit.type,
                submittedAt: new Date().toISOString(),
                status,
            });
            setSubmittingId(null);
            setFile(null);
        } catch (error) {
            console.error('Error uploading submission:', error);
            alert('Failed to upload submission.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .file-input { display: block; width: 100%; text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)]/10 file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/20 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600; }
            `}</style>
            <section>
                <h3 className="text-xl font-semibold mb-4">New Assignments ({newAssignments.length})</h3>
                <ul className="space-y-4">
                    {newAssignments.length > 0 ? newAssignments.map(asg => (
                        <AssignmentItem
                            key={asg.id}
                            assignment={asg}
                            subject={getSubjectById(asg.subjectId)}
                            lecturer={getLecturerById(asg.lecturerId)}
                            onSelectFile={handleSelectFile}
                            isUploading={isUploading}
                            submittingId={submittingId}
                            startSubmission={setSubmittingId}
                        />
                    )) : (
                        <li className="p-6 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            You have no new assignments. Great job!
                        </li>
                    )}
                </ul>
            </section>
            <section>
                <h3 className="text-xl font-semibold mb-4">Submitted Assignments ({submittedAssignments.length})</h3>
                <ul className="space-y-4">
                    {submittedAssignments.length > 0 ? submittedAssignments.map(asg => (
                        <AssignmentItem
                            key={asg.id}
                            assignment={asg}
                            subject={getSubjectById(asg.subjectId)}
                            lecturer={getLecturerById(asg.lecturerId)}
                            submission={studentSubmissions.find(s => s.assignmentId === asg.id)}
                            onSelectFile={() => { }}
                            isUploading={false}
                            submittingId={null}
                            startSubmission={() => { }}
                        />
                    )) : (
                        <li className="p-6 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            You have not submitted any assignments yet.
                        </li>
                    )}
                </ul>
            </section>
        </div>
    );
};

