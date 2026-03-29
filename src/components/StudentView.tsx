
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { User, Course, CourseLevel, TimetableEntry, Subject, Room, TimetableSettings, EnrollmentRequest, Department, LetterheadConfig, Assignment, Submission, LessonRating, FeedbackSubmission, StudentAbsenceRequest, ExamTimetableEntry, Building, Semester, TaAssignment, UserTask, Institution, Assessment, AssessmentMark } from '../types';
import { TimetableGrid } from './TimetableGrid';
import { SubjectCard } from './SubjectCard';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { UserIcon } from './icons/UserIcon';
import { EyeIcon } from './icons/EyeIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';

import { StudentDashboard } from './StudentDashboard';
import { StudentAssignmentManager } from './StudentAssignmentManager';
import { RatingModal } from './RatingModal';
import { FeedbackForm } from './FeedbackForm';
import { generateStudentTimetablePdf } from '../services/pdfService';
import { StudentAbsenceRequestModal } from './StudentAbsenceRequestModal';
import { ExamTimetableGrid } from './ExamTimetableGrid';
import { TAAssignmentsView } from './TAAssignmentsView';
import { NearbyClassesView } from './NearbyClassesView';
import type { StudentAttendance } from '../types';

// --- Enrollment Request Modal ---
interface EnrollmentRequestModalProps {
    subjects: Subject[];
    onClose: () => void;
    onSubmit: (signatureUrl: string | null) => void;
}

const EnrollmentRequestModal: React.FC<EnrollmentRequestModalProps> = ({ subjects, onClose, onSubmit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    const getCanvasContext = () => canvasRef.current?.getContext('2d');

    const getCoordinates = (event: MouseEvent | TouchEvent): { x: number, y: number } | null => {
        if (!canvasRef.current) return null;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (event instanceof MouseEvent) {
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }
        return null;
    };

    const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        const coords = getCoordinates(event);
        if (!coords) return;

        const ctx = getCanvasContext();
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            setIsDrawing(true);
            if (!hasSigned) setHasSigned(true);
        }
    }, [hasSigned]);

    const draw = useCallback((event: MouseEvent | TouchEvent) => {
        if (!isDrawing) return;
        event.preventDefault();
        const coords = getCoordinates(event);
        if (!coords) return;

        const ctx = getCanvasContext();
        if (ctx) {
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
        }
    }, [isDrawing]);

    const stopDrawing = useCallback(() => setIsDrawing(false), []);
    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = getCanvasContext();
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasSigned(false);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        }
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [startDrawing, draw, stopDrawing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const signatureUrl = hasSigned && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
        onSubmit(signatureUrl);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request Subject Enrollment</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You are requesting to enroll in {subjects.length} subject(s):</p>
                        <ul className="mt-2 list-disc list-inside text-sm text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                            {subjects.map(s => <li key={s.id}><span className="font-semibold">{s.code}</span> - {s.name}</li>)}
                        </ul>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Signature Confirmation</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Please sign below to confirm your enrollment request.</p>
                            <div className="mt-1 relative"><canvas ref={canvasRef} width="450" height="150" className="w-full h-auto bg-slate-100 dark:bg-slate-700 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-crosshair touch-none"></canvas></div>
                            <button type="button" onClick={clearSignature} className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:brightness-125">Clear Signature</button>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--color-primary)] text-base font-medium text-white hover:brightness-90 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Submit Request</button>
                        <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Student View Component ---
interface StudentViewProps {
    user: User;
    users: User[];
    courses: Course[];
    subjects: Subject[];
    rooms: Room[];
    departments: Department[];
    enrollmentRequests: EnrollmentRequest[];
    onSubmitEnrollmentRequest: (subjectIds: string[], signatureUrl: string | null) => void;
    generatedTimetable: TimetableEntry[];
    examTimetable: ExamTimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => Room | undefined;
    getLecturerById: (id: string) => User | undefined;
    timetableSettings: TimetableSettings;
    studentCheckIns: Record<string, string>;
    onStudentLessonCheckIn: (timetableEntryId: string) => void;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    assignments: Assignment[];
    submissions: Submission[];
    onAddSubmission: (data: Omit<Submission, 'id' | 'institutionId'>) => void;
    lessonRatings: LessonRating[];
    onAddLessonRating: (timetableEntryId: string, rating: number, comment: string) => void;
    onRateLesson: (lesson: TimetableEntry) => void;
    onAddFeedback: (title: string, content: string, isAnonymous: boolean) => void;
    feedbackSubmissions: FeedbackSubmission[];
    studentAbsenceRequests: StudentAbsenceRequest[];
    onSubmitStudentAbsenceRequest: (data: Omit<StudentAbsenceRequest, 'id' | 'studentId' | 'status' | 'institutionId' | 'timestamp'>) => void;
    buildings: Building[];
    finalTimetableUrl: string | null;
    activeSemester?: Semester | null;
    taAssignments: TaAssignment[];
    userTasks: UserTask[];
    onAddTask: (data: { title: string }) => void;
    onUpdateTask: (taskId: string, isComplete: boolean) => void;
    onDeleteTask: (taskId: string) => void;
    currentInstitution?: Institution | null;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    studentAttendances: StudentAttendance[];
    // Fix: Changed return type to Promise to match App.tsx implementation.
    onAddParent: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent: (studentId: string, parentId: string) => void;
}

const EnrollmentStatusBadge: React.FC<{ status: EnrollmentRequest['status'] }> = ({ status }) => {
    const base = "flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    if (status === 'approved') return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}><CheckIcon className="w-4 h-4 mr-1.5" />Approved</span>;
    if (status === 'rejected') return <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`}><XIcon className="w-4 h-4 mr-1.5" />Rejected</span>;
    return <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`}><ClockIcon className="w-4 h-4 mr-1.5" />Pending</span>;
}

const AbsenceStatusBadge: React.FC<{ status: StudentAbsenceRequest['status'] }> = ({ status }) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";
    if (status === 'approved') {
        return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}>{status}</span>;
    }
    if (status === 'rejected') {
        return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`}>{status}</span>;
    }
    return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`}>{status}</span>;
}

export const StudentView: React.FC<StudentViewProps> = (props) => {
    const {
        user, users, courses, subjects, rooms, departments, enrollmentRequests, onSubmitEnrollmentRequest,
        generatedTimetable, examTimetable, getSubjectById, getRoomById, getLecturerById,
        timetableSettings, studentCheckIns, onStudentLessonCheckIn, letterheadConfig, logoUrl, footerImageUrl, assignments, submissions, onAddSubmission, lessonRatings, onAddLessonRating, onRateLesson, onAddFeedback, feedbackSubmissions, studentAbsenceRequests, onSubmitStudentAbsenceRequest, buildings, finalTimetableUrl, activeSemester, taAssignments, userTasks, onAddTask, onUpdateTask, onDeleteTask, currentInstitution } = props;
    const [activeTab, setActiveTab] = useState('dashboard');
    const [subTab, setSubTab] = useState<'weekly' | 'exams' | 'enrollment' | 'requests'>('weekly');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
    const [now, setNow] = useState(new Date());
    const [ratingLesson, setRatingLesson] = useState<TimetableEntry | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 5000);
        return () => clearInterval(timer);
    }, []);

    const { course, level, availableSubjects } = useMemo(() => {
        const studentCourse = courses.find(c => c.id === user.courseId);
        if (!studentCourse) return { course: null, level: null, availableSubjects: [] };
        const studentLevel = studentCourse.levels.find(l => l.id === user.courseLevelId);
        if (!studentLevel) return { course: studentCourse, level: null, availableSubjects: [] };
        const subjectsForLevel = subjects.filter(s => studentLevel.subjectIds.includes(s.id));
        return { course: studentCourse, level: studentLevel, availableSubjects: subjectsForLevel };
    }, [user, courses, subjects]);

    const studentTimetable = useMemo(() => {
        const enrolledIds = new Set(user.enrolledSubjectIds || []);
        return generatedTimetable.filter(entry => enrolledIds.has(entry.subjectId));
    }, [user.enrolledSubjectIds, generatedTimetable]);

    const studentExamTimetable = useMemo(() => {
        const enrolledIds = new Set(user.enrolledSubjectIds || []);
        return examTimetable.filter(entry => enrolledIds.has(entry.subjectId));
    }, [user.enrolledSubjectIds, examTimetable]);

    const handleSubjectSelect = (subjectId: string) => {
        setSelectedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subjectId)) newSet.delete(subjectId);
            else newSet.add(subjectId);
            return newSet;
        });
    };

    const selectedSubjectsForRequest = useMemo(() => subjects.filter(s => selectedSubjectIds.has(s.id)), [subjects, selectedSubjectIds]);
    const requestedSubjectIds = new Set(enrollmentRequests.map(r => r.subjectId));

    const handleDownloadPdf = async () => {
        if (!course || !level || studentTimetable.length === 0) return;
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateStudentTimetablePdf(
                user,
                studentTimetable,
                getSubjectById,
                getLecturerById,
                getRoomById,
                letterheadConfig,
                footerImageUrl,
                course,
                level,
                timetableSettings
            );
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `My_Timetable_${user.name.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Could not generate the PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePrint = async () => {
        if (!course || !level || studentTimetable.length === 0) return;
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateStudentTimetablePdf(
                user,
                studentTimetable,
                getSubjectById,
                getLecturerById,
                getRoomById,
                letterheadConfig,
                footerImageUrl,
                course,
                level,
                timetableSettings
            );
            const pdfWindow = window.open("");
            if (pdfWindow) {
                pdfWindow.document.write(`<html><head><title>Print Timetable</title></head><body style="margin: 0; padding: 0;"><iframe width='100%' height='100%' style="border: none;" src='${pdfUrl}'></iframe></body></html>`);
                pdfWindow.document.close();
                setTimeout(() => {
                    pdfWindow.print();
                }, 500);
            }
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("An error occurred while preparing for print.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const renderCellActions = (entry: TimetableEntry) => {
        const hasCheckedIn = studentCheckIns[`${user.id}-${entry.id}`];
        const hasRated = lessonRatings.some(r => r.timetableEntryId === entry.id);
        const lessonEnd = new Date();
        const [hours, minutes] = entry.endTime.split(':').map(Number);
        lessonEnd.setHours(hours, minutes, 0, 0);
        const isPast = now > lessonEnd;

        if (isPast && !hasRated) {
            return (
                <button onClick={() => onRateLesson(entry)} className="w-full text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md px-2 py-1 mt-1">
                    Rate Lesson
                </button>
            );
        }

        if (hasCheckedIn) {
            return (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold rounded-md text-green-800 bg-green-100 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 mt-1">
                    <CheckIcon className="w-4 h-4" />
                    Checked In
                </div>
            );
        }
        return null;
    };

    const tabs = ['dashboard', 'my_timetable', 'assignments', 'feedback', 'absences', 'nearby_classes'];

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700 no-print">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'my_timetable') setSubTab('weekly'); }} className={`${activeTab === tab ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}>
                            {tab.replace(/_/g, ' ')}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'my_timetable' && (
                <div className="space-y-6">
                    {/* Sub-Tabs */}
                    <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit no-print">
                        {[
                            { id: 'weekly', label: 'Weekly Schedule' },
                            { id: 'exams', label: 'Exam Timetable' },
                            { id: 'enrollment', label: 'Enrollment' },
                            { id: 'requests', label: 'My Requests' }
                        ].map(st => (
                            <button
                                key={st.id}
                                onClick={() => setSubTab(st.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${subTab === st.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>

                    {subTab === 'weekly' && (
                        <div className="animate-fade-in">
                            <div className="flex flex-wrap gap-4 justify-between items-center mb-4 no-print">
                                <h3 className="text-xl font-semibold">My Weekly Timetable</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={handlePrint} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"><PrinterIcon className="w-5 h-5" /> Print</button>
                                    <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><DocumentArrowDownIcon className="w-5 h-5" /> PDF</button>
                                </div>
                            </div>
                            <div className="printable-area">
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg">
                                    {studentTimetable.length > 0 ? (
                                        <TimetableGrid
                                            entries={studentTimetable}
                                            subjects={subjects}
                                            courses={courses}
                                            rooms={rooms || []}
                                            getSubjectById={getSubjectById}
                                            getLecturerById={getLecturerById}
                                            getRoomById={getRoomById}
                                            timetableSettings={timetableSettings}
                                            renderCellActions={renderCellActions}
                                        />
                                    ) : (
                                        <div className="p-12 text-center">
                                            <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                                <CalendarDaysIcon className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Classes Scheduled</h3>
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                                Your timetable is currently empty. This happens if you haven't enrolled in any subjects or if the timetable hasn't been generated yet.
                                            </p>
                                            <button onClick={() => setSubTab('enrollment')} className="mt-6 btn-primary">
                                                Go to Enrollment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'exams' && (
                        <div className="animate-fade-in">
                            <ExamTimetableGrid entries={studentExamTimetable} getSubjectById={getSubjectById} getLecturerById={getLecturerById} getRoomById={getRoomById} buildings={buildings} courses={courses} title="My Exam Timetable" />
                        </div>
                    )}

                    {subTab === 'enrollment' && (
                        <div className="animate-fade-in">
                            <h3 className="text-xl font-semibold mb-4">Add/Drop Subjects</h3>
                            {activeSemester?.enrollmentDeadline && new Date() > new Date(new Date(activeSemester.enrollmentDeadline).setHours(23, 59, 59)) ? (
                                <p className="p-4 text-center bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-lg">The deadline for subject enrollment has passed.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {availableSubjects.map(subject => (
                                        <SubjectCard key={subject.id} subject={subject} onSelect={() => handleSubjectSelect(subject.id)} isSelected={selectedSubjectIds.has(subject.id)} isEnrolled={user.enrolledSubjectIds?.includes(subject.id)} isEnrollmentPending={requestedSubjectIds.has(subject.id)} actionLabel="Request" />
                                    ))}
                                </div>
                            )}
                            {selectedSubjectIds.size > 0 && <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700"><div className="max-w-7xl mx-auto flex justify-between items-center"><p className="text-slate-900 dark:text-white font-bold">{selectedSubjectIds.size} subject(s) selected</p><button onClick={() => setIsRequestModalOpen(true)} className="btn-primary">Request Enrollment</button></div></div>}
                        </div>
                    )}

                    {subTab === 'requests' && (
                        <div className="animate-fade-in">
                            <h3 className="text-xl font-semibold mb-4">My Enrollment Requests</h3>
                            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden"><ul className="divide-y divide-slate-200 dark:divide-slate-700">{enrollmentRequests.length > 0 ? enrollmentRequests.map(req => (<li key={req.id} className="px-4 py-4 sm:px-6 flex items-center justify-between"><p className="text-slate-900 dark:text-white font-medium">{getSubjectById(req.subjectId)?.name}</p><EnrollmentStatusBadge status={req.status} /></li>)) : <li className="p-6 text-center text-slate-500">You have no pending requests.</li>}</ul></div>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'assignments' && <StudentAssignmentManager user={user} assignments={assignments} submissions={submissions} getSubjectById={getSubjectById} getLecturerById={getLecturerById} onAddSubmission={onAddSubmission} />}
            {activeTab === 'feedback' && <FeedbackForm user={user} onAddFeedback={onAddFeedback} />}
            {activeTab === 'absences' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">My Absence Requests</h3>
                        <button onClick={() => setIsAbsenceModalOpen(true)} className="btn-primary">New Absence Request</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden"><ul className="divide-y divide-slate-200 dark:divide-slate-700">{studentAbsenceRequests.length > 0 ? studentAbsenceRequests.map(req => (<li key={req.id} className="px-4 py-4 sm:px-6"><div className="flex items-center justify-between"><div><p className="font-medium">{req.startDate} to {req.endDate}</p><p className="text-sm text-slate-500">{req.reason}</p></div><AbsenceStatusBadge status={req.status} /></div></li>)) : <li className="p-6 text-center text-slate-500">You have no absence requests.</li>}</ul></div>
                </div>
            )}
            {activeTab === 'nearby_classes' && <NearbyClassesView timetable={generatedTimetable} getSubjectById={getSubjectById} getLecturerById={getLecturerById} getRoomById={getRoomById} buildings={buildings} />}

            {isRequestModalOpen && <EnrollmentRequestModal subjects={selectedSubjectsForRequest} onClose={() => setIsRequestModalOpen(false)} onSubmit={(signatureUrl) => { onSubmitEnrollmentRequest(Array.from(selectedSubjectIds), signatureUrl); setIsRequestModalOpen(false); setSelectedSubjectIds(new Set()); }} />}
            {isAbsenceModalOpen && <StudentAbsenceRequestModal onClose={() => setIsAbsenceModalOpen(false)} onSubmit={(data) => { onSubmitStudentAbsenceRequest(data); setIsAbsenceModalOpen(false); }} />}
            {ratingLesson && (
                <RatingModal
                    lesson={ratingLesson}
                    subject={getSubjectById(ratingLesson.subjectId)}
                    lecturer={getLecturerById(ratingLesson.lecturerId)}
                    onClose={() => setRatingLesson(null)}
                    onSubmit={(rating, comment) => {
                        onAddLessonRating(ratingLesson.id, rating, comment);
                        setRatingLesson(null);
                    }}
                />
            )}
        </div>
    );
};
